import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificacionesService } from '../certificaciones/certificaciones.service';
import { FondoSitioService } from '../fondo-sitio/fondo-sitio.service';
import { InsigniasService } from '../insignias/insignias.service';
import { LogrosService } from '../logros/logros.service';
import { PerfilService } from '../perfil/perfil.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { RedesSocialesService } from '../redes-sociales/redes-sociales.service';
import { SeccionesService } from '../secciones/secciones.service';
import { SkillsService } from '../skills/skills.service';
import { TemaService } from '../tema/tema.service';
import {
  ESTADO_BORRADOR,
  ESTADO_PUBLICADO,
  SnapshotMedia,
  SnapshotSeccion,
  SnapshotSitio,
} from './snapshot.types';
import { recolectarReferenciasMedia } from '../../common/media-en-secciones';
import { INCLUDE_MEDIA_CON_VARIANTES } from '../media/media.select';

/**
 * UC-10 (Previsualizar cambios) y UC-11 (Publicar o revertir una versión).
 *
 * Decisión de arquitectura central (docs/plan-tecnico.md, Sprint 4): el sitio
 * público (UC-12) SIEMPRE lee de `VersionSitio.snapshot`, nunca de las tablas
 * de contenido en vivo. Este servicio es el único lugar que arma ese
 * snapshot, reutilizando los servicios ya existentes de cada módulo de
 * contenido (sin duplicar queries de Prisma) para que la forma del snapshot
 * quede alineada con lo que cada endpoint admin ya devuelve.
 */
@Injectable()
export class VersionesSitioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perfilService: PerfilService,
    private readonly seccionesService: SeccionesService,
    private readonly temaService: TemaService,
    private readonly proyectosService: ProyectosService,
    private readonly certificacionesService: CertificacionesService,
    private readonly logrosService: LogrosService,
    private readonly redesSocialesService: RedesSocialesService,
    private readonly skillsService: SkillsService,
    private readonly insigniasService: InsigniasService,
    private readonly fondoSitioService: FondoSitioService,
  ) {}

  /**
   * Arma la "foto" completa del sitio a partir del estado actual del
   * contenido en vivo. Reutilizada tanto por `preview()` como por
   * `publicar()` para que ambos flujos produzcan exactamente el mismo
   * snapshot a partir del mismo estado (la única diferencia entre ambos es
   * el `estado`/`publicado_en` de la fila `VersionSitio` resultante).
   *
   * Incluye las secciones no visibles también (el filtrado por `visible` lo
   * hace el consumidor del snapshot, no el armado): el panel de preview
   * puede querer mostrarlas atenuadas, y el sitio público simplemente no
   * las renderiza.
   */
  private async armarSnapshot(usuarioAdminId: string): Promise<SnapshotSitio> {
    const [
      perfil,
      tema,
      secciones,
      proyectos,
      certificaciones,
      logros,
      redes_sociales,
      skills,
      insignias,
      fondo,
    ] = await Promise.all([
      this.perfilService.obtenerConMedia(usuarioAdminId),
      this.temaService.obtenerActivo(usuarioAdminId),
      this.seccionesService.listar(),
      this.proyectosService.listarAdmin(),
      this.certificacionesService.listarConLogo(),
      this.logrosService.listar(),
      this.redesSocialesService.listar(),
      this.skillsService.listar(),
      this.insigniasService.listarVisibles(),
      this.fondoSitioService.obtenerActivo(usuarioAdminId),
    ]);

    return {
      perfil,
      tema,
      secciones: await this.resolverMediaDeSecciones(secciones),
      proyectos,
      certificaciones,
      logros,
      redes_sociales,
      skills,
      insignias,
      fondo,
    } as unknown as SnapshotSitio;
  }

  /**
   * Resuelve referencias a `Media` por id a la `Media` completa, para cada
   * sección que las tenga (mismo patrón que `perfil.imagen_perfil`/
   * `certificacion.logo`: el snapshot público nunca debe requerir que el
   * consumidor busque un id de media por su cuenta):
   *
   * - `tipo_seccion='hero'`: `configuracion.imagen_fondo_media_id` →
   *   `configuracion.imagen_fondo`.
   * - `tipo_seccion='galeria'` (Fase 4.5, UC-18): cada
   *   `configuracion.fotos[].media_id` → `fotos[].media`.
   *
   * Renombrado desde `resolverImagenesFondoHero`/`recolectarIdsImagenFondoHero`/
   * `aplicarImagenesFondoHero` en Fase 4.5: dejó de ser exclusivo de `hero`
   * al sumarse `galeria`, así que el nombre ya no reflejaba su alcance.
   *
   * RECURSIVA (Fase 3.3, UC-17): una sección `tipo_seccion='columnas'`
   * guarda sus bloques hijo en `configuracion.columna_1/columna_2/
   * columna_3` con la MISMA forma que tendrían como fila propia (ver
   * `ColumnasConfiguracionDto`), así que esta función entra en esos 3
   * arrays y aplica la misma resolución a cada hijo (incluida una
   * `galeria` anidada, tratada igual que un `hero` anidado). Hoy
   * `@EsListaDeBloques` nunca permite anidar `hero` ni `columnas`
   * (restricción de anidamiento de un solo nivel, ver
   * `es-lista-de-bloques.decorator.ts`), pero SÍ permite anidar `galeria`;
   * de todos modos esta función no depende de esa garantía en ningún caso:
   * qué se puede anidar es una decisión de producto explícita del
   * validador, no algo que este resolver deba asumir en silencio.
   *
   * Sigue siendo una sola consulta batch (`findMany` con `id: { in: [...] }`)
   * para TODA la media referenciada en todo el árbol (hero + galería, nivel
   * superior + dentro de columnas), recolectada en una sola pasada antes de
   * la única consulta a `Media` — nunca una consulta por sección/hijo/foto.
   * Un id que no corresponda a ningún `Media` existente (referencia rota) se
   * omite en silencio: `imagen_fondo`/`foto.media` simplemente no se agrega,
   * sin lanzar excepción.
   */
  private async resolverMediaDeSecciones(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    secciones: any[],
  ): Promise<SnapshotSeccion[]> {
    const idsMedia = [
      ...new Set(this.recolectarIdsMediaDeSecciones(secciones)),
    ];

    const mediaPorId = new Map<string, SnapshotMedia>();

    if (idsMedia.length > 0) {
      const medias = await this.prisma.media.findMany({
        where: { id: { in: idsMedia } },
        include: INCLUDE_MEDIA_CON_VARIANTES,
      });

      medias.forEach((media) =>
        mediaPorId.set(media.id, media as unknown as SnapshotMedia),
      );
    }

    return this.aplicarMediaDeSecciones(secciones, mediaPorId);
  }

  /**
   * Recorrido recursivo de recolección (sin consultar `Media` todavía): junta
   * todos los `imagen_fondo_media_id` de secciones `hero` y todos los
   * `fotos[].media_id` de secciones `galeria` (Fase 4.5, UC-18), tanto de
   * nivel superior como dentro de `configuracion.columna_1/2/3` de secciones
   * `columnas` (a cualquier profundidad, aunque hoy el validador solo permite
   * un nivel).
   */
  private recolectarIdsMediaDeSecciones(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    secciones: any[],
  ): string[] {
    // Fase 7d: el recorrido vive en `common/media-en-secciones.ts`, compartido
    // con `MediaUsosService` (usos por archivo, UC-09).
    return recolectarReferenciasMedia(secciones).map((r) => r.mediaId);
  }

  /**
   * Recorrido recursivo de aplicación: reconstruye cada sección `hero` con
   * `imagen_fondo` agregada (si corresponde), cada sección `galeria` con
   * `fotos[].media` agregada a cada foto que resolvió (Fase 4.5, UC-18), y
   * cada sección `columnas` con sus 3 arrays reconstruidos recursivamente.
   * Cualquier otro `tipo_seccion` se devuelve sin cambios.
   */
  private aplicarMediaDeSecciones(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    secciones: any[],
    mediaPorId: Map<string, SnapshotMedia>,
  ): SnapshotSeccion[] {
    return secciones.map((seccion) => {
      if (seccion.tipo_seccion === 'hero') {
        const configuracion = seccion.configuracion as Record<string, unknown>;
        const imagenFondoMediaId = configuracion?.imagen_fondo_media_id;
        const imagenFondo =
          typeof imagenFondoMediaId === 'string'
            ? mediaPorId.get(imagenFondoMediaId)
            : undefined;

        if (!imagenFondo) {
          return seccion as SnapshotSeccion;
        }

        return {
          ...seccion,
          configuracion: { ...configuracion, imagen_fondo: imagenFondo },
        } as SnapshotSeccion;
      }

      if (seccion.tipo_seccion === 'galeria') {
        const configuracion = (seccion.configuracion ?? {}) as Record<
          string,
          unknown
        >;
        const fotos = this.fotosDeSeccion(seccion).map((foto) => {
          const media =
            typeof foto?.media_id === 'string'
              ? mediaPorId.get(foto.media_id)
              : undefined;

          return media ? { ...foto, media } : foto;
        });

        return {
          ...seccion,
          configuracion: { ...configuracion, fotos },
        } as SnapshotSeccion;
      }

      if (seccion.tipo_seccion === 'columnas') {
        const configuracion = (seccion.configuracion ?? {}) as Record<
          string,
          unknown
        >;
        const [columna1, columna2, columna3] = this.columnasDeSeccion(
          seccion,
        ).map((columna) => this.aplicarMediaDeSecciones(columna, mediaPorId));

        return {
          ...seccion,
          configuracion: {
            ...configuracion,
            columna_1: columna1,
            columna_2: columna2,
            columna_3: columna3,
          },
        } as SnapshotSeccion;
      }

      return seccion as SnapshotSeccion;
    });
  }

  /**
   * `configuracion.fotos` de una sección `galeria` (Fase 4.5, UC-18),
   * siempre como array de objetos plano (si faltara o no fuera array por un
   * dato corrupto/legado, se trata como vacío en vez de lanzar).
   */
  private fotosDeSeccion(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seccion: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any[] {
    const configuracion = (seccion.configuracion ?? {}) as Record<
      string,
      unknown
    >;

    return Array.isArray(configuracion.fotos) ? configuracion.fotos : [];
  }

  /**
   * `configuracion.columna_1/columna_2/columna_3` de una sección `columnas`,
   * siempre en ese orden y siempre como array (si alguno faltara o no fuera
   * array por un dato corrupto/legado, se trata como vacío en vez de
   * lanzar).
   */
  private columnasDeSeccion(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seccion: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any[][] {
    const configuracion = (seccion.configuracion ?? {}) as Record<
      string,
      unknown
    >;

    return [
      configuracion.columna_1,
      configuracion.columna_2,
      configuracion.columna_3,
    ].map((columna) => (Array.isArray(columna) ? columna : []));
  }

  /**
   * `POST /admin/versiones/preview` (UC-10): arma el snapshot y lo guarda
   * como una fila `borrador` (para dejar rastro de qué se previsualizó),
   * pero devuelve el snapshot armado — es lo que el frontend usa para
   * renderizar la vista previa, sin volver a pedirlo.
   */
  async preview(usuarioAdminId: string) {
    const snapshot = await this.armarSnapshot(usuarioAdminId);

    return this.prisma.versionSitio.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        estado: ESTADO_BORRADOR,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * `POST /admin/versiones/publicar` (UC-11): mismo snapshot que `preview()`,
   * pero como fila `publicado` con `publicado_en=now()`. A partir de esta
   * llamada, esta fila es "la versión pública vigente" (la que devuelve
   * `GET /sitio`).
   */
  async publicar(usuarioAdminId: string) {
    const snapshot = await this.armarSnapshot(usuarioAdminId);

    return this.prisma.versionSitio.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        estado: ESTADO_PUBLICADO,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        publicado_en: new Date(),
      },
    });
  }

  /**
   * `POST /admin/versiones/:id/revertir` (UC-11): busca la versión publicada
   * inmediatamente anterior a `id` y crea una NUEVA fila copiando su
   * snapshot, con `estado='publicado'` y `publicado_en` nuevo. Nunca muta
   * una fila existente — el historial completo queda preservado.
   */
  async revertir(id: string) {
    const objetivo = await this.prisma.versionSitio.findUnique({
      where: { id },
    });

    if (!objetivo) {
      throw new NotFoundException(`No existe una versión con id ${id}`);
    }

    const anterior = await this.prisma.versionSitio.findFirst({
      where: {
        estado: ESTADO_PUBLICADO,
        id: { not: id },
        // Si `objetivo` es a su vez una versión publicada (el caso típico:
        // "revertir la publicación actual"), solo cuentan como "anteriores"
        // las publicadas ANTES de ella. Si `objetivo` es un borrador (sin
        // publicado_en), no hay una fecha de referencia clara, así que se
        // toma directamente la última publicada existente.
        ...(objetivo.publicado_en
          ? { publicado_en: { lt: objetivo.publicado_en } }
          : {}),
      },
      orderBy: { publicado_en: 'desc' },
    });

    if (!anterior) {
      throw new ConflictException(
        'No existe una versión publicada anterior a la cual revertir',
      );
    }

    return this.prisma.versionSitio.create({
      data: {
        usuario_admin_id: anterior.usuario_admin_id,
        estado: ESTADO_PUBLICADO,
        snapshot: anterior.snapshot as Prisma.InputJsonValue,
        publicado_en: new Date(),
      },
    });
  }

  /**
   * `GET /admin/versiones` (UC-11): historial completo, más reciente
   * primero. Los borradores no tienen `publicado_en` (columna nullable, ver
   * schema.prisma): se ordenan al final por fecha, y entre ellos por `id`
   * como orden natural estable (no se agregan columnas nuevas solo para
   * esto).
   */
  async listar() {
    const versiones = await this.prisma.versionSitio.findMany();

    return [...versiones].sort((a, b) => {
      const fechaA = a.publicado_en?.getTime() ?? -Infinity;
      const fechaB = b.publicado_en?.getTime() ?? -Infinity;

      if (fechaB !== fechaA) return fechaB - fechaA;
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * UC-12: "la" versión pública vigente — la fila `publicado` de
   * `publicado_en` más reciente. Reutilizada por `PublicoModule` para que
   * ningún otro lugar del código repita este criterio de selección.
   */
  async obtenerUltimaPublicada() {
    return this.prisma.versionSitio.findFirst({
      where: { estado: ESTADO_PUBLICADO },
      orderBy: { publicado_en: 'desc' },
    });
  }
}
