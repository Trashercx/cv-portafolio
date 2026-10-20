import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ExperienciasService } from './experiencias.service';

describe('ExperienciasService (UC-19, Fase 7l)', () => {
  let service: ExperienciasService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const fila = (extra: Record<string, unknown> = {}) => ({
    id: 'e1',
    usuario_admin_id: 'admin-1',
    empresa: 'Acme',
    cargo: 'Dev',
    descripcion: '',
    fecha_inicio: new Date('2022-01-01'),
    fecha_fin: null,
    ubicacion: null,
    modalidad: 'remoto',
    url_empresa: null,
    logo_media_id: null,
    orden: 0,
    visible: true,
    created_at: new Date(),
    updated_at: new Date(),
    logo: null,
    tecnologias: [],
    ...extra,
  });

  beforeEach(async () => {
    prisma = {
      experienciaLaboral: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { orden: 2 } }),
        create: jest.fn().mockResolvedValue({ id: 'e1' }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
      },
      tecnologia: {
        upsert: jest.fn(({ where }: { where: { nombre: string } }) =>
          Promise.resolve({ id: `t-${where.nombre}`, nombre: where.nombre }),
        ),
      },
      experienciaTecnologia: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      media: { findUnique: jest.fn() },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as unknown[]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperienciasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ExperienciasService);
  });

  it('listar() ordena por orden y aplana las tecnologías a { id, nombre }', async () => {
    prisma.experienciaLaboral.findMany.mockResolvedValue([
      fila({
        tecnologias: [
          { tecnologia: { id: 't2', nombre: 'Prisma' } },
          { tecnologia: { id: 't1', nombre: 'Nest' } },
        ],
      }),
    ]);

    const r = await service.listar();

    expect(prisma.experienciaLaboral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { orden: 'asc' } }),
    );
    expect(r[0].tecnologias).toEqual([
      { id: 't1', nombre: 'Nest' },
      { id: 't2', nombre: 'Prisma' },
    ]);
  });

  it('obtener() lanza 404 si no existe', async () => {
    prisma.experienciaLaboral.findUnique.mockResolvedValue(null);
    await expect(service.obtener('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('crear() asigna orden al final, convierte fechas y hace upsert de tecnologías por nombre', async () => {
    prisma.experienciaLaboral.findUnique.mockResolvedValue(fila());

    await service.crear('admin-1', {
      empresa: 'Acme',
      cargo: 'Dev',
      fecha_inicio: '2022-01-01',
      modalidad: 'remoto',
      tecnologias: ['Nest', 'Nest', 'Prisma'],
    });

    const { data } = prisma.experienciaLaboral.create.mock.calls[0][0];
    expect(data).toMatchObject({
      usuario_admin_id: 'admin-1',
      orden: 3,
      descripcion: '',
      fecha_fin: null,
    });
    expect(data.fecha_inicio).toEqual(new Date('2022-01-01'));
    expect(prisma.tecnologia.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.tecnologia.upsert).toHaveBeenCalledWith({
      where: { nombre: 'Nest' },
      update: {},
      create: { nombre: 'Nest' },
    });
    expect(prisma.experienciaTecnologia.createMany).toHaveBeenCalledWith({
      data: [
        { experiencia_id: 'e1', tecnologia_id: 't-Nest' },
        { experiencia_id: 'e1', tecnologia_id: 't-Prisma' },
      ],
    });
  });

  it('crear() lanza 400 si fecha_fin es anterior a fecha_inicio', async () => {
    await expect(
      service.crear('admin-1', {
        empresa: 'A',
        cargo: 'B',
        fecha_inicio: '2022-05-01',
        fecha_fin: '2022-01-01',
        modalidad: 'remoto',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.experienciaLaboral.create).not.toHaveBeenCalled();
  });

  it('crear() lanza 400 si logo_media_id no existe', async () => {
    prisma.media.findUnique.mockResolvedValue(null);
    await expect(
      service.crear('admin-1', {
        empresa: 'A',
        cargo: 'B',
        fecha_inicio: '2022-05-01',
        modalidad: 'remoto',
        logo_media_id: '5f0c1c0e-6a5a-4a43-9d8e-0d8f6a5b4c3d',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.experienciaLaboral.create).not.toHaveBeenCalled();
  });

  it('actualizar() lanza 404 si no existe', async () => {
    prisma.experienciaLaboral.findUnique.mockResolvedValue(null);
    await expect(
      service.actualizar('x', { cargo: 'Z' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualizar() valida fecha_fin contra la fecha_inicio guardada y permite null (puesto actual)', async () => {
    prisma.experienciaLaboral.findUnique.mockResolvedValue(
      fila({ fecha_inicio: new Date('2022-06-01') }),
    );

    await expect(
      service.actualizar('e1', { fecha_fin: '2022-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.actualizar('e1', { fecha_fin: null });
    expect(prisma.experienciaLaboral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fecha_fin: null }),
      }),
    );
  });

  it('actualizar() reemplaza las tecnologías solo si vienen en el cuerpo', async () => {
    prisma.experienciaLaboral.findUnique.mockResolvedValue(fila());

    await service.actualizar('e1', { cargo: 'Lead' });
    expect(prisma.experienciaTecnologia.deleteMany).not.toHaveBeenCalled();

    await service.actualizar('e1', { tecnologias: [] });
    expect(prisma.experienciaTecnologia.deleteMany).toHaveBeenCalledWith({
      where: { experiencia_id: 'e1' },
    });
    expect(prisma.experienciaTecnologia.createMany).not.toHaveBeenCalled();
  });

  it('eliminar() lanza 404 si no existe y borra si existe', async () => {
    prisma.experienciaLaboral.findUnique.mockResolvedValueOnce(null);
    await expect(service.eliminar('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.experienciaLaboral.findUnique.mockResolvedValueOnce(fila());
    await service.eliminar('e1');
    expect(prisma.experienciaLaboral.delete).toHaveBeenCalledWith({
      where: { id: 'e1' },
    });
  });

  it('reordenar() actualiza todos los órdenes en una transacción', async () => {
    await service.reordenar([
      { id: 'a', orden: 1 },
      { id: 'b', orden: 0 },
    ]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.experienciaLaboral.update).toHaveBeenCalledTimes(2);
    expect(prisma.experienciaLaboral.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { orden: 1 },
    });
  });

  it('listarPublicas() filtra visibles, pone los actuales primero y luego fecha_inicio desc, sin campos internos', async () => {
    prisma.experienciaLaboral.findMany.mockResolvedValue([
      fila({
        id: 'vieja',
        fecha_inicio: new Date('2015-01-01'),
        fecha_fin: new Date('2016-01-01'),
      }),
      fila({
        id: 'reciente',
        fecha_inicio: new Date('2020-01-01'),
        fecha_fin: new Date('2021-01-01'),
      }),
      fila({ id: 'actual', fecha_inicio: new Date('2018-01-01') }),
    ]);

    const r = await service.listarPublicas();

    expect(prisma.experienciaLaboral.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visible: true } }),
    );
    expect(r.map((e) => e.id)).toEqual(['actual', 'reciente', 'vieja']);
    for (const campo of [
      'usuario_admin_id',
      'logo_media_id',
      'visible',
      'created_at',
      'updated_at',
    ]) {
      expect(r[0]).not.toHaveProperty(campo);
    }
  });
});
