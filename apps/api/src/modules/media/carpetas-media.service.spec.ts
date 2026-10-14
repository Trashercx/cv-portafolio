import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CarpetasMediaService } from './carpetas-media.service';

describe('CarpetasMediaService (Fase 7e, UC-09)', () => {
  const ADMIN = 'admin-id';
  let service: CarpetasMediaService;
  let prisma: {
    carpetaMedia: Record<string, jest.Mock>;
    media: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      carpetaMedia: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { orden: 2 } }),
        create: jest.fn(),
        update: jest.fn((args: unknown) => args),
        delete: jest.fn(),
      },
      media: { updateMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    service = new CarpetasMediaService(prisma as never);
  });

  it('listar devuelve id, nombre, orden y total', async () => {
    prisma.carpetaMedia.findMany.mockResolvedValue([
      { id: 'a', nombre: 'Fotos', orden: 0, _count: { medias: 3 } },
    ]);
    await expect(service.listar(ADMIN)).resolves.toEqual([
      { id: 'a', nombre: 'Fotos', orden: 0, total: 3 },
    ]);
  });

  it('crear asigna orden = máximo + 1', async () => {
    prisma.carpetaMedia.findFirst.mockResolvedValue(null);
    prisma.carpetaMedia.create.mockResolvedValue({
      id: 'n',
      nombre: 'Fotos',
      orden: 3,
    });
    await service.crear(ADMIN, { nombre: 'Fotos' });
    expect(prisma.carpetaMedia.create).toHaveBeenCalledWith({
      data: { usuario_admin_id: ADMIN, nombre: 'Fotos', orden: 3 },
    });
  });

  it('crear responde 409 si el nombre existe sin distinguir mayúsculas', async () => {
    prisma.carpetaMedia.findFirst.mockResolvedValue({ id: 'x' });
    await expect(service.crear(ADMIN, { nombre: 'fotos' })).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.carpetaMedia.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nombre: { equals: 'fotos', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('crear traduce P2002 del índice funcional a 409', async () => {
    prisma.carpetaMedia.findFirst.mockResolvedValue(null);
    prisma.carpetaMedia.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );
    await expect(service.crear(ADMIN, { nombre: 'Fotos' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('actualizar renombra y da 409 en colisión con otra carpeta', async () => {
    prisma.carpetaMedia.findFirst
      .mockResolvedValueOnce({ id: 'a' }) // obtener
      .mockResolvedValueOnce({ id: 'b' }); // colisión
    await expect(
      service.actualizar(ADMIN, 'a', { nombre: 'Otra' }),
    ).rejects.toThrow(ConflictException);

    prisma.carpetaMedia.findFirst
      .mockResolvedValueOnce({ id: 'a' })
      .mockResolvedValueOnce(null);
    prisma.carpetaMedia.update.mockResolvedValue({
      id: 'a',
      nombre: 'Nueva',
      orden: 0,
      _count: { medias: 1 },
    });
    await expect(
      service.actualizar(ADMIN, 'a', { nombre: 'Nueva' }),
    ).resolves.toEqual({ id: 'a', nombre: 'Nueva', orden: 0, total: 1 });
  });

  it('eliminar responde 404 si no existe y borra si existe', async () => {
    prisma.carpetaMedia.findFirst.mockResolvedValue(null);
    await expect(service.eliminar(ADMIN, 'a')).rejects.toThrow(
      NotFoundException,
    );
    prisma.carpetaMedia.findFirst.mockResolvedValue({ id: 'a' });
    await service.eliminar(ADMIN, 'a');
    expect(prisma.carpetaMedia.delete).toHaveBeenCalledWith({
      where: { id: 'a' },
    });
  });

  it('reordenar da 404 si falta alguno; si no, asigna orden por posición', async () => {
    prisma.carpetaMedia.findMany.mockResolvedValueOnce([{ id: 'a' }]);
    await expect(service.reordenar(ADMIN, ['a', 'b'])).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.carpetaMedia.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([]);
    await service.reordenar(ADMIN, ['b', 'a']);
    expect(prisma.carpetaMedia.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { orden: 0 },
    });
    expect(prisma.carpetaMedia.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { orden: 1 },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('mover a null deja los archivos sin carpeta y devuelve movidos', async () => {
    prisma.media.updateMany.mockResolvedValue({ count: 2 });
    await expect(
      service.mover(ADMIN, { ids: ['m1', 'm2'], carpeta_id: null }),
    ).resolves.toEqual({ movidos: 2 });
    expect(prisma.media.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['m1', 'm2'] }, usuario_admin_id: ADMIN },
      data: { carpeta_id: null },
    });
  });

  it('mover a una carpeta inexistente responde 404', async () => {
    prisma.carpetaMedia.findFirst.mockResolvedValue(null);
    await expect(
      service.mover(ADMIN, { ids: ['m1'], carpeta_id: 'no' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.media.updateMany).not.toHaveBeenCalled();
  });
});
