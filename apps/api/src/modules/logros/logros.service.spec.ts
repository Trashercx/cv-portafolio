import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { LogrosService } from './logros.service';

describe('LogrosService (UC-05 Gestionar logros y reconocimientos)', () => {
  let service: LogrosService;
  let prisma: {
    logro: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      logro: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LogrosService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(LogrosService);
  });

  it('listar() ordena por orden ascendente (criterio de aceptación de UC-05)', async () => {
    prisma.logro.findMany.mockResolvedValue([]);

    await service.listar();

    expect(prisma.logro.findMany).toHaveBeenCalledWith({
      orderBy: { orden: 'asc' },
    });
  });

  it('crear() guarda el logro con usuario_admin_id: aparece de inmediato sin desplegar código', async () => {
    const dto = {
      titulo: 'Hackathon 1er lugar',
      descripcion: 'Ganador de hackathon interno',
      fecha: '2024-05-01',
      categoria: 'Competencia',
      orden: 1,
    };
    prisma.logro.create.mockResolvedValue({ id: 'logro-uuid', ...dto });

    const resultado = await service.crear('admin-uuid', dto);

    expect(prisma.logro.create).toHaveBeenCalledWith({
      data: {
        usuario_admin_id: 'admin-uuid',
        ...dto,
        fecha: new Date(dto.fecha),
      },
    });
    expect(resultado.id).toBe('logro-uuid');
  });

  it('actualizar() lanza 404 si el logro no existe', async () => {
    prisma.logro.findUnique.mockResolvedValue(null);

    await expect(
      service.actualizar('inexistente', { titulo: 'Nuevo título' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.logro.update).not.toHaveBeenCalled();
  });
});
