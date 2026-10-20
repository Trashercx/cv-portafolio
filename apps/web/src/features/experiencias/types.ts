import type { Media } from '@/features/media/types'
import type { Tecnologia } from '@/features/tecnologias/types'

/** Fase 7l, UC-19: modalidad de trabajo de un puesto. */
export type ModalidadExperiencia = 'presencial' | 'remoto' | 'hibrido'

export const MODALIDADES_EXPERIENCIA: ReadonlyArray<{ valor: ModalidadExperiencia; etiqueta: string }> = [
  { valor: 'presencial', etiqueta: 'Presencial' },
  { valor: 'remoto', etiqueta: 'Remoto' },
  { valor: 'hibrido', etiqueta: 'Híbrido' },
]

/** Etiqueta legible de cada modalidad (tolera valores desconocidos devolviéndolos tal cual). */
export function etiquetaModalidad(modalidad: string): string {
  return MODALIDADES_EXPERIENCIA.find((m) => m.valor === modalidad)?.etiqueta ?? modalidad
}

/** `Experiencia` laboral tal como la devuelve `GET /admin/experiencias` (Fase 7l, UC-19). */
export type Experiencia = {
  id: string
  usuario_admin_id: string
  empresa: string
  cargo: string
  descripcion: string
  /** `YYYY-MM-DD`. */
  fecha_inicio: string
  /** `null` = puesto actual. */
  fecha_fin: string | null
  ubicacion: string | null
  modalidad: ModalidadExperiencia
  url_empresa: string | null
  logo_media_id: string | null
  logo: Media | null
  tecnologias: Tecnologia[]
  orden: number
  visible: boolean
  created_at: string
  updated_at: string
}

/**
 * Forma de una experiencia en el snapshot público (`experiencias?` de
 * `SnapshotSitio`): la admin sin ids de administración, visibilidad ni
 * timestamps, con el logo ya resuelto y ya ordenada (actuales primero, luego
 * `fecha_inicio` descendente). Opcional
 * en el snapshot porque los publicados antes de la Fase 7l no la traen.
 */
export type ExperienciaPublica = Omit<
  Experiencia,
  'usuario_admin_id' | 'logo_media_id' | 'visible' | 'created_at' | 'updated_at'
>
