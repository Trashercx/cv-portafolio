import type { Certificacion } from '@/features/certificaciones/types'
import type { Logro } from '@/features/logros/types'
import type { Media } from '@/features/media/types'
import type { Proyecto } from '@/features/proyectos/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type { Seccion } from '@/features/secciones/types'
import type { Tema } from '@/features/tema/types'

/**
 * `Perfil` tal como llega dentro del snapshot publicado (UC-12):
 * `VersionesSitioService.armarSnapshot` usa `PerfilService.obtenerConMedia`,
 * que además de las columnas propias de `Perfil` resuelve `imagen_perfil`/
 * `cv_media` a su `Media` completa — a diferencia del `Perfil` del panel
 * admin (`@/features/perfil/types`), que solo expone los `*_id`.
 */
export type PerfilPublico = {
  id: string
  usuario_admin_id: string
  nombre_completo: string
  titulo_profesional: string
  resumen_bio: string
  imagen_perfil_id: string | null
  cv_media_id: string | null
  ubicacion: string
  updated_at: string
  imagen_perfil: Media | null
  cv_media: Media | null
}

/**
 * `Certificacion` tal como llega en el snapshot
 * (`CertificacionesService.listarConLogo`): incluye `logo` (`Media`) ya
 * resuelto, a diferencia del tipo admin (`@/features/certificaciones/types`).
 */
export type CertificacionPublica = Certificacion & { logo: Media | null }

/**
 * Forma exacta de `GET /sitio` (UC-12) y de `VersionSitio.snapshot`
 * (ver `apps/api/src/modules/versiones-sitio/snapshot.types.ts`).
 */
export type SnapshotSitio = {
  perfil: PerfilPublico | null
  tema: Tema | null
  secciones: Seccion[]
  proyectos: Proyecto[]
  certificaciones: CertificacionPublica[]
  logros: Logro[]
  redes_sociales: RedSocial[]
}
