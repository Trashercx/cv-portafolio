import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RedesSocialesService } from './redes-sociales.service';

describe('RedesSocialesService (UC-06 Gestionar enlaces de redes)', () => {
  let service: RedesSocialesService;
  let prisma: {
    redSocial: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    plataformaRed: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      redSocial: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      plataformaRed: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedesSocialesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RedesSocialesService);
  });

  it('listar() incluye la plataforma (nombre + icono) y respeta el orden', async () => {
    prisma.redSocial.findMany.mockResolvedValue([]);

    await service.listar();

    expect(prisma.redSocial.findMany).toHaveBeenCalledWith({
      orderBy: { orden: 'asc' },
      include: { plataforma: true },
    });
  });

  it('crear() rechaza con 400 si plataforma_id no existe en el catálogo', async () => {
    prisma.plataformaRed.findUnique.mockResolvedValue(null);

    await expect(
      service.crear('admin-uuid', {
        plataforma_id: 'plataforma-inexistente',
        url: 'https://linkedin.com/in/test',
        orden: 1,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.redSocial.create).not.toHaveBeenCalled();
  });

  it('crear() guarda el enlace cuando la plataforma existe', async () => {
    prisma.plataformaRed.findUnique.mockResolvedValue({ id: 'plat-uuid' });
    prisma.redSocial.create.mockResolvedValue({ id: 'red-uuid' });

    const dto = {
      plataforma_id: 'plat-uuid',
      url: 'https://linkedin.com/in/test',
      orden: 1,
    };

    await service.crear('admin-uuid', dto);

    expect(prisma.redSocial.create).toHaveBeenCalledWith({
      data: { usuario_admin_id: 'admin-uuid', ...dto },
      include: { plataforma: true },
    });
  });

  it('obtener() lanza 404 si la red social no existe', async () => {
    prisma.redSocial.findUnique.mockResolvedValue(null);

    await expect(service.obtener('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });
});
