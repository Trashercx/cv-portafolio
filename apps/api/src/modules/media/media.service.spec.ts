import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { sharp } from './sharp';
import { MediaService } from './media.service';
import { INCLUDE_MEDIA_CON_VARIANTES } from './media.select';
import { VariantesImagenService } from './variantes-imagen.service';
import { MEDIA_STORAGE_SERVICE } from './storage/media-storage.interface';

const pngReal = () =>
  sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();

describe('MediaService (UC-02/03/04 + biblioteca UC-09)', () => {
  let service: MediaService;
  let prisma: {
    media: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    proyectoImagen: { findFirst: jest.Mock };
    certificacion: { findFirst: jest.Mock };
    perfil: { findFirst: jest.Mock };
  };
  let storage: {
    upload: jest.Mock;
    subirDerivado: jest.Mock;
    descargar: jest.Mock;
    eliminar: jest.Mock;
  };
  let variantes: {
    generar: jest.Mock;
    eliminarDe: jest.Mock;
    esRasterizable: jest.Mock;
  };

  const buildFile = (overrides: Partial<Express.Multer.File> = {}) =>
    ({
      originalname: 'foto.png',
      mimetype: 'image/png',
      buffer: Buffer.from('contenido'),
      size: 9,
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(async () => {
    prisma = {
      media: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      proyectoImagen: { findFirst: jest.fn() },
      certificacion: { findFirst: jest.fn() },
      perfil: { findFirst: jest.fn() },
    };
    variantes = {
      generar: jest.fn().mockResolvedValue({ generadas: 0, omitida: false }),
      eliminarDe: jest.fn().mockResolvedValue(undefined),
      esRasterizable: jest.fn().mockReturnValue(true),
    };
    prisma.media.findUnique.mockResolvedValue({ id: 'media-uuid' });
    storage = {
      subirDerivado: jest.fn(),
      descargar: jest.fn(),
      eliminar: jest.fn(),
      upload: jest.fn().mockResolvedValue({
        url: 'https://bucket.s3.us-east-1.amazonaws.com/biblioteca/abc.png',
        key: 'biblioteca/abc.png',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: MEDIA_STORAGE_SERVICE, useValue: storage },
        { provide: VariantesImagenService, useValue: variantes },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  describe('create (POST /admin/media)', () => {
    it('sube el archivo mediante el MediaStorageService inyectado, propagando la carpeta del DTO', async () => {
      prisma.media.create.mockResolvedValue({ id: 'media-uuid' });

      await service.create(
        buildFile(),
        { alt_text: 'Foto de perfil', carpeta: 'perfil' },
        'admin-uuid',
      );

      expect(storage.upload).toHaveBeenCalledWith(expect.anything(), 'perfil');
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: {
          usuario_admin_id: 'admin-uuid',
          url: 'https://bucket.s3.us-east-1.amazonaws.com/biblioteca/abc.png',
          s3_key: 'biblioteca/abc.png',
          tipo: 'imagen',
          ancho: undefined,
          alto: undefined,
          alt_text: 'Foto de perfil',
        },
      });
    });

    it('genera variantes tras crear la fila y devuelve la media con variantes', async () => {
      prisma.media.create.mockResolvedValue({ id: 'media-uuid' });

      await service.create(buildFile(), {}, 'admin-uuid');

      expect(variantes.generar).toHaveBeenCalledWith(
        'media-uuid',
        expect.any(Buffer),
        'biblioteca/abc.png',
        'image/png',
      );
      expect(prisma.media.findUnique).toHaveBeenCalledWith({
        where: { id: 'media-uuid' },
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });
    });

    it('infiere tipo "imagen" o "pdf" del mimetype cuando el DTO no lo especifica', async () => {
      prisma.media.create.mockResolvedValue({ id: 'media-uuid' });

      await service.create(
        buildFile({ mimetype: 'application/pdf', originalname: 'cv.pdf' }),
        {},
        'admin-uuid',
      );

      expect(prisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tipo: 'pdf' }),
        }),
      );
    });

    it('respeta el tipo explícito del DTO en vez de inferirlo', async () => {
      prisma.media.create.mockResolvedValue({ id: 'media-uuid' });

      await service.create(buildFile(), { tipo: 'documento' }, 'admin-uuid');

      expect(prisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tipo: 'documento' }),
        }),
      );
    });
  });

  describe('listar (GET /admin/media, UC-09)', () => {
    it('lista sin filtro cuando no se indica tipo', async () => {
      prisma.media.findMany.mockResolvedValue([]);

      await service.listar({});

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { created_at: 'desc' },
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });
    });

    it('filtra por tipo cuando se indica en el query', async () => {
      prisma.media.findMany.mockResolvedValue([]);

      await service.listar({ tipo: 'imagen' });

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { tipo: 'imagen' },
        orderBy: { created_at: 'desc' },
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });
    });
  });

  describe('actualizar (PATCH /admin/media/:id)', () => {
    it('lanza NotFoundException si el id no existe', async () => {
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar('no-existe', { alt_text: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualiza solo alt_text', async () => {
      prisma.media.findUnique.mockResolvedValue({ id: 'media-uuid' });
      prisma.media.update.mockResolvedValue({
        id: 'media-uuid',
        alt_text: 'nuevo',
      });

      const resultado = await service.actualizar('media-uuid', {
        alt_text: 'nuevo',
      });

      expect(prisma.media.update).toHaveBeenCalledWith({
        where: { id: 'media-uuid' },
        data: { alt_text: 'nuevo' },
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });
      expect(resultado.alt_text).toBe('nuevo');
    });
  });

  describe('eliminar (DELETE /admin/media/:id, UC-09)', () => {
    beforeEach(() => {
      prisma.media.findUnique.mockResolvedValue({ id: 'media-uuid' });
    });

    it('borra el registro cuando no está referenciado en ningún lado', async () => {
      prisma.proyectoImagen.findFirst.mockResolvedValue(null);
      prisma.certificacion.findFirst.mockResolvedValue(null);
      prisma.perfil.findFirst.mockResolvedValue(null);

      await service.eliminar('media-uuid');

      expect(variantes.eliminarDe).toHaveBeenCalledWith('media-uuid');
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-uuid' },
      });
    });

    it('lanza ConflictException (409) si está referenciado en proyecto_imagen', async () => {
      prisma.proyectoImagen.findFirst.mockResolvedValue({
        proyecto_id: 'p1',
        media_id: 'media-uuid',
      });
      prisma.certificacion.findFirst.mockResolvedValue(null);
      prisma.perfil.findFirst.mockResolvedValue(null);

      await expect(service.eliminar('media-uuid')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.media.delete).not.toHaveBeenCalled();
    });

    it('lanza ConflictException (409) si es el logo de una certificación', async () => {
      prisma.proyectoImagen.findFirst.mockResolvedValue(null);
      prisma.certificacion.findFirst.mockResolvedValue({ id: 'cert1' });
      prisma.perfil.findFirst.mockResolvedValue(null);

      await expect(service.eliminar('media-uuid')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.media.delete).not.toHaveBeenCalled();
    });

    it('lanza ConflictException (409) si es la imagen o el CV de un perfil', async () => {
      prisma.proyectoImagen.findFirst.mockResolvedValue(null);
      prisma.certificacion.findFirst.mockResolvedValue(null);
      prisma.perfil.findFirst.mockResolvedValue({ id: 'perfil1' });

      await expect(service.eliminar('media-uuid')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.media.delete).not.toHaveBeenCalled();
    });
  });

  describe('reemplazar (PATCH /admin/media/:id/reemplazar, UC-09)', () => {
    it('sube el nuevo archivo y actualiza la misma fila (mismo id)', async () => {
      prisma.media.findUnique.mockResolvedValue({ id: 'media-uuid' });
      storage.upload.mockResolvedValue({
        url: 'https://bucket.s3.us-east-1.amazonaws.com/biblioteca/nuevo.png',
        key: 'biblioteca/nuevo.png',
        width: 100,
        height: 200,
      });
      prisma.media.update.mockResolvedValue({ id: 'media-uuid' });

      const resultado = await service.reemplazar('media-uuid', buildFile());

      expect(prisma.media.update).toHaveBeenCalledWith({
        where: { id: 'media-uuid' },
        data: {
          url: 'https://bucket.s3.us-east-1.amazonaws.com/biblioteca/nuevo.png',
          s3_key: 'biblioteca/nuevo.png',
          tipo: 'imagen',
          ancho: 100,
          alto: 200,
        },
      });
      expect(resultado.id).toBe('media-uuid');
      expect(variantes.eliminarDe).toHaveBeenCalledWith('media-uuid');
      expect(variantes.generar).toHaveBeenCalledWith(
        'media-uuid',
        expect.any(Buffer),
        'biblioteca/nuevo.png',
        'image/png',
      );
    });

    it('lanza NotFoundException si el id no existe', async () => {
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(
        service.reemplazar('no-existe', buildFile()),
      ).rejects.toThrow(NotFoundException);
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('regenerarVariantes / regenerarFaltantes (Fase 8, UC-34)', () => {
    it('regenerarVariantes lanza 404 si la media no existe', async () => {
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(service.regenerarVariantes('x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('omite medias que no son imagen', async () => {
      prisma.media.findUnique.mockResolvedValue({ id: 'm', tipo: 'pdf' });

      await expect(service.regenerarVariantes('m')).resolves.toEqual({
        generadas: 0,
        omitida: true,
      });
      expect(storage.descargar).not.toHaveBeenCalled();
    });

    it('omite imágenes no rasterizables (p. ej. svg)', async () => {
      prisma.media.findUnique.mockResolvedValue({
        id: 'm',
        tipo: 'imagen',
        s3_key: 'a.svg',
      });
      storage.descargar.mockResolvedValue(Buffer.from('<svg/>'));

      await expect(service.regenerarVariantes('m')).resolves.toEqual({
        generadas: 0,
        omitida: true,
      });
      expect(variantes.generar).not.toHaveBeenCalled();
    });

    it('regenerarVariantes incluye el error si generar falla', async () => {
      prisma.media.findUnique.mockResolvedValue({
        id: 'm',
        tipo: 'imagen',
        s3_key: 'a.png',
      });
      storage.descargar.mockResolvedValue(await pngReal());
      variantes.generar.mockResolvedValue({
        generadas: 0,
        omitida: false,
        error: 'S3 caído',
      });

      await expect(service.regenerarVariantes('m')).resolves.toEqual({
        generadas: 0,
        omitida: false,
        error: 'S3 caído',
      });
    });

    it('regenerarVariantes responde generadas y omitida en el caso feliz', async () => {
      prisma.media.findUnique.mockResolvedValue({
        id: 'm',
        tipo: 'imagen',
        s3_key: 'a.png',
      });
      storage.descargar.mockResolvedValue(await pngReal());
      variantes.generar.mockResolvedValue({ generadas: 4, omitida: false });

      await expect(service.regenerarVariantes('m')).resolves.toEqual({
        generadas: 4,
        omitida: false,
      });
    });

    it('regenerarFaltantes cuenta procesadas, omitidas y errores reales', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
      ]);
      const espia = jest
        .spyOn(service, 'regenerarVariantes')
        .mockResolvedValueOnce({ generadas: 4, omitida: false })
        .mockRejectedValueOnce(new Error('sin objeto'))
        .mockResolvedValueOnce({ generadas: 0, omitida: true })
        .mockResolvedValueOnce({
          generadas: 0,
          omitida: false,
          error: 'fallo al generar',
        });

      const resultado = await service.regenerarFaltantes();

      expect(prisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tipo: 'imagen', variantes: { none: {} } },
        }),
      );
      expect(resultado).toEqual({
        procesadas: 1,
        omitidas: 1,
        errores: [
          { id: 'b', motivo: 'sin objeto' },
          { id: 'd', motivo: 'fallo al generar' },
        ],
      });
      espia.mockRestore();
    });
  });
});
