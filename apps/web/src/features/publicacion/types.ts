import type { SnapshotSitio } from '@/features/publico/types'

export type EstadoVersionSitio = 'borrador' | 'publicado'

/**
 * Fila `VersionSitio` (UC-10, UC-11), tal como la devuelven
 * `POST /admin/versiones/preview`, `POST /admin/versiones/publicar`,
 * `POST /admin/versiones/:id/revertir` y `GET /admin/versiones`.
 */
export type VersionSitio = {
  id: string
  usuario_admin_id: string
  estado: EstadoVersionSitio
  snapshot: SnapshotSitio
  publicado_en: string | null
}
