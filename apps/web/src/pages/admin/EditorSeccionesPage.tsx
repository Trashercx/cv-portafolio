import '@measured/puck/puck.css'
import { Puck, type Data, type UiState, type Viewports } from '@measured/puck'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
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
  type Seccion,
  type TipoSeccion,
} from '@/features/secciones/types'
import { usePublicarVersion, useVersiones } from '@/features/publicacion/usePublicacion'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'

type EditorData = Data<PuckSeccionesComponents>
type EditorContentItem = EditorData['content'][number]

/**
 * Opciones del selector de viewport de Puck, con el escritorio primero (el
 * panel de administración se usa mayormente en desktop). El primer elemento
 * también determina el ancho por defecto cuando no hay `ui.viewports`
 * explícito, pero aquí igual fijamos `PUCK_UI_INICIAL` abajo porque Puck por
 * defecto ignora este orden al calcular el viewport inicial (ver
 * `PUCK_UI_INICIAL`).
 */
const PUCK_VIEWPORTS: Viewports = [
  { width: 1280, height: 'auto', icon: 'Monitor', label: 'Escritorio' },
  { width: 768, height: 'auto', icon: 'Tablet', label: 'Tablet' },
  { width: 360, height: 'auto', icon: 'Smartphone', label: 'Móvil' },
]

/**
 * Puck siempre inicializa `state.ui.viewports.current` desde su propio
 * `defaultViewports[0]` (360px / "Small"), sin importar la prop `viewports`
 * de arriba (que solo cambia las OPCIONES del selector, no el estado
 * inicial) — por eso hace falta fijarlo explícitamente vía la prop `ui`.
 * `Partial<UiState>` solo hace opcionales las claves de nivel superior: si
 * se pasa `viewports`, Puck lo mezcla con un spread superficial contra su
 * estado por defecto, así que hay que repetir la forma completa
 * (`current`, `controlsVisible`, `options`) y no solo `current`, o
 * `controlsVisible`/`options` quedarían `undefined`.
 */
const PUCK_UI_INICIAL: Partial<UiState> = {
  viewports: {
    current: { width: 1280, height: 'auto' },
    controlsVisible: true,
    options: [],
  },
}

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
function seccionesAContenidoInicial(secciones: Seccion[]): EditorContentItem[] {
  return [...secciones]
    .sort((a, b) => a.orden - b.orden)
    .map((seccion) => {
      const defaultProps =
        puckConfig.components[seccion.tipo_seccion]?.defaultProps ?? {}
      const fallbackLegado =
        seccion.tipo_seccion === 'hero' ? FALLBACK_HERO_LEGADO : {}
      return {
        type: seccion.tipo_seccion,
        props: {
          ...defaultProps,
          ...fallbackLegado,
          id: seccion.id,
          _seccionId: seccion.id,
          _visible: seccion.visible,
          _tituloVisible: seccion.titulo_visible,
          ...seccion.configuracion,
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
 * UC-07 (Editar estructura visual, drag-and-drop) — editor de Puck sobre
 * las 6 secciones definidas en `docs/plan-tecnico.md` — fusionado con UC-10
 * (Previsualizar cambios) y UC-11 (Publicar/revertir una versión) en un solo
 * lugar (Sprint 7): la barra superior tiene el estado Borrador/Publicado
 * (`useVersiones`) y el botón único "Publicar" (`usePublicarVersion`), y el
 * botón "Historial de versiones" abre un `Dialog` con `PanelVersiones`
 * (previsualizar + historial completo + "Deshacer última publicación") sin
 * salir de esta página. Antes eran dos páginas separadas
 * (`EditorSeccionesPage` + `PublicacionPage`, hoy eliminada) con una
 * navegación redundante entre ellas.
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
 * una `key` nueva para que su estado interno quede consistente con lo que
 * ya existe en el backend.
 *
 * Mientras `guardando === true` el editor queda `inert` (bloqueado a
 * mouse/teclado, con overlay visual) para que sea imposible seguir editando
 * durante el guardado: así se evita tener que fusionar ediciones
 * concurrentes con el snapshot que se envía al backend.
 */
export function EditorSeccionesPage() {
  const seccionesQuery = useSecciones()
  const content = useEditorSeccionesStore((state) => state.content)
  const setContent = useEditorSeccionesStore((state) => state.setContent)

  const versionesQuery = useVersiones()
  const publicar = usePublicarVersion()
  const [historialAbierto, setHistorialAbierto] = useState(false)

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

  const guardarCambios = async () => {
    setGuardando(true)

    const seccionesOriginales = seccionesPersistentesRef.current
    const contentActualizado = [...content]

    try {
      for (let i = 0; i < contentActualizado.length; i += 1) {
        const item = contentActualizado[i]
        const { id, _seccionId, _visible, _tituloVisible, configuracion } =
          separarProps(item.props)
        const tipo = item.type as TipoSeccion

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
          const { _seccionId, _visible, _tituloVisible, configuracion } =
            separarProps(item.props)
          return {
            id: _seccionId as string,
            tipo_seccion: item.type as TipoSeccion,
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

  return (
    <div className="-mx-4 -my-4 grid gap-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-lg font-semibold">
              Editor visual de secciones
            </h1>
            {versionesQuery.isSuccess ? (
              <Badge variant={hayCambiosSinPublicar ? 'secondary' : 'default'}>
                {hayCambiosSinPublicar ? 'Borrador' : 'Publicado'}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Arrastra bloques desde el panel, edita su configuración y su
            visibilidad, y presiona "Guardar cambios" para aplicarlos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </div>

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

      {seccionesQuery.isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">
          Cargando secciones…
        </p>
      ) : null}
      {seccionesQuery.error ? (
        <p role="alert" className="p-4 text-sm text-destructive">
          {seccionesQuery.error instanceof ApiError
            ? seccionesQuery.error.message
            : 'No se pudieron cargar las secciones.'}
        </p>
      ) : null}

      {initialData ? (
        <div className="relative h-[calc(100vh-8.5rem)]">
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
            <Puck
              key={editorKey}
              config={puckConfig}
              data={initialData}
              viewports={PUCK_VIEWPORTS}
              ui={PUCK_UI_INICIAL}
              onChange={(data) => setContent(data.content)}
              overrides={{
                // Puck siempre renderiza su propio botón nativo "Publish" en
                // el header, pero nunca le pasamos `onPublish` así que
                // quedaba desconectado (el click no hacía nada). El flujo
                // real de publicación (UC-11, con su propio diálogo de
                // confirmación) ahora vive en la barra superior de esta
                // misma página (botón "Publicar" fuera del lienzo de Puck),
                // así que aquí se anula por completo el header nativo de
                // Puck para no mostrar un botón "Publish" muerto junto al
                // real.
                headerActions: () => <></>,
              }}
            />
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
