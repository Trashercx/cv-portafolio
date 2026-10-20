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
  /** Fase 8 (UC-34): derivados webp/avif; ausente en snapshots anteriores. */
  variantes?: { formato: string; ancho: number; alto: number; url: string }[];
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

/**
 * Una foto de `SnapshotSeccionConfiguracion.fotos` (`tipo_seccion='galeria'`,
 * Fase 4.5/UC-18) una vez resuelta para el snapshot: `media` se agrega si
 * `media_id` resolvió a un `Media` existente, se omite en silencio si es una
 * referencia rota (mismo criterio que `hero.imagen_fondo`).
 */
export interface SnapshotGaleriaFoto {
  media_id: string;
  titulo?: string;
  media?: SnapshotMedia;
}

/**
 * `Seccion.configuracion` una vez resuelta para el snapshot: sigue siendo
 * JSON dinámico (varía según `tipo_seccion`, ver
 * `secciones/dto/configuracion`), pero:
 *
 * - cuando `tipo_seccion='hero'` y trae `imagen_fondo_media_id`,
 *   `armarSnapshot()` agrega `imagen_fondo` con la `Media` completa resuelta
 *   (mismo patrón que `perfil.imagen_perfil` y `certificacion.logo`);
 * - cuando `tipo_seccion='galeria'` (Fase 4.5/UC-18), cada elemento de
 *   `fotos` gana `media` con la `Media` completa resuelta a partir de
 *   `fotos[].media_id`;
 *
 * para que el sitio público nunca tenga que resolver ids de media por su
 * cuenta.
 */
export interface SnapshotSeccionConfiguracion {
  imagen_fondo?: SnapshotMedia;
  fotos?: SnapshotGaleriaFoto[];
  [key: string]: unknown;
}

/**
 * Insignia del snapshot (Fase 7d, UC-35): solo las `visible`, ordenadas por
 * `orden`, con la imagen y sus variantes ya resueltas. Solo campos públicos (sin
 * `usuario_admin_id`, `url_origen`, `id_externo` ni timestamps). Ausente en snapshots
 * anteriores a la fase.
 */
export interface SnapshotInsignia {
  id: string;
  nombre: string;
  emisor: string;
  descripcion: string | null;
  proveedor: string;
  url_verificacion: string | null;
  fecha_emision: string | null;
  fecha_expiracion: string | null;
  habilidades: string[];
  orden: number;
  imagen: SnapshotMedia;
  [key: string]: unknown;
}

/**
 * Experiencia laboral del snapshot (Fase 7l, UC-19): solo las `visible`, con
 * los puestos actuales (`fecha_fin` null) primero y luego `fecha_inicio`
 * descendente. Logo resuelto con variantes y tecnologías aplanadas. Sin
 * `usuario_admin_id`, `logo_media_id`, `visible` ni timestamps. Las fechas
 * viajan como ISO completo (`2024-03-01T00:00:00.000Z`). Ausente en
 * snapshots anteriores a la fase.
 */
export interface ExperienciaPublica {
  id: string;
  empresa: string;
  cargo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  ubicacion: string | null;
  modalidad: 'presencial' | 'remoto' | 'hibrido';
  url_empresa: string | null;
  orden: number;
  logo: SnapshotMedia | null;
  tecnologias: { id: string; nombre: string }[];
}

/**
 * Proyecto del snapshot (UC-03; Fase 7l, UC-36). Los campos de GitHub salen del
 * servicio de proyectos: `github_repo_id` va como string (BigInt no serializa a
 * JSON); ausentes en snapshots anteriores a la fase.
 */
export interface ProyectoPublico extends SnapshotConId {
  titulo: string;
  descripcion: string;
  url_demo: string | null;
  url_repositorio: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
  destacado: boolean;
  orden: number;
  origen?: 'manual' | 'github';
  github_repo_id?: string | null;
  github_nombre_completo?: string | null;
  github_lenguaje?: string | null;
  github_estrellas?: number | null;
  github_actualizado_en?: string | null;
  sincronizar_github?: boolean;
}

export interface SnapshotSeccion extends SnapshotConId {
  tipo_seccion: string;
  configuracion: SnapshotSeccionConfiguracion;
}

export interface SnapshotSitio {
  perfil: SnapshotPerfil | null;
  tema: Record<string, unknown> | null;
  secciones: SnapshotSeccion[];
  proyectos: ProyectoPublico[];
  certificaciones: SnapshotConId[];
  logros: SnapshotConId[];
  redes_sociales: SnapshotConId[];
  skills: SnapshotConId[];
  /** Fase 7d (UC-35); ausente en snapshots anteriores. */
  insignias?: SnapshotInsignia[];
  /** Fase 7l (UC-19); ausente en snapshots anteriores. */
  experiencias?: ExperienciaPublica[];
  fondo: Record<string, unknown> | null;
}

export const ESTADO_BORRADOR = 'borrador';
export const ESTADO_PUBLICADO = 'publicado';
