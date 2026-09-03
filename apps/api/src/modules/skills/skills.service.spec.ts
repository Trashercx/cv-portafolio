import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillsService } from './skills.service';

describe('SkillsService (UC-16 Gestionar catálogo de skills)', () => {
  let service: SkillsService;
  let prisma: {
    skill: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      skill: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SkillsService);
  });

  it('listar() ordena por orden ascendente (criterio de aceptación de UC-16)', async () => {
    prisma.skill.findMany.mockResolvedValue([]);

    await service.listar();

    expect(prisma.skill.findMany).toHaveBeenCalledWith({
      orderBy: { orden: 'asc' },
    });
  });

  it('crear() guarda el skill con usuario_admin_id', async () => {
    const dto = {
      nombre: 'TypeScript',
      icono: 'typescript',
      orden: 1,
    };
    prisma.skill.findFirst.mockResolvedValue(null);
    prisma.skill.create.mockResolvedValue({ id: 'skill-uuid', ...dto });

    const resultado = await service.crear('admin-uuid', dto);

    expect(prisma.skill.findFirst).toHaveBeenCalledWith({
      where: {
        usuario_admin_id: 'admin-uuid',
        nombre: { equals: 'TypeScript', mode: 'insensitive' },
      },
    });
    expect(prisma.skill.create).toHaveBeenCalledWith({
      data: { usuario_admin_id: 'admin-uuid', ...dto },
    });
    expect(resultado.id).toBe('skill-uuid');
  });

  it('crear() lanza ConflictException si ya existe un skill con el mismo nombre (distinto casing)', async () => {
    const dto = { nombre: 'typescript', icono: 'typescript', orden: 1 };
    prisma.skill.findFirst.mockResolvedValue({
      id: 'skill-existente',
      nombre: 'TypeScript',
      usuario_admin_id: 'admin-uuid',
    });

    await expect(service.crear('admin-uuid', dto)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.skill.create).not.toHaveBeenCalled();
  });

  it('crear() aplica trim() al nombre antes de persistir', async () => {
    const dto = { nombre: '  React  ', icono: 'react', orden: 2 };
    prisma.skill.findFirst.mockResolvedValue(null);
    prisma.skill.create.mockResolvedValue({ id: 'skill-uuid' });

    await service.crear('admin-uuid', dto);

    expect(prisma.skill.create).toHaveBeenCalledWith({
      data: {
        usuario_admin_id: 'admin-uuid',
        nombre: 'React',
        icono: 'react',
        orden: 2,
      },
    });
  });

  it('crear() traduce un P2002 de condición de carrera en ConflictException', async () => {
    const dto = { nombre: 'Vue', icono: 'vue', orden: 3 };
    prisma.skill.findFirst.mockResolvedValue(null);
    prisma.skill.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.crear('admin-uuid', dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('obtener() lanza 404 si el skill no existe', async () => {
    prisma.skill.findUnique.mockResolvedValue(null);

    await expect(service.obtener('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('actualizar() lanza 404 si el skill no existe', async () => {
    prisma.skill.findUnique.mockResolvedValue(null);

    await expect(
      service.actualizar('inexistente', { nombre: 'Nuevo nombre' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.skill.update).not.toHaveBeenCalled();
  });

  it('actualizar() actualiza cuando el skill existe', async () => {
    prisma.skill.findUnique.mockResolvedValue({
      id: 'skill-1',
      nombre: 'Angular',
      usuario_admin_id: 'admin-uuid',
    });
    prisma.skill.findFirst.mockResolvedValue(null);
    prisma.skill.update.mockResolvedValue({ id: 'skill-1', nombre: 'React' });

    const resultado = await service.actualizar('skill-1', { nombre: 'React' });

    expect(prisma.skill.update).toHaveBeenCalledWith({
      where: { id: 'skill-1' },
      data: { nombre: 'React' },
    });
    expect(resultado.nombre).toBe('React');
  });

  it('actualizar() a su PROPIO nombre actual (mismo id) no lanza ConflictException', async () => {
    prisma.skill.findUnique.mockResolvedValue({
      id: 'skill-1',
      nombre: 'React',
      usuario_admin_id: 'admin-uuid',
    });
    prisma.skill.findFirst.mockResolvedValue(null);
    prisma.skill.update.mockResolvedValue({ id: 'skill-1', nombre: 'React' });

    await service.actualizar('skill-1', { nombre: 'React' });

    expect(prisma.skill.findFirst).toHaveBeenCalledWith({
      where: {
        usuario_admin_id: 'admin-uuid',
        nombre: { equals: 'React', mode: 'insensitive' },
        id: { not: 'skill-1' },
      },
    });
    expect(prisma.skill.update).toHaveBeenCalled();
  });

  it('actualizar() al nombre de OTRO skill existente lanza ConflictException', async () => {
    prisma.skill.findUnique.mockResolvedValue({
      id: 'skill-1',
      nombre: 'Angular',
      usuario_admin_id: 'admin-uuid',
    });
    prisma.skill.findFirst.mockResolvedValue({
      id: 'skill-2',
      nombre: 'React',
      usuario_admin_id: 'admin-uuid',
    });

    await expect(
      service.actualizar('skill-1', { nombre: 'React' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.skill.update).not.toHaveBeenCalled();
  });

  it('actualizar() traduce un P2002 de condición de carrera en ConflictException', async () => {
    prisma.skill.findUnique.mockResolvedValue({
      id: 'skill-1',
      nombre: 'Angular',
      usuario_admin_id: 'admin-uuid',
    });
    prisma.skill.findFirst.mockResolvedValue(null);
    prisma.skill.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.actualizar('skill-1', { nombre: 'React' }),
    ).rejects.toThrow(ConflictException);
  });

  it('eliminar() lanza 404 si el skill no existe', async () => {
    prisma.skill.findUnique.mockResolvedValue(null);

    await expect(service.eliminar('inexistente')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.skill.delete).not.toHaveBeenCalled();
  });

  it('eliminar() borra cuando el skill existe', async () => {
    prisma.skill.findUnique.mockResolvedValue({ id: 'skill-1' });
    prisma.skill.delete.mockResolvedValue({ id: 'skill-1' });

    await service.eliminar('skill-1');

    expect(prisma.skill.delete).toHaveBeenCalledWith({
      where: { id: 'skill-1' },
    });
  });
});
