import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService (UC-01 Iniciar sesión)', () => {
  let service: AuthService;
  let prisma: { usuarioAdmin: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };

  const PASSWORD_PLANO = 'contraseña-correcta';
  let passwordHash: string;

  const adminBase = () => ({
    id: 'admin-uuid',
    email: 'admin@example.com',
    password_hash: passwordHash,
    nombre: 'Admin',
    rol: 'admin',
    intentos_fallidos: 0,
    bloqueado_hasta: null as Date | null,
    created_at: new Date(),
  });

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD_PLANO, 12);
  });

  beforeEach(async () => {
    prisma = {
      usuarioAdmin: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('login exitoso resetea intentos_fallidos y bloqueado_hasta, y emite un token', async () => {
    const admin = { ...adminBase(), intentos_fallidos: 2 };
    prisma.usuarioAdmin.findUnique.mockResolvedValue(admin);
    prisma.usuarioAdmin.update.mockResolvedValue({
      ...admin,
      intentos_fallidos: 0,
    });

    const result = await service.login(admin.email, PASSWORD_PLANO);

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.admin).toEqual({ email: admin.email, nombre: admin.nombre });
    expect(prisma.usuarioAdmin.update).toHaveBeenCalledWith({
      where: { id: admin.id },
      data: { intentos_fallidos: 0, bloqueado_hasta: null },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: admin.id,
      email: admin.email,
    });
  });

  it('credenciales inválidas incrementan intentos_fallidos y lanzan 401', async () => {
    const admin = { ...adminBase(), intentos_fallidos: 0 };
    prisma.usuarioAdmin.findUnique.mockResolvedValue(admin);
    prisma.usuarioAdmin.update.mockResolvedValue(admin);

    await expect(
      service.login(admin.email, 'contraseña-incorrecta'),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.usuarioAdmin.update).toHaveBeenCalledWith({
      where: { id: admin.id },
      data: { intentos_fallidos: 1, bloqueado_hasta: null },
    });
  });

  it('el tercer intento fallido consecutivo bloquea la cuenta temporalmente', async () => {
    const admin = { ...adminBase(), intentos_fallidos: 2 };
    prisma.usuarioAdmin.findUnique.mockResolvedValue(admin);
    prisma.usuarioAdmin.update.mockResolvedValue(admin);

    await expect(
      service.login(admin.email, 'contraseña-incorrecta'),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.usuarioAdmin.update).toHaveBeenCalledTimes(1);
    const [[callArgs]] = prisma.usuarioAdmin.update.mock.calls;
    expect(callArgs.where).toEqual({ id: admin.id });
    expect(callArgs.data.intentos_fallidos).toBe(3);
    expect(callArgs.data.bloqueado_hasta).toBeInstanceOf(Date);
    expect(callArgs.data.bloqueado_hasta.getTime()).toBeGreaterThan(Date.now());
  });

  it('una cuenta bloqueada rechaza el login sin comparar la contraseña', async () => {
    const admin = {
      ...adminBase(),
      intentos_fallidos: 3,
      bloqueado_hasta: new Date(Date.now() + 10 * 60 * 1000),
    };
    prisma.usuarioAdmin.findUnique.mockResolvedValue(admin);
    const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');

    await expect(service.login(admin.email, PASSWORD_PLANO)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(bcryptCompareSpy).not.toHaveBeenCalled();
    expect(prisma.usuarioAdmin.update).not.toHaveBeenCalled();

    bcryptCompareSpy.mockRestore();
  });

  it('un email inexistente rechaza el login con el mismo mensaje genérico', async () => {
    prisma.usuarioAdmin.findUnique.mockResolvedValue(null);

    await expect(
      service.login('no-existe@example.com', PASSWORD_PLANO),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.usuarioAdmin.update).not.toHaveBeenCalled();
  });

  it('login incluye expiresAt en el resultado', async () => {
    const admin = adminBase();
    prisma.usuarioAdmin.findUnique.mockResolvedValue(admin);
    prisma.usuarioAdmin.update.mockResolvedValue(admin);

    const antes = Date.now();
    const result = await service.login(admin.email, PASSWORD_PLANO);
    const despues = Date.now();

    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(antes);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(despues);
  });

  describe('refrescar (UC-01: extensión de sesión)', () => {
    it('caso feliz: devuelve accessToken, admin y expiresAt para un admin existente', async () => {
      const admin = adminBase();
      prisma.usuarioAdmin.findUnique.mockResolvedValue(admin);

      const antes = Date.now();
      const result = await service.refrescar(admin.id);
      const despues = Date.now();

      expect(prisma.usuarioAdmin.findUnique).toHaveBeenCalledWith({
        where: { id: admin.id },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: admin.id,
        email: admin.email,
      });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.admin).toEqual({
        email: admin.email,
        nombre: admin.nombre,
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(antes);
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(despues);
      // No debe tocar los contadores de bloqueo: refrescar no es un intento de login.
      expect(prisma.usuarioAdmin.update).not.toHaveBeenCalled();
    });

    it('edge case: admin no encontrado lanza 401 sin emitir token', async () => {
      prisma.usuarioAdmin.findUnique.mockResolvedValue(null);

      await expect(service.refrescar('id-inexistente')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
