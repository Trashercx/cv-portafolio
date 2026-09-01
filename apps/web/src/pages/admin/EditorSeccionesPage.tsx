import '@measured/puck/puck.css'
import { Puck, type Data } from '@measured/puck'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'

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
 * Convierte las `Seccion[]` del backend (ordenadas por `orden`) al `content`
 * inicial de Puck. Los campos propios de nuestro backend (`id`, `visible`,
 * `titulo_visible`) viajan como props con prefijo `_` para no mezclarse con
 * los campos reales de `configuracion` que sí editan los DTOs de cada tipo
 * — ver el comentario de cabecera de `puck-config.tsx`.
 */
function seccionesAContenidoInicial(secciones: Seccion[]): EditorContentItem[] {
  return [...secciones]
    .sort((a, b) => a.orden - b.orden)
    .map(
      (seccion) =>
        ({
          type: seccion.tipo_seccion,
          props: {
            id: seccion.id,
            _seccionId: seccion.id,
            _visible: seccion.visible,
            _tituloVisible: seccion.titulo_visible,
            ...seccion.configuracion,
          },
        }) as EditorContentItem,
    )
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
 * las 6 secciones definidas en `docs/plan-tecnico.md`.
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

  const [initialData, setInitialData] = useState<EditorData | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<
    { tipo: 'exito' | 'error'; texto: string } | null
  >(null)

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
    setMensaje(null)

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
      setMensaje({ tipo: 'exito', texto: 'Cambios guardados correctamente.' })
    } catch (error) {
      // Conserva en `content` lo que sí se alcanzó a crear (con sus
      // `_seccionId` nuevos) para no duplicar secciones si el admin
      // reintenta guardar tras corregir el error.
      setContent(contentActualizado)
      setMensaje({
        tipo: 'error',
        texto:
          error instanceof ApiError
            ? error.message
            : 'No se pudieron guardar todos los cambios. Intenta de nuevo.',
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="-mx-4 -my-4 grid gap-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Editor visual de secciones</h1>
          <p className="text-sm text-muted-foreground">
            Arrastra bloques desde el panel, edita su configuración y su
            visibilidad, y presiona "Guardar cambios" para aplicarlos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mensaje ? (
            <p
              role={mensaje.tipo === 'error' ? 'alert' : 'status'}
              className={
                mensaje.tipo === 'error'
                  ? 'text-sm text-destructive'
                  : 'text-sm text-green-600'
              }
            >
              {mensaje.texto}
            </p>
          ) : null}
          <Button
            onClick={guardarCambios}
            disabled={guardando || !initialData}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

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
              onChange={(data) => setContent(data.content)}
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
