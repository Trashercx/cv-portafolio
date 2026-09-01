/**
 * Forma del snapshot armado por `VersionesSitioService.armarSnapshot()` y
 * guardado en `VersionSitio.snapshot` (jsonb). Es la ÚNICA fuente que debe
 * leer el sitio público (UC-12): incluye todo lo necesario para renderizar
 * sin volver a tocar las tablas en vivo (Perfil, Tema, Seccion, Proyecto,
 * Certificacion, Logro, RedSocial).
 *
 * Los tipos aquí son deliberadamente laxos (no importan los tipos exactos
 * generados por Prisma): el snapshot es JSON plano una vez persistido, y lo
 * que interesa en `publico/` es la forma mínima necesaria para ubicar un
 * elemento por `id` o leer un campo puntual (p. ej. `cv_media.url`).
 */
export interface SnapshotMedia {
  id: string;
  url: string;
  s3_key: string;
  tipo: string;
  ancho: number | null;
  alto: number | null;
  alt_text: string | null;
  [key: string]: unknown;
}

export interface SnapshotPerfil {
  id: string;
  usuario_admin_id: string;
  nombre_completo: string;
  titulo_profesional: string;
  resumen_bio: string;
  ubicacion: string;
  imagen_perfil: SnapshotMedia | null;
  cv_media: SnapshotMedia | null;
  [key: string]: unknown;
}

export interface SnapshotConId {
  id: string;
  [key: string]: unknown;
}

export interface SnapshotSitio {
  perfil: SnapshotPerfil | null;
  tema: Record<string, unknown> | null;
  secciones: SnapshotConId[];
  proyectos: SnapshotConId[];
  certificaciones: SnapshotConId[];
  logros: SnapshotConId[];
  redes_sociales: SnapshotConId[];
}

export const ESTADO_BORRADOR = 'borrador';
export const ESTADO_PUBLICADO = 'publicado';
