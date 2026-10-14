import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { FondoSitioService } from './fondo-sitio.service';

describe('FondoSitioService (UC-15 Configurar fondo animado del sitio)', () => {
  let service: FondoSitioService;
  let prisma: {
    fondoSitio: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      fondoSitio: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FondoSitioService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(FondoSitioService);
  });

  const dtoBase = {
    tipo: 'aurora_mesh' as const,
    configuracion: { velocidad: 'media' as const, opacidad: 0.5 },
  };

  it('crea siempre con activo: false, sin importar lo que traiga el DTO', async () => {
    prisma.fondoSitio.create.mockResolvedValue({ id: 'fondo-1' });

    await service.crear('admin-1', dtoBase);

    expect(prisma.fondoSitio.create).toHaveBeenCalledWith({
      data: {
        usuario_admin_id: 'admin-1',
        tipo: dtoBase.tipo,
        configuracion: dtoBase.configuracion,
        activo: false,
      },
    });
  });

  it('obtenerActivo() busca el fondo activo del admin', async () => {
    prisma.fondoSitio.findFirst.mockResolvedValue({
      id: 'fondo-1',
      activo: true,
    });

    const resultado = await service.obtenerActivo('admin-1');

    expect(prisma.fondoSitio.findFirst).toHaveBeenCalledWith({
      where: { usuario_admin_id: 'admin-1', activo: true },
    });
    expect(resultado).toEqual({ id: 'fondo-1', activo: true });
  });

  it('actualizar() lanza 404 si el fondo no existe', async () => {
    prisma.fondoSitio.findUnique.mockResolvedValue(null);

    await expect(
      service.actualizar('inexistente', { tipo: 'solido' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.fondoSitio.update).not.toHaveBeenCalled();
  });

  it('eliminar() lanza 404 si el fondo no existe', async () => {
    prisma.fondoSitio.findUnique.mockResolvedValue(null);

    await expect(service.eliminar('inexistente')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.fondoSitio.delete).not.toHaveBeenCalled();
  });

  describe('activar', () => {
    it('lanza NotFoundException si el fondo no existe', async () => {
      prisma.fondoSitio.findUnique.mockResolvedValue(null);

      await expect(service.activar('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('desactiva cualquier otro fondo activo del mismo admin y activa el elegido, en una sola transacción', async () => {
      prisma.fondoSitio.findUnique.mockResolvedValue({
        id: 'fondo-2',
        usuario_admin_id: 'admin-1',
        activo: false,
      });
      prisma.$transaction.mockResolvedValue([
        { count: 1 },
        { id: 'fondo-2', activo: true },
      ]);

      const resultado = await service.activar('fondo-2');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const operaciones = prisma.$transaction.mock.calls[0][0];
      expect(operaciones).toHaveLength(2);

      expect(prisma.fondoSitio.updateMany).toHaveBeenCalledWith({
        where: {
          usuario_admin_id: 'admin-1',
          activo: true,
          NOT: { id: 'fondo-2' },
        },
        data: { activo: false },
      });
      expect(prisma.fondoSitio.update).toHaveBeenCalledWith({
        where: { id: 'fondo-2' },
        data: { activo: true },
      });
      expect(resultado).toEqual({ id: 'fondo-2', activo: true });
    });

    it('no incluye al propio fondo en la desactivación masiva (evita desactivarse a sí mismo)', async () => {
      prisma.fondoSitio.findUnique.mockResolvedValue({
        id: 'fondo-9',
        usuario_admin_id: 'admin-1',
        activo: true,
      });
      prisma.$transaction.mockResolvedValue([
        { count: 0 },
        { id: 'fondo-9', activo: true },
      ]);

      await service.activar('fondo-9');

      const filtroDesactivacion = prisma.fondoSitio.updateMany.mock.calls[0][0]
        .where as { NOT: { id: string } };
      expect(filtroDesactivacion.NOT.id).toBe('fondo-9');
    });
  });
});
