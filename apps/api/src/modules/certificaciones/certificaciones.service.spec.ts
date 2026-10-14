import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificacionesService } from './certificaciones.service';

describe('CertificacionesService (UC-04 Gestionar certificaciones)', () => {
  let service: CertificacionesService;
  let prisma: {
    certificacion: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    media: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      certificacion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      media: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CertificacionesService);
  });

  it('listar() ordena por orden ascendente y, en empate, por fecha_emision descendente', async () => {
    prisma.certificacion.findMany.mockResolvedValue([]);

    await service.listar();

    expect(prisma.certificacion.findMany).toHaveBeenCalledWith({
      orderBy: [{ orden: 'asc' }, { fecha_emision: 'desc' }],
    });
  });

  it('obtener() lanza 404 si la certificación no existe', async () => {
    prisma.certificacion.findUnique.mockResolvedValue(null);

    await expect(service.obtener('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('crear() rechaza con 400 si logo_media_id referencia un Media inexistente', async () => {
    prisma.media.findUnique.mockResolvedValue(null);

    await expect(
      service.crear('admin-uuid', {
        nombre: 'AWS Certified',
        institucion: 'AWS',
        fecha_emision: '2024-01-01',
        url_verificacion: 'https://verify.example.com/1',
        logo_media_id: 'media-inexistente',
        orden: 1,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.certificacion.create).not.toHaveBeenCalled();
  });

  it('crear() guarda la certificación con usuario_admin_id cuando el logo es válido', async () => {
    prisma.media.findUnique.mockResolvedValue({ id: 'media-uuid' });
    prisma.certificacion.create.mockResolvedValue({ id: 'cert-uuid' });

    const dto = {
      nombre: 'AWS Certified',
      institucion: 'AWS',
      fecha_emision: '2024-01-01',
      url_verificacion: 'https://verify.example.com/1',
      logo_media_id: 'media-uuid',
      orden: 1,
    };

    await service.crear('admin-uuid', dto);

    expect(prisma.certificacion.create).toHaveBeenCalledWith({
      data: {
        usuario_admin_id: 'admin-uuid',
        ...dto,
        fecha_emision: new Date(dto.fecha_emision),
        fecha_expiracion: undefined,
      },
    });
  });

  describe('fecha_expiracion (Fase 7e, "No expira")', () => {
    beforeEach(() => {
      prisma.certificacion.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.certificacion.update.mockResolvedValue({ id: 'c1' });
    });

    it('actualizar con null limpia la columna', async () => {
      await service.actualizar('c1', { fecha_expiracion: null });
      expect(prisma.certificacion.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining({ fecha_expiracion: null }),
      });
    });

    it('actualizar con undefined no toca la columna', async () => {
      await service.actualizar('c1', { nombre: 'X' });
      const { data } = prisma.certificacion.update.mock.calls[0][0];
      expect(data.fecha_expiracion).toBeUndefined();
    });

    it('crear con null guarda null', async () => {
      prisma.certificacion.create.mockResolvedValue({ id: 'c1' });
      await service.crear('admin', {
        nombre: 'N',
        institucion: 'I',
        fecha_emision: '2024-01-01',
        fecha_expiracion: null,
        url_verificacion: 'https://x.example.com',
        orden: 1,
      });
      expect(prisma.certificacion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ fecha_expiracion: null }),
      });
    });
  });
});
