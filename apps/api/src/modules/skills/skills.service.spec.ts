import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillsService } from './skills.service';

describe('SkillsService (UC-16 Gestionar catálogo de skills)', () => {
  let service: SkillsService;
  let prisma: {
    skill: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
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
    prisma.skill.create.mockResolvedValue({ id: 'skill-uuid', ...dto });

    const resultado = await service.crear('admin-uuid', dto);

    expect(prisma.skill.create).toHaveBeenCalledWith({
      data: { usuario_admin_id: 'admin-uuid', ...dto },
    });
    expect(resultado.id).toBe('skill-uuid');
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
    prisma.skill.findUnique.mockResolvedValue({ id: 'skill-1' });
    prisma.skill.update.mockResolvedValue({ id: 'skill-1', nombre: 'React' });

    const resultado = await service.actualizar('skill-1', { nombre: 'React' });

    expect(prisma.skill.update).toHaveBeenCalledWith({
      where: { id: 'skill-1' },
      data: { nombre: 'React' },
    });
    expect(resultado.nombre).toBe('React');
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
