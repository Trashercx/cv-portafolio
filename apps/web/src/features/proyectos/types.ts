import type { Media } from '@/features/media/types'
import type { Tecnologia } from '@/features/tecnologias/types'

export type ProyectoTecnologia = {
  proyecto_id: string
  tecnologia_id: string
  tecnologia: Tecnologia
}

export type ProyectoImagen = {
  proyecto_id: string
  media_id: string
  orden: number
  media: Media
}

/**
 * Campos propios de `Proyecto` (UC-03). `ProyectosService.crear`/`actualizar`
 * devuelven solo esta forma (sin relaciones incluidas); solo `listarAdmin`/
 * `obtenerAdmin` (GET) agregan `tecnologias`/`imagenes` — ver
 * `INCLUDE_DETALLE` en `proyectos.service.ts`.
 */
export type ProyectoBase = {
  id: string
  usuario_admin_id: string
  titulo: string
  descripcion: string
  url_demo: string | null
  url_repositorio: string | null
  fecha_inicio: string
  fecha_fin: string | null
  estado: string
  destacado: boolean
  orden: number
  /**
   * Fase 7l (UC-36): origen y datos de GitHub. Opcionales a propósito: los
   * snapshots publicados antes de la fase no los traen; el render los tolera.
   */
  origen?: 'manual' | 'github'
  github_nombre_completo?: string | null
  github_lenguaje?: string | null
  github_estrellas?: number | null
  github_actualizado_en?: string | null
  sincronizar_github?: boolean
}

/** `Proyecto` con relaciones, tal como lo devuelven `GET /admin/proyectos` y `GET /admin/proyectos/:id`. */
export type Proyecto = ProyectoBase & {
  tecnologias: ProyectoTecnologia[]
  imagenes: ProyectoImagen[]
}
