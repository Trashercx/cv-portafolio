import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularExpiracion } from './parse-duration';

/** UC-01: número de intentos fallidos permitidos antes de bloquear la cuenta. */
const MAX_INTENTOS_FALLIDOS = 3;

/**
 * UC-01: duración del bloqueo temporal tras agotar los intentos fallidos.
 * 15 minutos es un valor razonable para un panel de un solo administrador:
 * suficiente para desalentar fuerza bruta sin dejar al admin real fuera por
 * mucho tiempo tras un error de tipeo. Ajustable si el criterio de negocio cambia.
 */
const MINUTOS_BLOQUEO = 15;

export interface LoginResult {
  accessToken: string;
  admin: {
    email: string;
    nombre: string;
  };
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const admin = await this.prisma.usuarioAdmin.findUnique({
      where: { email },
    });

    // Nunca revelamos si el email existe o no: mismo mensaje para "no existe" y
    // "contraseña incorrecta". Solo comparamos intentos/bloqueo si el registro existe.
    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (admin.bloqueado_hasta && admin.bloqueado_hasta.getTime() > Date.now()) {
      // Cuenta bloqueada: se rechaza sin siquiera comparar la contraseña.
      throw new UnauthorizedException(
        'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde.',
      );
    }

    const passwordValida = await bcrypt.compare(password, admin.password_hash);

    if (!passwordValida) {
      const intentosFallidos = admin.intentos_fallidos + 1;
      const seBloquea = intentosFallidos >= MAX_INTENTOS_FALLIDOS;

      await this.prisma.usuarioAdmin.update({
        where: { id: admin.id },
        data: {
          intentos_fallidos: intentosFallidos,
          bloqueado_hasta: seBloquea
            ? new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000)
            : null,
        },
      });

      if (seBloquea) {
        throw new UnauthorizedException(
          'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde.',
        );
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Login exitoso: se resetean los contadores de bloqueo.
    await this.prisma.usuarioAdmin.update({
      where: { id: admin.id },
      data: { intentos_fallidos: 0, bloqueado_hasta: null },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
    });

    return {
      accessToken,
      admin: { email: admin.email, nombre: admin.nombre },
      expiresAt: calcularExpiracion(),
    };
  }

  /**
   * UC-01 (extensión de sesión): emite un token nuevo para un admin ya
   * autenticado (JWT válido y no vencido, verificado por `JwtAuthGuard` antes
   * de llegar acá). No hay "gracia" para refrescar un token ya expirado: si el
   * guard lo dejó pasar es porque todavía es válido.
   */
  async refrescar(userId: string): Promise<LoginResult> {
    const admin = await this.prisma.usuarioAdmin.findUnique({
      where: { id: userId },
    });

    // No debería ocurrir con un JWT válido (el admin único no se borra en
    // caliente), pero se cubre por robustez.
    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
    });

    return {
      accessToken,
      admin: { email: admin.email, nombre: admin.nombre },
      expiresAt: calcularExpiracion(),
    };
  }

  /**
   * Octava ronda, UC-01: datos de la sesión vigente para rehidratar el panel
   * al recargar. No emite token ni toca `intentos_fallidos`; la expiración es
   * la del token actual (`exp` del JWT), no una nueva.
   */
  async sesionActual(
    userId: string,
    exp: number,
  ): Promise<Omit<LoginResult, 'accessToken'>> {
    const admin = await this.prisma.usuarioAdmin.findUnique({
      where: { id: userId },
    });
    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return {
      admin: { email: admin.email, nombre: admin.nombre },
      expiresAt: new Date(exp * 1000),
    };
  }
}
