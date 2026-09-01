import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPerfilDto } from './dto/upsert-perfil.dto';
import { PerfilService } from './perfil.service';

describe('PerfilService (UC-02 Gestionar perfil personal)', () => {
  let service: PerfilService;
  let prisma: {
    perfil: { findUnique: jest.Mock; upsert: jest.Mock };
    media: { findMany: jest.Mock };
  };

  const dto: UpsertPerfilDto = {
    nombre_completo: 'Oscar',
    titulo_profesional: 'Desarrollador',
    resumen_bio: 'Bio de prueba',
    ubicacion: 'Buenos Aires, Argentina',
  };

  beforeEach(async () => {
    prisma = {
      perfil: { findUnique: jest.fn(), upsert: jest.fn() },
      media: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PerfilService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PerfilService);
  });

  it('obtener() devuelve null cuando el perfil aún no fue configurado', async () => {
    prisma.perfil.findUnique.mockResolvedValue(null);

    const resultado = await service.obtener('admin-uuid');

    expect(resultado).toBeNull();
    expect(prisma.perfil.findUnique).toHaveBeenCalledWith({
      where: { usuario_admin_id: 'admin-uuid' },
    });
  });

  it('upsert() usa Prisma upsert sobre usuario_admin_id (nunca crea dos filas)', async () => {
    prisma.perfil.upsert.mockResolvedValue({ id: 'perfil-uuid', ...dto });

    const resultado = await service.upsert('admin-uuid', dto);

    expect(prisma.perfil.upsert).toHaveBeenCalledWith({
      where: { usuario_admin_id: 'admin-uuid' },
      create: { usuario_admin_id: 'admin-uuid', ...dto },
      update: { ...dto },
    });
    expect(resultado).toEqual({ id: 'perfil-uuid', ...dto });
  });

  it('rechaza con 400 si imagen_perfil_id o cv_media_id referencian un Media inexistente', async () => {
    prisma.media.findMany.mockResolvedValue([]);

    await expect(
      service.upsert('admin-uuid', {
        ...dto,
        imagen_perfil_id: 'media-inexistente-uuid',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.perfil.upsert).not.toHaveBeenCalled();
  });

  it('acepta imagen_perfil_id/cv_media_id cuando ambos Media existen', async () => {
    prisma.media.findMany.mockResolvedValue([
      { id: 'imagen-uuid' },
      { id: 'cv-uuid' },
    ]);
    prisma.perfil.upsert.mockResolvedValue({ id: 'perfil-uuid' });

    await service.upsert('admin-uuid', {
      ...dto,
      imagen_perfil_id: 'imagen-uuid',
      cv_media_id: 'cv-uuid',
    });

    expect(prisma.perfil.upsert).toHaveBeenCalled();
  });
});
