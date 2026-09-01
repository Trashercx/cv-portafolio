import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TecnologiasService } from './tecnologias.service';

describe('TecnologiasService (catálogo, soporte de UC-03)', () => {
  let service: TecnologiasService;
  let prisma: { tecnologia: { findMany: jest.Mock; upsert: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      tecnologia: { findMany: jest.fn(), upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TecnologiasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TecnologiasService);
  });

  it('crearOReutilizar hace upsert por nombre: no duplica el catálogo si ya existe', async () => {
    prisma.tecnologia.upsert.mockResolvedValue({
      id: 'tec-uuid',
      nombre: 'React',
    });

    const resultado = await service.crearOReutilizar({ nombre: 'React' });

    expect(prisma.tecnologia.upsert).toHaveBeenCalledWith({
      where: { nombre: 'React' },
      update: {},
      create: { nombre: 'React' },
    });
    expect(resultado.nombre).toBe('React');
  });

  it('listar devuelve el catálogo ordenado por nombre', async () => {
    prisma.tecnologia.findMany.mockResolvedValue([]);

    await service.listar();

    expect(prisma.tecnologia.findMany).toHaveBeenCalledWith({
      orderBy: { nombre: 'asc' },
    });
  });
});
