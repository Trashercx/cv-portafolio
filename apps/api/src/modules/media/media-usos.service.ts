import { Injectable } from '@nestjs/common';
import { recolectarReferenciasMedia } from '../../common/media-en-secciones';
import { PrismaService } from '../../prisma/prisma.service';

/** Dónde se usa un archivo de la biblioteca (UC-09, Fase 7d). */
export interface UsoMedia {
  tipo:
    | 'perfil'
    | 'cv'
    | 'proyecto'
    | 'certificacion'
    | 'hero'
    | 'galeria'
    | 'insignia';
  id: string;
  nombre: string;
}

export type UsosPorMedia = Record<string, UsoMedia[]>;

/** Una fuente de uso aporta pares `(mediaId, uso)` en una consulta. */
type FuenteDeUso = () => Promise<{ mediaId: string; uso: UsoMedia }[]>;

/**
 * Calcula en una sola pasada qué entidades referencian cada `Media`
 * (UC-09, Fase 7d). Lo usan `GET /admin/media/usos` y `asegurarNoEstaEnUso`.
 */
@Injectable()
export class MediaUsosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Fuentes de uso (incluye `insignia`, Fase 7d.2, UC-35). */
  private fuentes(): FuenteDeUso[] {
    return [
      () => this.usosDePerfil(),
      () => this.usosDeProyectos(),
      () => this.usosDeCertificaciones(),
      () => this.usosDeSecciones(),
      () => this.usosDeInsignias(),
    ];
  }

  async calcular(): Promise<UsosPorMedia> {
    const resultados = await Promise.all(this.fuentes().map((f) => f()));
    const usos: UsosPorMedia = {};
    for (const { mediaId, uso } of resultados.flat()) {
      const lista = (usos[mediaId] ??= []);
      if (!lista.some((u) => u.tipo === uso.tipo && u.id === uso.id)) {
        lista.push(uso);
      }
    }
    return usos;
  }

  /** Texto para mensajes: 'proyecto «X», hero «Y»'. */
  describir(usos: UsoMedia[]): string {
    return usos.map((u) => `${u.tipo} «${u.nombre}»`).join(', ');
  }

  private async usosDePerfil() {
    const perfiles = await this.prisma.perfil.findMany({
      select: {
        id: true,
        nombre_completo: true,
        imagen_perfil_id: true,
        cv_media_id: true,
      },
    });
    return perfiles.flatMap((p) => [
      ...(p.imagen_perfil_id
        ? [
            {
              mediaId: p.imagen_perfil_id,
              uso: {
                tipo: 'perfil' as const,
                id: p.id,
                nombre: p.nombre_completo,
              },
            },
          ]
        : []),
      ...(p.cv_media_id
        ? [
            {
              mediaId: p.cv_media_id,
              uso: { tipo: 'cv' as const, id: p.id, nombre: p.nombre_completo },
            },
          ]
        : []),
    ]);
  }

  private async usosDeProyectos() {
    const filas = await this.prisma.proyectoImagen.findMany({
      select: {
        media_id: true,
        proyecto: { select: { id: true, titulo: true } },
      },
    });
    return filas.map((f) => ({
      mediaId: f.media_id,
      uso: {
        tipo: 'proyecto' as const,
        id: f.proyecto.id,
        nombre: f.proyecto.titulo,
      },
    }));
  }

  private async usosDeCertificaciones() {
    const filas = await this.prisma.certificacion.findMany({
      where: { logo_media_id: { not: null } },
      select: { id: true, nombre: true, logo_media_id: true },
    });
    return filas.map((c) => ({
      mediaId: c.logo_media_id as string,
      uso: { tipo: 'certificacion' as const, id: c.id, nombre: c.nombre },
    }));
  }

  private async usosDeInsignias() {
    const filas = await this.prisma.insignia.findMany({
      select: { id: true, nombre: true, imagen_media_id: true },
    });
    return filas.map((i) => ({
      mediaId: i.imagen_media_id,
      uso: { tipo: 'insignia' as const, id: i.id, nombre: i.nombre },
    }));
  }

  /** hero, galería y los mismos bloques anidados en `columnas`. */
  private async usosDeSecciones() {
    const secciones = await this.prisma.seccion.findMany({
      where: { tipo_seccion: { in: ['hero', 'galeria', 'columnas'] } },
      select: {
        id: true,
        tipo_seccion: true,
        titulo_visible: true,
        configuracion: true,
      },
    });
    // Los bloques anidados en `columnas` no tienen fila propia: el uso se
    // atribuye a la sección de nivel superior (id real), con el nombre del
    // bloque anidado si trae `titulo_visible`.
    return secciones.flatMap((superior) =>
      recolectarReferenciasMedia([superior]).map(
        ({ mediaId, tipo, seccion }) => ({
          mediaId,
          uso: {
            tipo,
            id: superior.id,
            nombre:
              (typeof seccion.titulo_visible === 'string' &&
                seccion.titulo_visible) ||
              superior.titulo_visible ||
              (seccion.tipo_seccion ?? tipo),
          },
        }),
      ),
    );
  }
}
