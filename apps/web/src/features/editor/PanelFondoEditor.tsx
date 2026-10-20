import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { useTheme } from '@/components/theme/ThemeProvider'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import {
  CATALOGO_FONDOS,
  CONFIGURACION_FONDO_DEFAULT,
  entradaCatalogo,
  type EntradaCatalogoFondo,
  type TipoFondo,
} from '@/features/fondo-sitio/catalogo-fondos'
import { agruparFondosPorTipo, fondoDeBorrador } from '@/features/fondo-sitio/agrupar-fondos'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import {
  useActivarFondoSitio,
  useCrearFondoSitio,
  useEliminarFondoSitio,
  useFondosSitio,
} from '@/features/fondo-sitio/useFondosSitio'
import { useTemas } from '@/features/tema/useTemas'
import { ApiError } from '@/lib/api-client'
import { temaComoVariablesCss } from '@/lib/tema-css'
import type { ModoTema } from '@/lib/tema-oscuro'
import { cn } from '@/lib/utils'
import { useEditorPanelStore, type PluginEditor } from '@/store/editor-panel-store'

/**
 * Plugin "Fondo" del rail de Puck en el editor unificado (Fase 5, plugin desde
 * Fase 7; galería de la Fase 7b y tarjeta-botón de la Fase 7l, UC-15). Es solo
 * la galería de las tarjetas del catálogo (`catalogo-fondos.ts`), cada una con
 * miniatura en vivo (`FondoAnimado modo="miniatura"` dentro de un marco con
 * las variables del tema activo), nombre, descripción y distintivo
 * "Interactivo"; la del fondo activo lleva borde `primary` y la etiqueta
 * "Activo", y la elegida un anillo `primary` (`aria-pressed`). Con un fondo
 * guardado por tipo, la galería es la lista (los duplicados heredados de datos
 * anteriores quedan en un desplegable).
 *
 * Cada tarjeta es un `<button>` completo. Al pulsarla:
 * 1. se crea el fondo con `CONFIGURACION_FONDO_DEFAULT` si ese tipo aún no
 *    existe y se activa, o solo se activa si ya existía (exclusividad en el
 *    API; encadenado con `mutateAsync`);
 * 2. se guarda `fondoSeleccionado` en `editor-panel-store`, y
 * 3. se publica al lienzo de inmediato (`fondoEnEdicion`) con la configuración
 *    guardada (o los defaults).
 * Los ajustes (velocidad, opacidad, intensidad, interactivo) viven en
 * `PanelAjustesFondo`, en el panel derecho de Puck, y se guardan solos. Al
 * montar, si hay un fondo activo queda preseleccionado. La selección y el
 * fondo en curso se limpian al cambiar de plugin y al desmontar el panel.
 *
 * Mutaciones: las de `useFondosSitio` (TanStack Query); la selección en curso
 * vive en Zustand, nunca en el estado del servidor.
 */
export function PanelFondoEditor() {
  const { data: fondos, isLoading, error } = useFondosSitio()
  const { data: temas } = useTemas()
  const { theme } = useTheme()
  const modoVistaPrevia = useEditorPanelStore((state) => state.modoVistaPrevia)
  const pluginActivo = useEditorPanelStore((state) => state.pluginActivo)
  const fondoSeleccionado = useEditorPanelStore((state) => state.fondoSeleccionado)
  const setFondoEnEdicion = useEditorPanelStore((state) => state.setFondoEnEdicion)
  const setFondoSeleccionado = useEditorPanelStore((state) => state.setFondoSeleccionado)

  const crear = useCrearFondoSitio({ silencioso: true })
  const activar = useActivarFondoSitio()
  const eliminar = useEliminarFondoSitio()

  // Marco con las variables del tema activo, igual que el lienzo (`PuckRoot`).
  const modo: ModoTema = modoVistaPrevia ?? (theme === 'dark' ? 'oscuro' : 'claro')
  const temaActivo = temas?.find((tema) => tema.activo)
  const estiloTema = temaActivo ? temaComoVariablesCss(temaActivo, modo) : undefined

  // Un fondo por tipo: el activo o, si no hay, el último del listado.
  const { porTipo, duplicados } = useMemo(() => agruparFondosPorTipo(fondos), [fondos])

  // Preselección del fondo activo al abrir el plugin (Fase 7l). Se repite si
  // cambia `pluginActivo` (el store limpia la selección al cambiar de plugin),
  // pero no cuando un bloque seleccionado la limpia: ahí el admin eligió otra cosa.
  const preseleccionadoEn = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    // Con otro plugin del rail activo el panel está a punto de desmontarse.
    if (pluginActivo !== null && pluginActivo !== ('fondo' satisfies PluginEditor)) return
    if (preseleccionadoEn.current === pluginActivo) return
    const activo = [...porTipo.entries()].find(([, f]) => f.activo)
    if (!activo) return
    preseleccionadoEn.current = pluginActivo
    if (useEditorPanelStore.getState().fondoSeleccionado) return
    const [tipo, fondo] = activo
    setFondoSeleccionado(tipo)
    setFondoEnEdicion(
      fondoDeBorrador(tipo, fondo, { ...CONFIGURACION_FONDO_DEFAULT, ...fondo.configuracion }),
    )
  }, [pluginActivo, porTipo, setFondoSeleccionado, setFondoEnEdicion])

  // Cambiar de plugin desmonta el panel: se descarta la selección y el fondo en curso.
  useEffect(
    () => () => {
      preseleccionadoEn.current = undefined // StrictMode: el remontaje vuelve a preseleccionar
      setFondoEnEdicion(null)
      setFondoSeleccionado(null)
    },
    [setFondoEnEdicion, setFondoSeleccionado],
  )

  // Pulsar una tarjeta: selecciona, publica al lienzo y activa (crea antes si
  // hace falta). Crear + activar se encadenan con `mutateAsync`: no dependen de
  // que el componente siga montado. Los errores ya los notifica `query-client` (toast).
  const manejarSeleccionar = async (tipo: TipoFondo) => {
    const guardado = porTipo.get(tipo)
    setFondoSeleccionado(tipo)
    setFondoEnEdicion(
      fondoDeBorrador(tipo, guardado, {
        ...CONFIGURACION_FONDO_DEFAULT,
        ...guardado?.configuracion,
      }),
    )
    try {
      if (guardado) {
        if (!guardado.activo) await activar.mutateAsync(guardado.id)
        return
      }
      const nuevo = await crear.mutateAsync({
        tipo,
        configuracion: { ...CONFIGURACION_FONDO_DEFAULT },
      })
      await activar.mutateAsync(nuevo.id)
    } catch {
      // Ya notificado por el manejador global de mutaciones.
    }
  }

  return (
    // Décima ronda (UC-15): el plugin de Puck mide ~240 px; la galería se adapta
    // al ancho del CONTENEDOR (container queries), no al del viewport.
    <div className="@container grid gap-4 p-4">
      <h3 className="text-sm font-semibold">Fondo del sitio</h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando fondos…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar los fondos.'}
        </p>
      ) : null}

      <ul
        className="grid grid-cols-1 gap-3 @min-[20rem]:grid-cols-2"
        aria-label="Fondos disponibles"
      >
        {CATALOGO_FONDOS.map((entrada) => (
          <TarjetaFondo
            key={entrada.tipo}
            entrada={entrada}
            guardado={porTipo.get(entrada.tipo)}
            estiloTema={estiloTema}
            seleccionada={fondoSeleccionado === entrada.tipo}
            onSeleccionar={() => void manejarSeleccionar(entrada.tipo)}
          />
        ))}
      </ul>

      {duplicados.length > 0 ? (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Fondos duplicados ({duplicados.length})
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Quedaron de versiones anteriores: la galería usa el activo (o el
            último) de cada tipo. Puedes eliminar los demás.
          </p>
          <ul className="mt-2 grid gap-2">
            {duplicados.map((fondo) => {
              const nombre = entradaCatalogo(fondo.tipo).nombre
              return (
                <li key={fondo.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs">
                    {nombre} · {fondo.configuracion.velocidad} · opacidad{' '}
                    {fondo.configuracion.opacidad}
                  </span>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="destructive" size="sm">
                        Eliminar
                      </Button>
                    }
                    title={`¿Eliminar este fondo duplicado de "${nombre}"?`}
                    description="Esta acción no se puede deshacer."
                    isPending={eliminar.isPending}
                    onConfirm={() => eliminar.mutate(fondo.id)}
                  />
                </li>
              )
            })}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

type TarjetaFondoProps = {
  entrada: EntradaCatalogoFondo
  guardado: FondoSitio | undefined
  estiloTema: CSSProperties | undefined
  seleccionada: boolean
  onSeleccionar: () => void
}

/** Tarjeta-botón de la galería (Fase 7l, UC-15): toda la tarjeta es el botón. */
function TarjetaFondo({
  entrada,
  guardado,
  estiloTema,
  seleccionada,
  onSeleccionar,
}: TarjetaFondoProps) {
  const activo = guardado?.activo ?? false
  const configuracion = guardado?.configuracion ?? CONFIGURACION_FONDO_DEFAULT
  return (
    <li>
      <button
        type="button"
        data-testid={`tarjeta-fondo-${entrada.tipo}`}
        aria-pressed={seleccionada}
        onClick={onSeleccionar}
        className={cn(
          'tarjeta-fondo grid w-full cursor-pointer content-start gap-2 rounded-lg border p-2 text-left transition-shadow outline-none hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50',
          activo && 'border-primary',
          seleccionada && 'ring-2 ring-primary',
        )}
      >
        <span
          style={estiloTema}
          className="relative block aspect-[16/10] overflow-hidden rounded-md border"
        >
          <FondoAnimado
            fondo={{ tipo: entrada.tipo, configuracion }}
            modo="miniatura"
          />
        </span>
        <span className="grid gap-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold">{entrada.nombre}</span>
            {activo ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
                Activo
              </span>
            ) : null}
            {entrada.interactivo ? (
              <span className="rounded-full border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                Interactivo
              </span>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">{entrada.descripcion}</span>
        </span>
      </button>
    </li>
  )
}
