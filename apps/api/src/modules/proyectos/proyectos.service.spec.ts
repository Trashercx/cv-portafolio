import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectosService } from './proyectos.service';

describe('ProyectosService (UC-03 Gestionar proyectos)', () => {
  let service: ProyectosService;
  let prisma: {
    proyecto: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    proyectoTecnologia: { upsert: jest.Mock; deleteMany: jest.Mock };
    proyectoImagen: {
      findUnique: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
      update: jest.Mock;
    };
    tecnologia: { findUnique: jest.Mock };
    media: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      proyecto: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      proyectoTecnologia: { upsert: jest.fn(), deleteMany: jest.fn() },
      proyectoImagen: {
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      tecnologia: { findUnique: jest.fn() },
      media: { findUnique: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProyectosService);
  });

  it('listarPublico respeta el orden definido (criterio de aceptación de UC-03)', async () => {
    prisma.proyecto.findMany.mockResolvedValue([]);

    await service.listarPublico();

    expect(prisma.proyecto.findMany).toHaveBeenCalledWith({
      orderBy: { orden: 'asc' },
    });
  });

  it('obtenerPublico incluye tecnologías e imágenes en el detalle', async () => {
    prisma.proyecto.findUnique.mockResolvedValue({ id: 'p1' });

    await service.obtenerPublico('p1');

    expect(prisma.proyecto.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        include: expect.objectContaining({
          tecnologias: expect.anything(),
          imagenes: expect.anything(),
        }),
      }),
    );
  });

  it('obtenerPublico lanza 404 si el proyecto no existe', async () => {
    prisma.proyecto.findUnique.mockResolvedValue(null);

    await expect(service.obtenerPublico('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('reordenar actualiza el orden de varios proyectos en una sola transacción', async () => {
    prisma.proyecto.update.mockResolvedValue({});

    await service.reordenar([
      { id: 'p1', orden: 2 },
      { id: 'p2', orden: 1 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.proyecto.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { orden: 2 },
    });
    expect(prisma.proyecto.update).toHaveBeenCalledWith({
      where: { id: 'p2' },
      data: { orden: 1 },
    });
  });

  it('agregarTecnologia hace upsert sobre la clave compuesta (idempotente)', async () => {
    prisma.proyecto.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.tecnologia.findUnique.mockResolvedValue({ id: 't1' });
    prisma.proyectoTecnologia.upsert.mockResolvedValue({});

    await service.agregarTecnologia('p1', 't1');

    expect(prisma.proyectoTecnologia.upsert).toHaveBeenCalledWith({
      where: {
        proyecto_id_tecnologia_id: { proyecto_id: 'p1', tecnologia_id: 't1' },
      },
      update: {},
      create: { proyecto_id: 'p1', tecnologia_id: 't1' },
    });
  });

  it('quitarTecnologia lanza 404 si no había asociación', async () => {
    prisma.proyectoTecnologia.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.quitarTecnologia('p1', 't1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('agregarImagen rechaza con 400 si el media_id no existe', async () => {
    prisma.proyecto.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.media.findUnique.mockResolvedValue(null);

    await expect(
      service.agregarImagen('p1', { media_id: 'no-existe', orden: 1 }),
    ).rejects.toThrow('No existe Media con id no-existe');
  });
});
