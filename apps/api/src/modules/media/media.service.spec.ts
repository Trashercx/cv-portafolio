import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { sharp } from './sharp';
import { MediaService } from './media.service';
import { INCLUDE_MEDIA_CON_VARIANTES } from './media.select';
import { MediaUsosService } from './media-usos.service';
import { VariantesImagenService } from './variantes-imagen.service';
import { MEDIA_STORAGE_SERVICE } from './storage/media-storage.interface';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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
  };
  let usos: { calcular: jest.Mock; describir: jest.Mock };
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
      buffer: PNG_1X1,
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
    };
    variantes = {
      generar: jest.fn().mockResolvedValue({ generadas: 0, omitida: false }),
      eliminarDe: jest.fn().mockResolvedValue(undefined),
      esRasterizable: jest.fn().mockReturnValue(true),
    };
    usos = {
      calcular: jest.fn().mockResolvedValue({}),
      describir: jest.fn().mockReturnValue('proyecto «P»'),
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
        { provide: MediaUsosService, useValue: usos },
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
        where: {},
        orderBy: [{ created_at: 'desc' }],
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });
    });

    it('filtra por tipo cuando se indica en el query', async () => {
      prisma.media.findMany.mockResolvedValue([]);

      await service.listar({ tipo: 'imagen' });

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { tipo: 'imagen' },
        orderBy: [{ created_at: 'desc' }],
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });
    });
  });

  describe('actualizar (PATCH /admin/media/:id)', () => {
    it('carpeta_id null deja el archivo sin carpeta', async () => {
      prisma.media.findUnique.mockResolvedValue({ id: 'media-uuid' });
      storage.upload.mockResolvedValue({
        url: 'u',
        key: 'k',
        width: 1,
        height: 1,
      });
      prisma.media.update.mockResolvedValue({ id: 'media-uuid' });
      await service.reemplazar(
        'media-uuid',
        buildFile(),
        undefined,
        null,
        'admin-id',
      );
      expect(prisma.media.update).toHaveBeenCalledWith({
        where: { id: 'media-uuid' },
        data: expect.objectContaining({ carpeta_id: null }),
      });
    });

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
      await service.eliminar('media-uuid');

      expect(variantes.eliminarDe).toHaveBeenCalledWith('media-uuid');
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-uuid' },
      });
    });

    it('lanza ConflictException (409) listando los usos si el archivo está en uso', async () => {
      usos.calcular.mockResolvedValue({
        'media-uuid': [{ tipo: 'hero', id: 's1', nombre: 'Inicio' }],
      });

      await expect(service.eliminar('media-uuid')).rejects.toThrow(
        /proyecto «P»/,
      );
      await expect(service.eliminar('media-uuid')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.media.delete).not.toHaveBeenCalled();
    });
  });

  describe('listar (búsqueda y orden, Fase 7d)', () => {
    it('por defecto ordena por reciente y no filtra', async () => {
      prisma.media.findMany.mockResolvedValue([]);
      await service.listar({});
      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ created_at: 'desc' }],
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });
    });

    it('q busca sin distinguir mayúsculas en alt_text y s3_key, junto con tipo', async () => {
      prisma.media.findMany.mockResolvedValue([]);
      await service.listar({ tipo: 'imagen', q: ' Logo ' });
      expect(prisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tipo: 'imagen',
            OR: [
              { alt_text: { contains: 'Logo', mode: 'insensitive' } },
              { s3_key: { contains: 'Logo', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('orden antiguo y nombre', async () => {
      prisma.media.findMany.mockResolvedValue([]);
      await service.listar({ orden: 'antiguo' });
      expect(prisma.media.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ orderBy: [{ created_at: 'asc' }] }),
      );
      await service.listar({ orden: 'nombre' });
      expect(prisma.media.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ alt_text: 'asc' }, { s3_key: 'asc' }],
        }),
      );
    });
  });

  describe('carpetas (Fase 7e, UC-09)', () => {
    const UUID = '11111111-1111-4111-8111-111111111111';

    it('listar filtra por carpeta_id uuid', async () => {
      prisma.media.findMany.mockResolvedValue([]);
      await service.listar({ carpeta_id: UUID });
      expect(prisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { carpeta_id: UUID } }),
      );
    });

    it('listar con carpeta_id=ninguna filtra carpeta_id IS NULL', async () => {
      prisma.media.findMany.mockResolvedValue([]);
      await service.listar({ carpeta_id: 'ninguna' });
      expect(prisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { carpeta_id: null } }),
      );
    });

    it('create guarda carpeta_id y responde 404 si la carpeta no existe', async () => {
      const carpetaMedia = { findFirst: jest.fn().mockResolvedValue(null) };
      (prisma as unknown as { carpetaMedia: unknown }).carpetaMedia =
        carpetaMedia;
      await expect(
        service.create(buildFile(), { carpeta_id: UUID }, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
      expect(storage.upload).not.toHaveBeenCalled();

      carpetaMedia.findFirst.mockResolvedValue({ id: UUID });
      expect(carpetaMedia.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: UUID, usuario_admin_id: 'admin-id' },
        }),
      );
      prisma.media.create.mockResolvedValue({ id: 'media-uuid' });
      await service.create(buildFile(), { carpeta_id: UUID }, 'admin-id');
      expect(prisma.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ carpeta_id: UUID }),
      });
    });
  });

  describe('eliminarLote (Fase 7d)', () => {
    it('elimina los libres y omite los que están en uso o no existen, sin 409', async () => {
      prisma.media.findMany.mockResolvedValue([
        { id: 'libre' },
        { id: 'usada' },
      ]);
      usos.calcular.mockResolvedValue({
        usada: [{ tipo: 'certificacion', id: 'c1', nombre: 'AWS' }],
      });

      const r = await service.eliminarLote({
        ids: ['libre', 'usada', 'fantasma'],
      });

      expect(r.eliminados).toEqual(['libre']);
      expect(r.omitidos).toEqual([
        { id: 'usada', motivo: 'en uso: proyecto «P»' },
        { id: 'fantasma', motivo: 'no existe' },
      ]);
      expect(variantes.eliminarDe).toHaveBeenCalledWith('libre');
      expect(prisma.media.delete).toHaveBeenCalledTimes(1);
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'libre' },
      });
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

      const resultado = await service.reemplazar(
        'media-uuid',
        buildFile(),
        undefined,
        undefined,
        'admin-id',
      );

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

    it('carpeta_id null deja el archivo sin carpeta', async () => {
      prisma.media.findUnique.mockResolvedValue({ id: 'media-uuid' });
      storage.upload.mockResolvedValue({
        url: 'u',
        key: 'k',
        width: 1,
        height: 1,
      });
      prisma.media.update.mockResolvedValue({ id: 'media-uuid' });
      await service.reemplazar(
        'media-uuid',
        buildFile(),
        undefined,
        null,
        'admin-id',
      );
      expect(prisma.media.update).toHaveBeenCalledWith({
        where: { id: 'media-uuid' },
        data: expect.objectContaining({ carpeta_id: null }),
      });
    });

    it('lanza NotFoundException si el id no existe', async () => {
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(
        service.reemplazar(
          'no-existe',
          buildFile(),
          undefined,
          undefined,
          'admin-id',
        ),
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
