import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificacionesService } from '../certificaciones/certificaciones.service';
import { LogrosService } from '../logros/logros.service';
import { PerfilService } from '../perfil/perfil.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { RedesSocialesService } from '../redes-sociales/redes-sociales.service';
import { SeccionesService } from '../secciones/secciones.service';
import { TemaService } from '../tema/tema.service';
import { SnapshotSitio } from './snapshot.types';
import { VersionesSitioService } from './versiones-sitio.service';

describe('VersionesSitioService (UC-10 Previsualizar, UC-11 Publicar/revertir)', () => {
  let service: VersionesSitioService;
  let prisma: {
    versionSitio: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    media: {
      findMany: jest.Mock;
    };
  };
  let perfilService: { obtenerConMedia: jest.Mock };
  let seccionesService: { listar: jest.Mock };
  let temaService: { obtenerActivo: jest.Mock };
  let proyectosService: { listarAdmin: jest.Mock };
  let certificacionesService: { listarConLogo: jest.Mock };
  let logrosService: { listar: jest.Mock };
  let redesSocialesService: { listar: jest.Mock };

  const snapshotEsperado = {
    perfil: { id: 'perfil-1' },
    tema: { id: 'tema-1' },
    secciones: [{ id: 'seccion-1' }],
    proyectos: [{ id: 'proyecto-1' }],
    certificaciones: [{ id: 'cert-1' }],
    logros: [{ id: 'logro-1' }],
    redes_sociales: [{ id: 'red-1' }],
  };

  beforeEach(async () => {
    prisma = {
      versionSitio: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      media: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    perfilService = {
      obtenerConMedia: jest.fn().mockResolvedValue(snapshotEsperado.perfil),
    };
    seccionesService = {
      listar: jest.fn().mockResolvedValue(snapshotEsperado.secciones),
    };
    temaService = {
      obtenerActivo: jest.fn().mockResolvedValue(snapshotEsperado.tema),
    };
    proyectosService = {
      listarAdmin: jest.fn().mockResolvedValue(snapshotEsperado.proyectos),
    };
    certificacionesService = {
      listarConLogo: jest
        .fn()
        .mockResolvedValue(snapshotEsperado.certificaciones),
    };
    logrosService = {
      listar: jest.fn().mockResolvedValue(snapshotEsperado.logros),
    };
    redesSocialesService = {
      listar: jest.fn().mockResolvedValue(snapshotEsperado.redes_sociales),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionesSitioService,
        { provide: PrismaService, useValue: prisma },
        { provide: PerfilService, useValue: perfilService },
        { provide: SeccionesService, useValue: seccionesService },
        { provide: TemaService, useValue: temaService },
        { provide: ProyectosService, useValue: proyectosService },
        { provide: CertificacionesService, useValue: certificacionesService },
        { provide: LogrosService, useValue: logrosService },
        { provide: RedesSocialesService, useValue: redesSocialesService },
      ],
    }).compile();

    service = module.get(VersionesSitioService);
  });

  describe('preview (UC-10)', () => {
    it('arma el snapshot reutilizando los servicios existentes y crea una fila borrador', async () => {
      prisma.versionSitio.create.mockResolvedValue({
        id: 'v1',
        estado: 'borrador',
        snapshot: snapshotEsperado,
      });

      const resultado = await service.preview('admin-1');

      expect(perfilService.obtenerConMedia).toHaveBeenCalledWith('admin-1');
      expect(temaService.obtenerActivo).toHaveBeenCalledWith('admin-1');
      expect(seccionesService.listar).toHaveBeenCalled();
      expect(proyectosService.listarAdmin).toHaveBeenCalled();
      expect(certificacionesService.listarConLogo).toHaveBeenCalled();
      expect(logrosService.listar).toHaveBeenCalled();
      expect(redesSocialesService.listar).toHaveBeenCalled();

      expect(prisma.versionSitio.create).toHaveBeenCalledWith({
        data: {
          usuario_admin_id: 'admin-1',
          estado: 'borrador',
          snapshot: snapshotEsperado,
        },
      });
      expect(resultado.snapshot).toEqual(snapshotEsperado);
    });
  });

  describe('armarSnapshot - imagen de fondo de una sección hero (UC-10/UC-11)', () => {
    const mediaResuelta = {
      id: 'media-fondo-1',
      url: 'https://cdn.example.com/media-fondo-1.jpg',
      s3_key: 'secciones/media-fondo-1.jpg',
      tipo: 'imagen',
      ancho: 1920,
      alto: 1080,
      alt_text: null,
    };

    it('resuelve imagen_fondo_media_id a la Media completa, conservando el resto de la configuración', async () => {
      const seccionHero = {
        id: 'seccion-hero-1',
        tipo_seccion: 'hero',
        configuracion: {
          titulo: 'Hola',
          subtitulo: 'Mundo',
          imagen_fondo_media_id: 'media-fondo-1',
        },
      };
      seccionesService.listar.mockResolvedValue([seccionHero]);
      prisma.media.findMany.mockResolvedValue([mediaResuelta]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['media-fondo-1'] } },
      });
      const configuracionResuelta = snapshot.secciones[0].configuracion;
      expect(configuracionResuelta.imagen_fondo).toEqual(mediaResuelta);
      expect(configuracionResuelta.titulo).toBe('Hola');
      expect(configuracionResuelta.subtitulo).toBe('Mundo');
      expect(configuracionResuelta.imagen_fondo_media_id).toBe('media-fondo-1');
    });

    it('una sección hero sin imagen_fondo_media_id no agrega imagen_fondo ni consulta Media', async () => {
      const seccionHeroSinImagen = {
        id: 'seccion-hero-2',
        tipo_seccion: 'hero',
        configuracion: { titulo: 'Hola', subtitulo: 'Mundo' },
      };
      seccionesService.listar.mockResolvedValue([seccionHeroSinImagen]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      expect(prisma.media.findMany).not.toHaveBeenCalled();
      expect(snapshot.secciones[0].configuracion.imagen_fondo).toBeUndefined();
    });

    it('una sección hero con imagen_fondo_media_id inexistente en Media se omite sin lanzar error', async () => {
      const seccionHeroRota = {
        id: 'seccion-hero-3',
        tipo_seccion: 'hero',
        configuracion: {
          titulo: 'Hola',
          subtitulo: 'Mundo',
          imagen_fondo_media_id: 'media-inexistente',
        },
      };
      seccionesService.listar.mockResolvedValue([seccionHeroRota]);
      prisma.media.findMany.mockResolvedValue([]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['media-inexistente'] } },
      });
      expect(snapshot.secciones[0].configuracion.imagen_fondo).toBeUndefined();
    });
  });

  describe('publicar (UC-11)', () => {
    it('arma el mismo snapshot que preview pero crea una fila publicado con publicado_en', async () => {
      prisma.versionSitio.create.mockResolvedValue({
        id: 'v2',
        estado: 'publicado',
        snapshot: snapshotEsperado,
        publicado_en: new Date('2026-01-01T00:00:00.000Z'),
      });

      await service.publicar('admin-1');

      expect(prisma.versionSitio.create).toHaveBeenCalledWith({
        data: {
          usuario_admin_id: 'admin-1',
          estado: 'publicado',
          snapshot: snapshotEsperado,
          publicado_en: expect.any(Date),
        },
      });
    });
  });

  describe('revertir (UC-11)', () => {
    it('lanza 404 si la versión objetivo no existe', async () => {
      prisma.versionSitio.findUnique.mockResolvedValue(null);

      await expect(service.revertir('no-existe')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.versionSitio.create).not.toHaveBeenCalled();
    });

    it('lanza 409 si no existe ninguna versión publicada anterior', async () => {
      prisma.versionSitio.findUnique.mockResolvedValue({
        id: 'v3',
        estado: 'publicado',
        publicado_en: new Date('2026-02-01T00:00:00.000Z'),
        snapshot: {},
        usuario_admin_id: 'admin-1',
      });
      prisma.versionSitio.findFirst.mockResolvedValue(null);

      await expect(service.revertir('v3')).rejects.toThrow(ConflictException);
      expect(prisma.versionSitio.create).not.toHaveBeenCalled();
    });

    it('busca la publicada anterior excluyendo la propia fila y con fecha menor a la objetivo', async () => {
      const objetivo = {
        id: 'v3',
        estado: 'publicado',
        publicado_en: new Date('2026-02-01T00:00:00.000Z'),
        snapshot: { version: 'nueva' },
        usuario_admin_id: 'admin-1',
      };
      prisma.versionSitio.findUnique.mockResolvedValue(objetivo);

      const anterior = {
        id: 'v2',
        estado: 'publicado',
        publicado_en: new Date('2026-01-01T00:00:00.000Z'),
        snapshot: { version: 'vieja' },
        usuario_admin_id: 'admin-1',
      };
      prisma.versionSitio.findFirst.mockResolvedValue(anterior);
      prisma.versionSitio.create.mockResolvedValue({
        id: 'v4',
        estado: 'publicado',
        snapshot: anterior.snapshot,
      });

      await service.revertir('v3');

      expect(prisma.versionSitio.findFirst).toHaveBeenCalledWith({
        where: {
          estado: 'publicado',
          id: { not: 'v3' },
          publicado_en: { lt: objetivo.publicado_en },
        },
        orderBy: { publicado_en: 'desc' },
      });
    });

    it('crea una NUEVA fila copiando el snapshot antiguo, sin mutar ninguna fila existente', async () => {
      const objetivo = {
        id: 'v3',
        estado: 'publicado',
        publicado_en: new Date('2026-02-01T00:00:00.000Z'),
        snapshot: { version: 'nueva' },
        usuario_admin_id: 'admin-1',
      };
      const anterior = {
        id: 'v2',
        estado: 'publicado',
        publicado_en: new Date('2026-01-01T00:00:00.000Z'),
        snapshot: { version: 'vieja' },
        usuario_admin_id: 'admin-1',
      };
      prisma.versionSitio.findUnique.mockResolvedValue(objetivo);
      prisma.versionSitio.findFirst.mockResolvedValue(anterior);
      prisma.versionSitio.create.mockResolvedValue({
        id: 'v4',
        estado: 'publicado',
        snapshot: anterior.snapshot,
      });

      const resultado = await service.revertir('v3');

      // Nunca se llama a `update`/`delete` sobre ninguna fila: solo `create`.
      expect(prisma.versionSitio.create).toHaveBeenCalledWith({
        data: {
          usuario_admin_id: anterior.usuario_admin_id,
          estado: 'publicado',
          snapshot: anterior.snapshot,
          publicado_en: expect.any(Date),
        },
      });
      // La nueva fila lleva una marca de tiempo nueva, no la vieja.
      const dataEnviada = prisma.versionSitio.create.mock.calls[0][0].data;
      expect(dataEnviada.publicado_en).not.toEqual(anterior.publicado_en);
      expect(resultado.id).toBe('v4');
    });

    it('si la fila objetivo es un borrador (sin publicado_en), toma directamente la última publicada', async () => {
      prisma.versionSitio.findUnique.mockResolvedValue({
        id: 'borrador-1',
        estado: 'borrador',
        publicado_en: null,
        snapshot: {},
        usuario_admin_id: 'admin-1',
      });
      const ultimaPublicada = {
        id: 'v1',
        estado: 'publicado',
        publicado_en: new Date('2026-01-01T00:00:00.000Z'),
        snapshot: { version: 'unica' },
        usuario_admin_id: 'admin-1',
      };
      prisma.versionSitio.findFirst.mockResolvedValue(ultimaPublicada);
      prisma.versionSitio.create.mockResolvedValue({ id: 'v2' });

      await service.revertir('borrador-1');

      expect(prisma.versionSitio.findFirst).toHaveBeenCalledWith({
        where: {
          estado: 'publicado',
          id: { not: 'borrador-1' },
        },
        orderBy: { publicado_en: 'desc' },
      });
    });
  });

  describe('listar (UC-11)', () => {
    it('ordena por publicado_en descendente, dejando los borradores (sin fecha) al final', async () => {
      const publicada2 = {
        id: 'v2',
        estado: 'publicado',
        publicado_en: new Date('2026-02-01T00:00:00.000Z'),
      };
      const publicada1 = {
        id: 'v1',
        estado: 'publicado',
        publicado_en: new Date('2026-01-01T00:00:00.000Z'),
      };
      const borrador = { id: 'v3', estado: 'borrador', publicado_en: null };

      prisma.versionSitio.findMany.mockResolvedValue([
        publicada1,
        borrador,
        publicada2,
      ]);

      const resultado = await service.listar();

      expect(resultado.map((v) => v.id)).toEqual(['v2', 'v1', 'v3']);
    });
  });

  describe('obtenerUltimaPublicada (UC-12)', () => {
    it('busca la fila publicado más reciente', async () => {
      prisma.versionSitio.findFirst.mockResolvedValue({ id: 'v-actual' });

      const resultado = await service.obtenerUltimaPublicada();

      expect(prisma.versionSitio.findFirst).toHaveBeenCalledWith({
        where: { estado: 'publicado' },
        orderBy: { publicado_en: 'desc' },
      });
      expect(resultado).toEqual({ id: 'v-actual' });
    });
  });
});
