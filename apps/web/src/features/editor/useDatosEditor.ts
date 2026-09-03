import { useMemo } from 'react'
import type { PuckContext } from '@measured/puck'
import { useCertificaciones } from '@/features/certificaciones/useCertificaciones'
import { useFondosSitio } from '@/features/fondo-sitio/useFondosSitio'
import { useMediaList } from '@/features/media/useMediaLibrary'
import type { Media } from '@/features/media/types'
import { usePerfil } from '@/features/perfil/usePerfil'
import { useProyectos } from '@/features/proyectos/useProyectos'
import type { CertificacionPublica, PerfilPublico, SnapshotSitio } from '@/features/publico/types'
import { useLogros } from '@/features/logros/useLogros'
import { useRedesSociales } from '@/features/redes-sociales/useRedesSociales'
import { useSkills } from '@/features/skills/useSkills'
import { useTemas } from '@/features/tema/useTemas'

/**
 * Forma de los datos que necesita el lienzo del editor de Puck (Fase 3.1)
 * para renderizar los bloques reales del sitio (`bloques/`, ver
 * `puck-config.tsx`/`PuckRoot`) con el mismo aspecto que vería un visitante,
 * pero leídos en vivo desde los endpoints admin (nunca desde un snapshot
 * publicado — el lienzo siempre refleja el contenido en curso, publicado o
 * no). Estructuralmente igual a `SnapshotSitio` salvo por `secciones` (el
 * lienzo ya las tiene como `content` de Puck, no las necesita acá) y por
 * `mediaPorId`, que no existe en el snapshot público porque ahí cada
 * relación ya viene resuelta a su `Media` completa — acá en cambio hace
 * falta resolverla a mano contra los endpoints admin (ver comentario de
 * `useDatosEditor` sobre los 3 huecos de media).
 */
export type DatosEditor = Omit<SnapshotSitio, 'secciones'> & {
  mediaPorId: Map<string, Media>
}

export type MetadataEditor = { datos: DatosEditor }

const DATOS_VACIOS: DatosEditor = {
  perfil: null,
  tema: null,
  proyectos: [],
  certificaciones: [],
  logros: [],
  redes_sociales: [],
  skills: [],
  fondo: null,
  mediaPorId: new Map(),
}

/**
 * Lee `puck.metadata` tipado como `MetadataEditor`. Cada `render` de
 * `puck-config.tsx` (y `PuckRoot`) pasa por acá en vez de castear
 * `puck.metadata` a mano: si `datos` falta —p. ej. `EditorSeccionesPage`
 * dejó de pasar `metadata={{ datos }}` a `<Puck>`— falla ruidosamente en
 * desarrollo (`throw`) en vez de que cada bloque explote más abajo con un
 * "Cannot read properties of undefined" mucho menos claro. En producción se
 * degrada a `DATOS_VACIOS` (secciones vacías, sin tema) para no tumbar el
 * editor completo por un error de wiring.
 */
export function leerMetadata(puck: PuckContext): MetadataEditor {
  const metadata = puck.metadata as Partial<MetadataEditor>
  if (!metadata.datos) {
    if (import.meta.env.DEV) {
      throw new Error(
        'puck.metadata.datos no está definido. ¿Se está pasando metadata={{ datos }} a <Puck>? (ver EditorSeccionesPage/useDatosEditor)',
      )
    }
    return { datos: DATOS_VACIOS }
  }
  return metadata as MetadataEditor
}

type ResultadoUseDatosEditor = {
  datos: DatosEditor | null
  isLoading: boolean
  error: unknown
}

/**
 * Compone los 9 hooks admin necesarios para armar `DatosEditor`. Resuelve
 * los 3 huecos de media que los endpoints admin no traen resueltos (a
 * diferencia del snapshot publicado, que sí los resuelve en el backend):
 * `perfil.imagen_perfil`/`cv_media` (`GET /admin/perfil` solo trae los
 * `*_id`) y `certificacion.logo` (`GET /admin/certificaciones` solo trae
 * `logo_media_id`). El `hero.imagen_fondo` NO se resuelve acá: vive dentro
 * de la `configuracion` de cada sección de Puck (`imagen_fondo_media_id`),
 * no en ninguna de estas 9 fuentes — se resuelve en el propio `render` del
 * bloque `hero` en `puck-config.tsx`, con `datos.mediaPorId`.
 *
 * `useMediaList()` se llama **sin** filtro de tipo — misma entrada de caché
 * que usa `imagenFondoField` en `puck-config.tsx` (una sola petición
 * `GET /admin/media` compartida) — porque el logo de una certificación
 * puede ser un PDF, y `BloqueCertificaciones` necesita distinguir
 * `tipo === 'imagen'` de cualquier otro tipo para no romper un `<img>`.
 */
export function useDatosEditor(): ResultadoUseDatosEditor {
  const perfilQuery = usePerfil()
  const proyectosQuery = useProyectos()
  const certificacionesQuery = useCertificaciones()
  const logrosQuery = useLogros()
  const redesSocialesQuery = useRedesSociales()
  const skillsQuery = useSkills()
  const temasQuery = useTemas()
  const fondosQuery = useFondosSitio()
  const mediaQuery = useMediaList()

  const queries = [
    perfilQuery,
    proyectosQuery,
    certificacionesQuery,
    logrosQuery,
    redesSocialesQuery,
    skillsQuery,
    temasQuery,
    fondosQuery,
    mediaQuery,
  ]

  const isLoading = queries.some((query) => query.isLoading)
  const error = queries.find((query) => query.error)?.error ?? null

  const mediaPorId = useMemo(
    () => new Map((mediaQuery.data ?? []).map((media) => [media.id, media])),
    [mediaQuery.data],
  )

  const datos = useMemo<DatosEditor | null>(() => {
    // `perfilQuery.data` puede ser legítimamente `null` (todavía no se
    // guardó ningún perfil, UC-02) — se distingue de "aún cargando"
    // comparando contra `undefined`, el valor que trae TanStack Query antes
    // del primer éxito.
    if (
      perfilQuery.data === undefined ||
      !proyectosQuery.data ||
      !certificacionesQuery.data ||
      !logrosQuery.data ||
      !redesSocialesQuery.data ||
      !skillsQuery.data ||
      !temasQuery.data ||
      !fondosQuery.data ||
      !mediaQuery.data
    ) {
      return null
    }

    const perfilAdmin = perfilQuery.data
    const perfil: PerfilPublico | null = perfilAdmin
      ? {
          ...perfilAdmin,
          imagen_perfil: perfilAdmin.imagen_perfil_id
            ? (mediaPorId.get(perfilAdmin.imagen_perfil_id) ?? null)
            : null,
          cv_media: perfilAdmin.cv_media_id
            ? (mediaPorId.get(perfilAdmin.cv_media_id) ?? null)
            : null,
        }
      : null

    const certificaciones: CertificacionPublica[] = certificacionesQuery.data.map(
      (certificacion) => ({
        ...certificacion,
        logo: certificacion.logo_media_id
          ? (mediaPorId.get(certificacion.logo_media_id) ?? null)
          : null,
      }),
    )

    return {
      perfil,
      tema: temasQuery.data.find((tema) => tema.activo) ?? null,
      proyectos: proyectosQuery.data,
      certificaciones,
      logros: logrosQuery.data,
      redes_sociales: redesSocialesQuery.data,
      skills: skillsQuery.data,
      fondo: fondosQuery.data.find((fondo) => fondo.activo) ?? null,
      mediaPorId,
    }
  }, [
    perfilQuery.data,
    proyectosQuery.data,
    certificacionesQuery.data,
    logrosQuery.data,
    redesSocialesQuery.data,
    skillsQuery.data,
    temasQuery.data,
    fondosQuery.data,
    mediaQuery.data,
    mediaPorId,
  ])

  return { datos, isLoading, error }
}
