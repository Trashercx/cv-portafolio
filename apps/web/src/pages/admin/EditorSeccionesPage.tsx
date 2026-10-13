import { type Data } from '@measured/puck'
import { Info } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DialogVistaPrevia } from '@/components/publicacion/DialogVistaPrevia'
import { PanelVersiones } from '@/components/publicacion/PanelVersiones'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { puckConfig, type PuckSeccionesComponents } from '@/lib/puck-config'
import { ApiError } from '@/lib/api-client'
import {
  useActualizarConfiguracionSeccion,
  useActualizarSeccion,
  useActualizarVisibilidadSeccion,
  useCrearSeccion,
  useEliminarSeccion,
  useReordenarSecciones,
  useSecciones,
} from '@/features/secciones/useSecciones'
import {
  TIPO_SECCION_LABEL,
  type BloqueColumnaHijo,
  type ColumnasConfiguracion,
  type Seccion,
  type TipoSeccion,
  type TipoSeccionAnidable,
} from '@/features/secciones/types'
import { useDatosEditor, type MetadataEditor } from '@/features/editor/useDatosEditor'
import { LienzoPuck } from '@/features/editor/LienzoPuck'
import { usePublicarVersion, useVersiones } from '@/features/publicacion/usePublicacion'
import type { VersionSitio } from '@/features/publicacion/types'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'
import { useEditorPanelStore, type PestanaPanel } from '@/store/editor-panel-store'

type EditorData = Data<PuckSeccionesComponents>
type EditorContentItem = EditorData['content'][number]

/**
 * Subconjunto de `Seccion` que necesitamos para calcular el diff (crear /
 * actualizar / eliminar / reordenar) en `guardarCambios`. Se guarda en un
 * `ref` — nunca se lee de `seccionesQuery.data` dentro de `guardarCambios` —
 * porque las mutaciones solo invalidan la query (fire-and-forget) sin
 * esperar el refetch: si el admin guarda dos veces seguidas apenas se
 * reactiva el botón, el cache de TanStack Query todavía puede reflejar el
 * estado anterior al primer guardado. El `ref` en cambio se actualiza a mano
 * con el resultado real de cada guardado exitoso, así que siempre refleja
 * "qué hay persistido ahora mismo".
 */
type SeccionPersistida = {
  id: string
  tipo_seccion: TipoSeccion
  titulo_visible: string
  orden: number
  visible: boolean
  // Se guarda como `Record<string, unknown>` (no `ConfiguracionPorTipo[T]`)
  // porque solo se usa para comparar (`JSON.stringify`) contra la
  // `configuracion` genérica que produce `separarProps`, nunca para leer
  // campos tipados de un tipo de sección concreto.
  configuracion: Record<string, unknown>
}

/**
 * Fallback conservador para una `Seccion` `hero` guardada antes de agregar
 * `mostrar_foto_perfil`/`posicion_foto`/`estilo_foto` a `HeroConfiguracion`
 * (su `configuracion` JSONB puede no traerlos). A propósito NO se reutiliza
 * `puckConfig.components.hero.defaultProps` para rellenar este hueco: esos
 * defaults están pensados para un bloque `hero` recién arrastrado al lienzo
 * (`mostrar_foto_perfil: true`, `posicion_foto: 'centrada'`), y usarlos acá
 * mezclaría "mostrar foto" en el `content` inicial del editor para una
 * sección vieja que nunca tuvo foto configurada — el próximo `PATCH`
 * (aunque sea de otro bloque) fijaría esa foto como visible en el sitio
 * público sin que el admin lo haya elegido. Este fallback preserva en
 * cambio el comportamiento visual que la sección ya tenía: sin foto.
 */
const FALLBACK_HERO_LEGADO = {
  mostrar_foto_perfil: false,
  posicion_foto: 'ninguna',
  estilo_foto: 'con_marco',
} as const

/**
 * Convierte las `Seccion[]` del backend (ordenadas por `orden`) al `content`
 * inicial de Puck. Los campos propios de nuestro backend (`id`, `visible`,
 * `titulo_visible`) viajan como props con prefijo `_` para no mezclarse con
 * los campos reales de `configuracion` que sí editan los DTOs de cada tipo
 * — ver el comentario de cabecera de `puck-config.tsx`.
 *
 * Se parte de `defaultProps` del bloque correspondiente (no solo de
 * `seccion.configuracion`): una `Seccion` guardada antes de agregar un campo
 * nuevo a su DTO de configuración puede no traerlo en su JSONB — sin este
 * merge, Puck mostraría ese control sin ningún valor seleccionado en vez de
 * partir de un default concreto. Para los 3 campos de foto de `hero`
 * específicamente, `FALLBACK_HERO_LEGADO` pisa el default "de creación" de
 * `defaultProps` con uno conservador (ver su comentario) antes de aplicar la
 * `configuracion` real guardada, que sigue ganando si esos campos sí están
 * presentes.
 */
export function seccionesAContenidoInicial(secciones: Seccion[]): EditorContentItem[] {
  return [...secciones]
    .sort((a, b) => a.orden - b.orden)
    .map((seccion) => {
      const defaultProps =
        puckConfig.components[seccion.tipo_seccion]?.defaultProps ?? {}
      const fallbackLegado =
        seccion.tipo_seccion === 'hero' ? FALLBACK_HERO_LEGADO : {}
      const configuracion =
        seccion.tipo_seccion === 'columnas'
          ? reconstruirConfiguracionColumnas(
              seccion.configuracion as ColumnasConfiguracion,
            )
          : seccion.configuracion
      return {
        type: seccion.tipo_seccion,
        props: {
          ...defaultProps,
          ...fallbackLegado,
          id: seccion.id,
          _seccionId: seccion.id,
          _visible: seccion.visible,
          _tituloVisible: seccion.titulo_visible,
          ...configuracion,
        },
      } as EditorContentItem
    })
}

/**
 * Dirección inversa de `sanearSlots` (UC-17, Fase 3.3): reconstruye
 * `columna_1/2/3` de una `Seccion` `columnas` recién llegada del backend
 * (cada hijo como `BloqueColumnaHijo`, SIN `id`/`_seccionId` — nunca fueron
 * filas propias) a la forma `ComponentData[]` que exige el lienzo de Puck
 * para montarlos dentro de sus zonas de slot.
 */
function reconstruirConfiguracionColumnas(configuracion: ColumnasConfiguracion) {
  return {
    ...configuracion,
    columna_1: hijosColumnaAContenido(configuracion.columna_1),
    columna_2: hijosColumnaAContenido(configuracion.columna_2),
    columna_3: hijosColumnaAContenido(configuracion.columna_3),
  }
}

/**
 * Convierte los `BloqueColumnaHijo[]` persistidos de una columna a
 * `EditorContentItem[]`: parte de `defaultProps` del bloque hijo
 * correspondiente (mismo criterio que `seccionesAContenidoInicial` para
 * filas de nivel superior — cubre hijos guardados antes de agregar un campo
 * nuevo a su DTO) y genera un `id` nuevo client-side en cada carga, porque
 * estos hijos nunca tuvieron un `id` propio y Puck exige uno único por ítem,
 * incluidos los anidados en slots, para su manejo interno de DnD/keys.
 */
function hijosColumnaAContenido(
  hijos: BloqueColumnaHijo[] | undefined,
): EditorContentItem[] {
  return (hijos ?? []).map((hijo) => {
    const defaultProps = puckConfig.components[hijo.tipo_seccion]?.defaultProps ?? {}
    return {
      type: hijo.tipo_seccion,
      props: {
        ...defaultProps,
        id: crypto.randomUUID(),
        _visible: hijo.visible,
        _tituloVisible: hijo.titulo_visible,
        ...hijo.configuracion,
      },
    } as EditorContentItem
  })
}

/** Separa las props internas (prefijo `_`, más el `id` que agrega Puck) de la `configuracion` real que acepta el backend. */
function separarProps(props: EditorContentItem['props']) {
  const { id, _seccionId, _visible, _tituloVisible, ...configuracion } =
    props as Record<string, unknown> & {
      id: string
      _seccionId?: string
      _visible: boolean
      _tituloVisible: string
    }
  return { id, _seccionId, _visible, _tituloVisible, configuracion }
}

/**
 * UC-17 (Fase 3.3): transforma los `columna_1/2/3` de un ítem `columnas` en
 * edición (arrays `ComponentData[]` reales de Puck, cada hijo con props que
 * incluyen `id`/`_visible`/`_tituloVisible` y posiblemente `_seccionId` si el
 * bloque fue arrastrado desde el nivel superior) a la forma
 * `BloqueColumnaHijo` que acepta el backend en `Seccion.configuracion` — ver
 * contrato en `docs/plan-portafolio.md` §4.
 *
 * Descarta `_seccionId` siempre, incluso si el hijo lo tenía (consecuencia
 * deliberada, documentada ahí mismo: anidar una sección existente le borra
 * la fila; sacarla de nuevo crea una fila nueva). Esto se resuelve solo,
 * gratis, por el diff ya existente de nivel superior de `guardarCambios`
 * (una sección que "desaparece" del `content` de nivel superior porque se
 * anidó se elimina igual que cualquier sección borrada) — no hace falta
 * tocar esa lógica de crear/eliminar.
 */
export function sanearSlots(configuracion: Record<string, unknown>): ColumnasConfiguracion {
  const {
    espaciado_vertical,
    ancho_contenido,
    alineacion_texto,
    fondo_bloque,
    separador_inferior,
    distribucion,
    alineacion_vertical,
    espaciado,
    columna_1,
    columna_2,
    columna_3,
  } = configuracion as ColumnasConfiguracion & {
    columna_1: EditorContentItem[]
    columna_2: EditorContentItem[]
    columna_3: EditorContentItem[]
  }

  const sanearColumna = (columna: EditorContentItem[] | undefined): BloqueColumnaHijo[] =>
    (columna ?? []).map((item) => {
      const { _visible, _tituloVisible, configuracion: configuracionHijo } =
        separarProps(item.props)
      return {
        tipo_seccion: item.type as TipoSeccionAnidable,
        titulo_visible: _tituloVisible,
        visible: _visible,
        configuracion: configuracionHijo,
      }
    })

  return {
    espaciado_vertical,
    ancho_contenido,
    alineacion_texto,
    fondo_bloque,
    separador_inferior,
    distribucion,
    alineacion_vertical,
    espaciado,
    columna_1: sanearColumna(columna_1),
    columna_2: sanearColumna(columna_2),
    columna_3: sanearColumna(columna_3),
  }
}

/**
 * UC-07 (Editar estructura visual, drag-and-drop) — editor de Puck sobre
 * las 6 secciones definidas en `docs/plan-tecnico.md` — fusionado con UC-10
 * (Previsualizar cambios) y UC-11 (Publicar/revertir una versión) en un solo
 * lugar (Sprint 7): la barra de acciones (`toolbar`, más abajo) con el estado
 * Borrador/Publicado (`useVersiones`), el botón "Vista previa"
 * (`DialogVistaPrevia`), el botón "Historial de versiones" y el botón único
 * "Publicar" (`usePublicarVersion`) — sin salir de esta página. Antes eran
 * dos páginas separadas (`EditorSeccionesPage` + `PublicacionPage`, hoy
 * eliminada) con una navegación redundante entre ellas.
 *
 * Desde Fase 5 (panel unificado) esa barra ya no vive dentro del header
 * nativo de Puck (`overrides.headerActions`, que forzaba remontar el
 * subárbol en cada render de esta página, ver comentario de
 * `DialogVistaPrevia`): se arma como JSX acá mismo y viaja como prop
 * `toolbar` a `LienzoPuck`, que reconstruye a mano TODO el layout de Puck
 * (`children` reemplaza el header/sidebars/canvas nativos) para poder sumar
 * el panel lateral persistente de 3 pestañas (Bloque/Tema/Fondo) que
 * fusiona esta pantalla con las extintas `/admin/tema` y `/admin/fondo`.
 *
 * Estrategia de sincronización: el `content` de Puck se carga una sola vez
 * desde `GET /admin/secciones` y a partir de ahí Puck es dueño de su propio
 * estado de edición en memoria (drag/drop, campos). Cada cambio se refleja
 * también en `useEditorSeccionesStore` (Zustand) vía `onChange`, que es el
 * "estado de edición en curso" que exige `CLAUDE.md` — nunca se auto-guarda
 * contra el backend. Solo al presionar "Guardar cambios" se recorre ese
 * `content` y se hacen las llamadas necesarias (crear/actualizar/eliminar/
 * reordenar). Tras guardar, se reconstruye el `content` (con los
 * `_seccionId` ya asignados a los bloques nuevos) y se remonta `<Puck>` con
 * una `key` nueva (prop `editorKey` de `LienzoPuck`) para que su estado
 * interno quede consistente con lo que ya existe en el backend.
 *
 * Desde Fase 3.1 el lienzo pinta los bloques reales del sitio (`bloques/`,
 * vía `puckConfig`/`PuckRoot`), no placeholders esquemáticos: además de
 * `GET /admin/secciones` (estructura) hace falta el contenido real (perfil,
 * proyectos, certificaciones, etc.), que trae `useDatosEditor` — ver su
 * comentario para el detalle de qué endpoints compone y qué huecos de media
 * resuelve. Ese contenido viaja a cada bloque de Puck vía `puck.metadata`
 * (prop `metadata` de `<Puck>`, ver `leerMetadata`), nunca como prop de
 * Zustand/TanStack — es dato del servidor, no estado de edición en curso.
 *
 * Mientras `guardando === true` el editor queda `inert` (bloqueado a
 * mouse/teclado, con overlay visual) para que sea imposible seguir editando
 * durante el guardado: así se evita tener que fusionar ediciones
 * concurrentes con el snapshot que se envía al backend.
 */
export function EditorSeccionesPage() {
  const seccionesQuery = useSecciones()
  const { datos, isLoading: datosLoading, error: datosError } = useDatosEditor()
  const content = useEditorSeccionesStore((state) => state.content)
  const setContent = useEditorSeccionesStore((state) => state.setContent)

  const versionesQuery = useVersiones()
  const publicar = usePublicarVersion()
  const [historialAbierto, setHistorialAbierto] = useState(false)

  // Fase 5 (panel unificado): un enlace externo hacia el panel de Tema o
  // Fondo (p. ej. `/admin/editor?panel=tema`, ver el redirect que dejaron
  // las extintas rutas `/admin/tema`/`/admin/fondo` en `App.tsx`) puede pedir
  // arrancar en esa pestaña en vez de "Bloque" (el default de
  // `useEditorPanelStore`). Solo se aplica una vez al montar — un `ref`, no
  // el propio `searchParams` como dependencia del efecto, para no forzar de
  // nuevo esa pestaña si el admin navega a otra después.
  const [searchParams] = useSearchParams()
  const setPestanaActiva = useEditorPanelStore((state) => state.setPestanaActiva)
  const panelInicialAplicado = useRef(false)
  useEffect(() => {
    if (panelInicialAplicado.current) return
    panelInicialAplicado.current = true
    const panel = searchParams.get('panel')
    if (panel === 'tema' || panel === 'fondo') {
      setPestanaActiva(panel satisfies PestanaPanel)
    }
  }, [searchParams, setPestanaActiva])

  // Estado de `DialogVistaPrevia` levantado acá (Fase 4.1, punto 2): ese
  // componente se monta dentro del `toolbar` que arma esta página y viaja
  // como prop a `LienzoPuck` (antes vivía en `overrides.headerActions` de
  // `<Puck>`, una función/objeto literal nuevo en cada render de esta
  // página que Puck remontaba como subárbol en cada cambio de esa
  // referencia). Se mantiene levantado acá por las dudas — es una
  // invariante barata de conservar y evita depender de que ningún
  // componente intermedio deje de recrear elementos en cada render. Ver el
  // comentario de cabecera de `DialogVistaPrevia` para el detalle completo
  // del bug original.
  const [previewAbierto, setPreviewAbierto] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<VersionSitio | null>(
    null,
  )

  // `GET /admin/versiones` (ver `useVersiones`) siempre devuelve el
  // historial más reciente primero: si esa primera fila es un `borrador`
  // (generado por "Previsualizar cambios"), todavía hay contenido sin
  // publicar; si es `publicado`, el sitio público ya refleja lo último. No
  // hace falta comparar contra el `content` de Puck en memoria: el criterio
  // es el mismo que usa el propio historial de versiones (única fuente de
  // verdad de "qué se publicó").
  //
  // Mientras la query todavía está cargando (`isSuccess` false) no hay datos
  // reales todavía, así que no se muestra ningún badge — mostrar "Publicado"
  // por defecto sería engañoso. Un sitio nuevo sin ninguna versión
  // (`data.length === 0`, nunca se publicó ni previsualizó nada) tampoco
  // puede considerarse "Publicado": se trata como "Borrador" porque no hay
  // nada público todavía y es coherente con que el botón "Publicar" sigue
  // disponible para ese primer publish.
  const versionMasReciente = versionesQuery.data?.[0]
  const hayHistorial = versionesQuery.isSuccess && versionesQuery.data.length > 0
  const hayCambiosSinPublicar =
    !hayHistorial || versionMasReciente?.estado === 'borrador'

  const [initialData, setInitialData] = useState<EditorData | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [guardando, setGuardando] = useState(false)

  // Fuente de verdad de "qué hay persistido ahora mismo" para el diff de
  // `guardarCambios` (ver comentario de `SeccionPersistida` más arriba).
  const seccionesPersistentesRef = useRef<SeccionPersistida[]>([])

  const crearSeccion = useCrearSeccion()
  const actualizarSeccion = useActualizarSeccion()
  const actualizarConfiguracion = useActualizarConfiguracionSeccion()
  const actualizarVisibilidad = useActualizarVisibilidadSeccion()
  const eliminarSeccion = useEliminarSeccion()
  const reordenarSecciones = useReordenarSecciones()

  // Carga inicial: arma el `content` de Puck una sola vez cuando llegan las
  // secciones existentes. No se vuelve a ejecutar en refetchs posteriores
  // (evita perder ediciones en curso del admin).
  useEffect(() => {
    if (initialData || !seccionesQuery.data) return
    const contenidoInicial = seccionesAContenidoInicial(seccionesQuery.data)
    setInitialData({ content: contenidoInicial, root: {} })
    setContent(contenidoInicial)
    seccionesPersistentesRef.current = seccionesQuery.data.map((seccion) => ({
      id: seccion.id,
      tipo_seccion: seccion.tipo_seccion,
      titulo_visible: seccion.titulo_visible,
      orden: seccion.orden,
      visible: seccion.visible,
      configuracion: seccion.configuracion,
    }))
  }, [seccionesQuery.data, initialData, setContent])

  // Identidad estable de `metadata`: `<Puck>` re-renderiza TODOS los bloques
  // del lienzo cada vez que la referencia de `metadata` cambia (la usa como
  // dependencia interna). Sin este `useMemo`, un objeto `{ datos }` literal
  // nuevo en cada render de `EditorSeccionesPage` forzaría un re-render
  // completo del lienzo en cada tecleo de cualquier campo — este es el
  // riesgo de performance más probable de todo el rediseño (Fase 3.1).
  const metadata = useMemo<MetadataEditor | undefined>(
    () => (datos ? { datos } : undefined),
    [datos],
  )

  const guardarCambios = async () => {
    setGuardando(true)

    const seccionesOriginales = seccionesPersistentesRef.current
    const contentActualizado = [...content]

    try {
      for (let i = 0; i < contentActualizado.length; i += 1) {
        const item = contentActualizado[i]
        const {
          id,
          _seccionId,
          _visible,
          _tituloVisible,
          configuracion: configuracionCruda,
        } = separarProps(item.props)
        const tipo = item.type as TipoSeccion
        // Un ítem `columnas` guarda sus hijos como `ComponentData[]` reales
        // de Puck mientras se edita (ver `PuckSeccionesComponents`) — hay que
        // sanearlos a `BloqueColumnaHijo[]` antes de mandarlos al backend, la
        // única forma que acepta `Seccion.configuracion` (UC-17).
        const configuracion =
          tipo === 'columnas'
            ? sanearSlots(configuracionCruda as Record<string, unknown>)
            : configuracionCruda

        if (!_seccionId) {
          const creada = await crearSeccion.mutateAsync({
            tipo_seccion: tipo,
            titulo_visible: _tituloVisible || TIPO_SECCION_LABEL[tipo],
            orden: i,
            visible: _visible,
            configuracion,
          })
          contentActualizado[i] = {
            ...item,
            props: { ...item.props, id, _seccionId: creada.id },
          } as EditorContentItem
          continue
        }

        const original = seccionesOriginales.find((s) => s.id === _seccionId)
        if (!original) continue

        const configuracionCambio =
          JSON.stringify(original.configuracion) !== JSON.stringify(configuracion)
        if (configuracionCambio) {
          await actualizarConfiguracion.mutateAsync({
            id: _seccionId,
            configuracion,
          })
        }

        if (original.titulo_visible !== _tituloVisible) {
          await actualizarSeccion.mutateAsync({
            id: _seccionId,
            titulo_visible: _tituloVisible,
          })
        }

        if (original.visible !== _visible) {
          await actualizarVisibilidad.mutateAsync({
            id: _seccionId,
            visible: _visible,
          })
        }
      }

      const idsEnContenido = new Set(
        contentActualizado
          .map((item) => separarProps(item.props)._seccionId)
          .filter((id): id is string => Boolean(id)),
      )
      const eliminadas = seccionesOriginales.filter(
        (seccion) => !idsEnContenido.has(seccion.id),
      )
      for (const seccion of eliminadas) {
        await eliminarSeccion.mutateAsync(seccion.id)
      }

      const itemsOrden = contentActualizado
        .map((item, index) => ({
          id: separarProps(item.props)._seccionId,
          orden: index,
        }))
        .filter(
          (item): item is { id: string; orden: number } => Boolean(item.id),
        )
      if (itemsOrden.length > 0) {
        await reordenarSecciones.mutateAsync(itemsOrden)
      }

      // Actualiza la fuente de verdad de "qué hay persistido ahora mismo"
      // con el resultado real de este guardado (incluidos los `_seccionId`
      // recién asignados a los bloques nuevos), en vez de depender de que
      // `seccionesQuery.data` ya se haya refrescado — las mutaciones de
      // arriba solo invalidan la query sin esperar su refetch.
      seccionesPersistentesRef.current = contentActualizado.map(
        (item, index) => {
          const {
            _seccionId,
            _visible,
            _tituloVisible,
            configuracion: configuracionCruda,
          } = separarProps(item.props)
          const tipo = item.type as TipoSeccion
          const configuracion =
            tipo === 'columnas'
              ? sanearSlots(configuracionCruda as Record<string, unknown>)
              : configuracionCruda
          return {
            id: _seccionId as string,
            tipo_seccion: tipo,
            titulo_visible: _tituloVisible,
            orden: index,
            visible: _visible,
            configuracion,
          } satisfies SeccionPersistida
        },
      )

      setContent(contentActualizado)
      setInitialData({ content: contentActualizado, root: {} })
      setEditorKey((key) => key + 1)
      toast.success('Cambios guardados correctamente.')
    } catch {
      // No mostramos un toast de error aquí: cada sub-mutación
      // (`crearSeccion`, `actualizarConfiguracion`, etc.) ya es un
      // `useMutation` y pasa por el `MutationCache.onError` global de
      // `query-client.ts`, que SIEMPRE dispara su propio `toast.error` sin
      // importar si la mutación declara `meta` — duplicarlo aquí mostraba el
      // mismo mensaje dos veces. Este `catch` solo existe para la lógica de
      // estado: conserva en `content` lo que sí se alcanzó a crear (con sus
      // `_seccionId` nuevos) para no duplicar secciones si el admin
      // reintenta guardar tras corregir el error. Deliberadamente NO se
      // avanza `seccionesPersistentesRef` aquí, para que el próximo intento
      // vuelva a diffear contra el último estado realmente persistido.
      setContent(contentActualizado)
    } finally {
      setGuardando(false)
    }
  }

  const cargando = seccionesQuery.isLoading || datosLoading
  const errorCarga = seccionesQuery.error ?? datosError

  return (
    <div className="-mx-4 -my-4 grid gap-0">
      <Dialog open={historialAbierto} onOpenChange={setHistorialAbierto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de versiones</DialogTitle>
            <DialogDescription>
              Previsualiza los cambios en curso o vuelve a una versión
              publicada anterior, sin salir del editor.
            </DialogDescription>
          </DialogHeader>
          <PanelVersiones />
        </DialogContent>
      </Dialog>

      {/*
        Fase 4.1, punto 6: el badge "Borrador" del header de Puck (más abajo)
        es chico y fácil de pasar por alto — este banner persistente hace
        explícito que "no veo el cambio en `/`" significa "todavía no
        publicaste", no un bug. Puramente informativo (no bloquea la
        interacción con el lienzo).
      */}
      {versionesQuery.isSuccess && hayCambiosSinPublicar ? (
        <div
          role="status"
          className="flex items-center gap-2 border-b bg-secondary px-4 py-2 text-sm text-secondary-foreground"
        >
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Tenés cambios guardados que todavía no publicaste. Los
            visitantes del sitio siguen viendo la última versión publicada
            hasta que presiones "Publicar".
          </span>
        </div>
      ) : null}

      {cargando ? (
        <p className="p-4 text-sm text-muted-foreground">
          Cargando secciones…
        </p>
      ) : null}
      {errorCarga ? (
        <p role="alert" className="p-4 text-sm text-destructive">
          {errorCarga instanceof ApiError
            ? errorCarga.message
            : 'No se pudieron cargar las secciones.'}
        </p>
      ) : null}

      {initialData && datos ? (
        // `h-[calc(100vh-4.5rem)]`: solo se descuenta la cabecera fija de
        // `AdminLayout` (~4.5rem) — no hay ninguna barra de acciones propia
        // ENCIMA del lienzo: la barra (`toolbar`) comparte fila con los
        // controles de deshacer/rehacer y viewport dentro del propio
        // `LienzoPuck` (Fase 5), que ocupa el resto de este alto completo.
        <div className="relative h-[calc(100vh-4.5rem)]">
          {/*
            `inert` (React 19 / atributo HTML nativo) bloquea por completo el
            mouse y el teclado dentro del editor mientras `guardando` es
            `true`: evita que el admin siga editando en Puck durante las
            llamadas de red de "Guardar cambios" y que, al terminar, se
            sobreescriba el store con un snapshot ya desactualizado.
          */}
          <div
            data-testid="puck-editor-wrapper"
            inert={guardando}
            aria-hidden={guardando}
            className={
              guardando
                ? 'h-full opacity-60 grayscale-[30%]'
                : 'h-full'
            }
          >
            {/*
              Fase 4.1, punto 5: instancia acotada al lienzo (a diferencia de
              la instancia general de `App.tsx`) — si `<Puck>` crashea (p.
              ej. un campo de configuración de un bloque con un valor que
              rompe el render), el resto del panel de administración
              (sidebar, header, este mismo wrapper) sigue funcionando. El
              fallback fuerza un remount completo de `<Puck>` reutilizando
              `editorKey` (mismo mecanismo que ya usa `guardarCambios` tras
              un guardado exitoso) además de limpiar el estado de error del
              boundary.
            */}
            <ErrorBoundary
              fallback={(reintentar) => (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                  <div>
                    <h2 className="text-lg font-semibold">
                      El lienzo del editor tuvo un error
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Podés reintentar sin perder el resto del panel de
                      administración.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditorKey((key) => key + 1)
                      reintentar()
                    }}
                  >
                    Reintentar
                  </Button>
                </div>
              )}
            >
            <LienzoPuck
              data={initialData}
              metadata={metadata}
              editorKey={editorKey}
              onChange={(data) => setContent(data.content)}
              // Barra de acciones propia (Fase 3.1, migrada a `toolbar` de
              // `LienzoPuck` en Fase 5 — ver comentario de cabecera de este
              // componente): el estado Borrador/Publicado (UC-10/UC-11) y su
              // Popover explicativo van primero, seguidos de "Vista previa"
              // (`DialogVistaPrevia`), "Historial de versiones" y el botón
              // único "Publicar"/"Guardar cambios".
              toolbar={
                <>
                  {versionesQuery.isSuccess ? (
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={hayCambiosSinPublicar ? 'secondary' : 'default'}
                      >
                        {hayCambiosSinPublicar ? 'Borrador' : 'Publicado'}
                      </Badge>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            aria-label="Qué significa cada estado"
                          >
                            <Info className="size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-sm">
                          <p className="mb-3 text-muted-foreground">
                            Este editor muestra el sitio real: arrastra
                            bloques, edítalos y ajusta su visibilidad
                            directamente sobre la vista previa. Los cambios
                            quedan en el lienzo hasta que los guardes, y
                            solo llegan al público cuando presionas
                            "Publicar".
                          </p>
                          <ul className="grid gap-2">
                            <li>
                              <strong>Lienzo:</strong> tu contenido actual,
                              incluidos los cambios sin guardar.
                            </li>
                            <li>
                              <strong>Borrador:</strong> lo último que
                              guardaste; todavía no es público.
                            </li>
                            <li>
                              <strong>Publicado:</strong> lo que ve un
                              visitante del sitio hoy.
                            </li>
                          </ul>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : null}
                  <DialogVistaPrevia
                    open={previewAbierto}
                    onOpenChange={setPreviewAbierto}
                    previewVersion={previewVersion}
                    onPreviewVersion={setPreviewVersion}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setHistorialAbierto(true)}
                  >
                    Historial de versiones
                  </Button>
                  <ConfirmActionDialog
                    trigger={<Button disabled={publicar.isPending}>Publicar</Button>}
                    title="¿Publicar los cambios actuales?"
                    description="Esto reemplaza de inmediato la versión visible al público con el contenido, secciones y tema actuales."
                    confirmLabel="Publicar"
                    pendingLabel="Publicando…"
                    isPending={publicar.isPending}
                    onConfirm={() => publicar.mutate()}
                  />
                  <Button
                    onClick={guardarCambios}
                    disabled={guardando || !initialData}
                  >
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </>
              }
            />
            </ErrorBoundary>
          </div>
          {guardando ? (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 text-sm font-medium text-foreground"
            >
              Guardando cambios… la edición está bloqueada temporalmente.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
