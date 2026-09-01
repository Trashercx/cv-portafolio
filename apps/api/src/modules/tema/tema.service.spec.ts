import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TemaService } from './tema.service';

describe('TemaService (UC-08)', () => {
  let service: TemaService;
  let prisma: {
    tema: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      tema: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemaService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TemaService);
  });

  const dtoBase = {
    nombre: 'Oscuro',
    color_primario: '#111111',
    color_secundario: '#222222',
    color_fondo: '#000000',
    color_texto: '#ffffff',
    fuente_principal: 'Inter',
    modo: 'oscuro' as const,
  };

  it('crea siempre con activo: false, sin importar lo que traiga el DTO', async () => {
    prisma.tema.create.mockResolvedValue({ id: 'tema-1' });

    await service.crear('admin-1', dtoBase);

    expect(prisma.tema.create).toHaveBeenCalledWith({
      data: { usuario_admin_id: 'admin-1', ...dtoBase, activo: false },
    });
  });

  describe('activar', () => {
    it('lanza NotFoundException si el tema no existe', async () => {
      prisma.tema.findUnique.mockResolvedValue(null);

      await expect(service.activar('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('desactiva cualquier otro tema activo del mismo admin y activa el elegido, en una sola transacción', async () => {
      prisma.tema.findUnique.mockResolvedValue({
        id: 'tema-2',
        usuario_admin_id: 'admin-1',
        activo: false,
      });
      prisma.$transaction.mockResolvedValue([
        { count: 1 },
        { id: 'tema-2', activo: true },
      ]);

      const resultado = await service.activar('tema-2');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const operaciones = prisma.$transaction.mock.calls[0][0];
      expect(operaciones).toHaveLength(2);

      expect(prisma.tema.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_admin_id: 'admin-1',
          activo: true,
          NOT: { id: 'tema-2' },
        },
        data: { activo: false },
      });
      expect(prisma.tema.update).toHaveBeenCalledWith({
        where: { id: 'tema-2' },
        data: { activo: true },
      });
      expect(resultado).toEqual({ id: 'tema-2', activo: true });
    });

    it('no incluye al propio tema en la desactivación masiva (evita desactivarse a sí mismo)', async () => {
      prisma.tema.findUnique.mockResolvedValue({
        id: 'tema-9',
        usuario_admin_id: 'admin-1',
        activo: true,
      });
      prisma.$transaction.mockResolvedValue([
        { count: 0 },
        { id: 'tema-9', activo: true },
      ]);

      await service.activar('tema-9');

      const filtroDesactivacion = prisma.tema.updateMany.mock.calls[0][0]
        .where as { NOT: { id: string } };
      expect(filtroDesactivacion.NOT.id).toBe('tema-9');
    });
  });
});
