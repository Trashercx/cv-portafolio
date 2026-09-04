import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificacionesService } from '../certificaciones/certificaciones.service';
import { FondoSitioService } from '../fondo-sitio/fondo-sitio.service';
import { LogrosService } from '../logros/logros.service';
import { PerfilService } from '../perfil/perfil.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { RedesSocialesService } from '../redes-sociales/redes-sociales.service';
import { SeccionesService } from '../secciones/secciones.service';
import { SkillsService } from '../skills/skills.service';
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
  let skillsService: { listar: jest.Mock };
  let fondoSitioService: { obtenerActivo: jest.Mock };

  const snapshotEsperado = {
    perfil: { id: 'perfil-1' },
    tema: { id: 'tema-1' },
    secciones: [{ id: 'seccion-1' }],
    proyectos: [{ id: 'proyecto-1' }],
    certificaciones: [{ id: 'cert-1' }],
    logros: [{ id: 'logro-1' }],
    redes_sociales: [{ id: 'red-1' }],
    skills: [{ id: 'skill-1' }],
    fondo: { id: 'fondo-1' },
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
    skillsService = {
      listar: jest.fn().mockResolvedValue(snapshotEsperado.skills),
    };
    fondoSitioService = {
      obtenerActivo: jest.fn().mockResolvedValue(snapshotEsperado.fondo),
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
        { provide: SkillsService, useValue: skillsService },
        { provide: FondoSitioService, useValue: fondoSitioService },
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
      expect(skillsService.listar).toHaveBeenCalled();
      expect(fondoSitioService.obtenerActivo).toHaveBeenCalledWith('admin-1');

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

  describe('armarSnapshot - resolución recursiva dentro de una sección "columnas" (Fase 3.3, UC-17)', () => {
    const mediaResuelta = {
      id: 'media-fondo-columnas-1',
      url: 'https://cdn.example.com/media-fondo-columnas-1.jpg',
      s3_key: 'secciones/media-fondo-columnas-1.jpg',
      tipo: 'imagen',
      ancho: 1920,
      alto: 1080,
      alt_text: null,
    };

    it('una sección "columnas" cuyos hijos no son hero pasa sin cambios', async () => {
      const seccionColumnas = {
        id: 'seccion-columnas-1',
        tipo_seccion: 'columnas',
        configuracion: {
          distribucion: '1-1',
          alineacion_vertical: 'inicio',
          espaciado: 'normal',
          columna_1: [
            {
              tipo_seccion: 'sobre-mi',
              titulo_visible: 'Sobre mí',
              visible: true,
              configuracion: { mostrar_foto: true },
            },
          ],
          columna_2: [
            {
              tipo_seccion: 'contacto',
              titulo_visible: 'Contacto',
              visible: true,
              configuracion: { mostrar_formulario: false },
            },
          ],
          columna_3: [],
        },
      };
      seccionesService.listar.mockResolvedValue([seccionColumnas]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      expect(prisma.media.findMany).not.toHaveBeenCalled();
      expect(snapshot.secciones[0]).toEqual(seccionColumnas);
    });

    /**
     * Caso hipotético: hoy `@EsListaDeBloques()` nunca permite que un hijo
     * de una columna sea `tipo_seccion='hero'`, pero este fixture se
     * construye directamente (sin pasar por el validador) para probar que
     * la recursión de `resolverImagenesFondoHero` funciona igual que en el
     * caso de nivel superior, en vez de depender en silencio de que este
     * caso nunca ocurra.
     */
    it('una sección "columnas" con un hijo hero con imagen_fondo_media_id válida sí la resuelve', async () => {
      const seccionColumnas = {
        id: 'seccion-columnas-2',
        tipo_seccion: 'columnas',
        configuracion: {
          distribucion: '1-2',
          alineacion_vertical: 'centro',
          espaciado: 'amplio',
          columna_1: [
            {
              tipo_seccion: 'hero',
              titulo_visible: 'Hero anidado (hipotético)',
              visible: true,
              configuracion: {
                titulo: 'Hola',
                subtitulo: 'Mundo',
                imagen_fondo_media_id: 'media-fondo-columnas-1',
              },
            },
          ],
          columna_2: [],
          columna_3: [],
        },
      };
      seccionesService.listar.mockResolvedValue([seccionColumnas]);
      prisma.media.findMany.mockResolvedValue([mediaResuelta]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['media-fondo-columnas-1'] } },
      });

      const configuracionColumnas = snapshot.secciones[0]
        .configuracion as Record<string, unknown>;
      const columna1 = configuracionColumnas.columna_1 as Array<{
        configuracion: Record<string, unknown>;
      }>;
      expect(columna1[0].configuracion.imagen_fondo).toEqual(mediaResuelta);
      expect(columna1[0].configuracion.titulo).toBe('Hola');
      expect(configuracionColumnas.columna_2).toEqual([]);
      expect(configuracionColumnas.columna_3).toEqual([]);
    });

    it('recolecta ids de imagen de fondo de hero de nivel superior y de dentro de columnas en una sola consulta batch', async () => {
      const seccionHeroNivelSuperior = {
        id: 'seccion-hero-top',
        tipo_seccion: 'hero',
        configuracion: {
          titulo: 'Portada',
          subtitulo: 'Nivel superior',
          imagen_fondo_media_id: 'media-top',
        },
      };
      const seccionColumnas = {
        id: 'seccion-columnas-3',
        tipo_seccion: 'columnas',
        configuracion: {
          distribucion: '1-1-1',
          alineacion_vertical: 'fin',
          espaciado: 'compacto',
          columna_1: [
            {
              tipo_seccion: 'hero',
              titulo_visible: 'Hero anidado (hipotético)',
              visible: true,
              configuracion: {
                titulo: 'Hola',
                subtitulo: 'Mundo',
                imagen_fondo_media_id: 'media-anidada',
              },
            },
          ],
          columna_2: [],
          columna_3: [],
        },
      };
      seccionesService.listar.mockResolvedValue([
        seccionHeroNivelSuperior,
        seccionColumnas,
      ]);
      prisma.media.findMany.mockResolvedValue([]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      await service.preview('admin-1');

      expect(prisma.media.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['media-top', 'media-anidada'] } },
      });
    });
  });

  describe('armarSnapshot - fotos de una sección "galeria" (Fase 4.5, UC-18)', () => {
    const media1 = {
      id: 'media-galeria-1',
      url: 'https://cdn.example.com/media-galeria-1.jpg',
      s3_key: 'secciones/media-galeria-1.jpg',
      tipo: 'imagen',
      ancho: 1200,
      alto: 800,
      alt_text: null,
    };
    const media2 = {
      id: 'media-galeria-2',
      url: 'https://cdn.example.com/media-galeria-2.jpg',
      s3_key: 'secciones/media-galeria-2.jpg',
      tipo: 'imagen',
      ancho: 1200,
      alto: 800,
      alt_text: null,
    };

    it('resuelve fotos[].media_id a la Media completa para cada foto, conservando el título', async () => {
      const seccionGaleria = {
        id: 'seccion-galeria-1',
        tipo_seccion: 'galeria',
        configuracion: {
          disposicion: 'grid',
          columnas_grid: 3,
          fotos: [
            { media_id: 'media-galeria-1', titulo: 'Playa' },
            { media_id: 'media-galeria-2' },
          ],
        },
      };
      seccionesService.listar.mockResolvedValue([seccionGaleria]);
      prisma.media.findMany.mockResolvedValue([media1, media2]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['media-galeria-1', 'media-galeria-2'] } },
      });
      const fotos = snapshot.secciones[0].configuracion.fotos as Array<{
        media_id: string;
        titulo?: string;
        media?: unknown;
      }>;
      expect(fotos[0].media).toEqual(media1);
      expect(fotos[0].titulo).toBe('Playa');
      expect(fotos[1].media).toEqual(media2);
      expect(fotos[1].titulo).toBeUndefined();
    });

    it('una galeria con fotos=[] no consulta Media', async () => {
      const seccionGaleria = {
        id: 'seccion-galeria-2',
        tipo_seccion: 'galeria',
        configuracion: { disposicion: 'carousel', fotos: [] },
      };
      seccionesService.listar.mockResolvedValue([seccionGaleria]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      expect(prisma.media.findMany).not.toHaveBeenCalled();
      expect(snapshot.secciones[0].configuracion.fotos).toEqual([]);
    });

    it('una foto con media_id inexistente en Media se omite sin lanzar error', async () => {
      const seccionGaleria = {
        id: 'seccion-galeria-3',
        tipo_seccion: 'galeria',
        configuracion: {
          disposicion: 'carousel',
          fotos: [{ media_id: 'media-inexistente' }],
        },
      };
      seccionesService.listar.mockResolvedValue([seccionGaleria]);
      prisma.media.findMany.mockResolvedValue([]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      const resultado = await service.preview('admin-1');
      const snapshot = resultado.snapshot as unknown as SnapshotSitio;

      const fotos = snapshot.secciones[0].configuracion.fotos as Array<{
        media_id: string;
        media?: unknown;
      }>;
      expect(fotos[0].media).toBeUndefined();
      expect(fotos[0].media_id).toBe('media-inexistente');
    });

    it('resuelve una galeria anidada dentro de una columna y recolecta sus ids junto con los de hero en una sola consulta batch', async () => {
      const seccionHeroNivelSuperior = {
        id: 'seccion-hero-top-2',
        tipo_seccion: 'hero',
        configuracion: {
          titulo: 'Portada',
          subtitulo: 'Nivel superior',
          imagen_fondo_media_id: 'media-top-2',
        },
      };
      const seccionColumnas = {
        id: 'seccion-columnas-galeria-1',
        tipo_seccion: 'columnas',
        configuracion: {
          distribucion: '1-1',
          alineacion_vertical: 'centro',
          espaciado: 'normal',
          columna_1: [
            {
              tipo_seccion: 'galeria',
              titulo_visible: 'Galería anidada',
              visible: true,
              configuracion: {
                disposicion: 'grid',
                columnas_grid: 2,
                fotos: [{ media_id: 'media-galeria-anidada-1' }],
              },
            },
          ],
          columna_2: [],
          columna_3: [],
        },
      };
      seccionesService.listar.mockResolvedValue([
        seccionHeroNivelSuperior,
        seccionColumnas,
      ]);
      prisma.media.findMany.mockResolvedValue([]);
      prisma.versionSitio.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'v1', ...data }),
      );

      await service.preview('admin-1');

      expect(prisma.media.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['media-top-2', 'media-galeria-anidada-1'] },
        },
      });
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
