import type { Media } from '@/features/media/types'

/** Fase 7d, UC-35: origen de una insignia (columna `proveedor`). */
export type ProveedorInsignia =
  | 'credly'
  | 'open_badges'
  | 'generico'
  | 'manual'
  | 'skilljar'
  | 'datacamp'
  /** Fase 7i. */
  | 'claude_academy'

/** Fase 7e, UC-35: cómo se lee un proveedor (`GET /admin/insignias/proveedores`). */
export type ModoProveedorInsignia = 'automatico' | 'archivo' | 'mixto'

export type InfoProveedorInsignia = {
  clave: string
  nombre: string
  modo: ModoProveedorInsignia
  ayuda: string
}

/** Forma de `GET /admin/insignias` (Fase 7d, UC-35). `imagen` puede venir resuelta o no. */
export type Insignia = {
  id: string
  usuario_admin_id: string
  nombre: string
  emisor: string
  descripcion: string | null
  proveedor: ProveedorInsignia
  id_externo: string | null
  url_verificacion: string | null
  url_origen: string | null
  imagen_media_id: string
  fecha_emision: string | null
  fecha_expiracion: string | null
  habilidades: string[]
  orden: number
  visible: boolean
  created_at: string
  updated_at: string
  imagen?: Media | null
}

/**
 * Insignia tal como llega en el snapshot (Fase 7d, UC-35): solo las visibles, con
 * `imagen` resuelta y SIN campos internos (`usuario_admin_id`, `url_origen`,
 * `id_externo`, `visible`, timestamps): el API las omite con `select`.
 */
export type InsigniaPublica = Pick<
  Insignia,
  | 'id'
  | 'nombre'
  | 'emisor'
  | 'descripcion'
  | 'proveedor'
  | 'url_verificacion'
  | 'fecha_emision'
  | 'fecha_expiracion'
  | 'habilidades'
  | 'orden'
> & { imagen: Media }

/**
 * Respuesta de `POST /admin/insignias/importar` (vista previa sin persistir) y de
 * `importar-archivo` (que además trae `imagen_media_id` de la media ya subida).
 */
export type VistaPreviaInsignia = {
  proveedor: ProveedorInsignia
  nombre: string
  emisor: string
  descripcion: string | null
  fecha_emision: string | null
  fecha_expiracion: string | null
  habilidades: string[]
  url_verificacion: string | null
  id_externo: string | null
  url_origen: string | null
  imagen: { url: string; ancho?: number; alto?: number; formato?: string } | null
  /** Fase 7e: modo del proveedor detectado; con `archivo` el diálogo pasa a "Subir archivo". */
  modo_proveedor?: ModoProveedorInsignia
  avisos: string[]
  imagen_media_id?: string
}
