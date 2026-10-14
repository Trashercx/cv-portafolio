import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { useTheme } from '@/components/theme/ThemeProvider'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  CATALOGO_FONDOS,
  CONFIGURACION_FONDO_DEFAULT,
  entradaCatalogo,
  normalizarTipoFondo,
  type EntradaCatalogoFondo,
  type TipoFondo,
} from '@/features/fondo-sitio/catalogo-fondos'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import {
  useActivarFondoSitio,
  useActualizarFondoSitio,
  useCrearFondoSitio,
  useEliminarFondoSitio,
  useFondosSitio,
} from '@/features/fondo-sitio/useFondosSitio'
import { useTemas } from '@/features/tema/useTemas'
import { ApiError } from '@/lib/api-client'
import { temaComoVariablesCss } from '@/lib/tema-css'
import type { ModoTema } from '@/lib/tema-oscuro'
import { cn } from '@/lib/utils'
import { useEditorPanelStore } from '@/store/editor-panel-store'

type Configuracion = FondoSitio['configuracion']

/** Retraso (ms) con que el slider publica el fondo en curso al lienzo: evita repintar el iframe en cada paso del arrastre. */
const RETRASO_SLIDER_MS = 120

const OPCIONES_VELOCIDAD = [
  { valor: 'lenta', etiqueta: 'Lenta' },
  { valor: 'media', etiqueta: 'Media' },
  { valor: 'rapida', etiqueta: 'Rápida' },
] as const

const OPCIONES_INTENSIDAD = [
  { valor: 'sutil', etiqueta: 'Sutil' },
  { valor: 'media', etiqueta: 'Media' },
  { valor: 'alta', etiqueta: 'Alta' },
] as const

type ControlSegmentadoProps<T extends string> = {
  etiqueta: string
  opciones: readonly { valor: T; etiqueta: string }[]
  valor: T
  onChange: (valor: T) => void
}

/** Grupo de botones excluyentes (`radiogroup`), más legible en un panel angosto que un `Select`. */
function ControlSegmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  onChange,
}: ControlSegmentadoProps<T>) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium">{etiqueta}</span>
      <div
        role="radiogroup"
        aria-label={etiqueta}
        className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1"
      >
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={valor === opcion.valor}
            onClick={() => onChange(opcion.valor)}
            className={cn(
              'min-w-0 truncate rounded-sm px-2 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              valor === opcion.valor
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Fondo "de borrador": lo que ve el lienzo mientras se ajusta (id vacío si aún no existe en el servidor). */
function fondoDeBorrador(
  tipo: TipoFondo,
  existente: FondoSitio | undefined,
  configuracion: Configuracion,
): FondoSitio {
  return {
    id: existente?.id ?? '',
    usuario_admin_id: existente?.usuario_admin_id ?? '',
    tipo,
    configuracion,
    activo: existente?.activo ?? false,
  }
}

/**
 * Plugin "Fondo" del rail de Puck en el editor unificado (Fase 5, plugin desde
 * Fase 7; rediseñado en la Fase 7b, UC-15). Galería de las 9 tarjetas del
 * catálogo (`catalogo-fondos.ts`), cada una con miniatura en vivo
 * (`FondoAnimado modo="miniatura"` dentro de un marco con las variables del
 * tema activo), nombre, descripción y distintivo "Interactivo"; la del fondo
 * activo lleva borde `primary` y la etiqueta "Activo". Con un fondo guardado
 * por tipo, la galería es la lista (los duplicados heredados de datos
 * anteriores quedan en un desplegable).
 *
 * - "Activar": crea el fondo con los valores por defecto si ese tipo aún no
 *   existe y lo activa; si existe, solo lo activa (exclusividad en el API).
 * - "Ajustar": abre el editor inline bajo la galería con una vista previa
 *   grande y los controles `velocidad`, `opacidad`, `intensidad` e
 *   `interactivo`. Mientras se ajusta, el fondo en curso se publica en
 *   `useEditorPanelStore.fondoEnEdicion` para que el lienzo lo muestre antes
 *   de guardar; se limpia al guardar, cancelar y al desmontar el panel
 *   (cambiar de plugin del rail).
 *
 * Mutaciones: las de `useFondosSitio` (TanStack Query); el estado del ajuste
 * en curso vive en el componente y en Zustand, nunca en el estado del servidor.
 */
export function PanelFondoEditor() {
  const { data: fondos, isLoading, error } = useFondosSitio()
  const { data: temas } = useTemas()
  const { theme } = useTheme()
  const modoVistaPrevia = useEditorPanelStore((state) => state.modoVistaPrevia)
  const setFondoEnEdicion = useEditorPanelStore((state) => state.setFondoEnEdicion)

  const crear = useCrearFondoSitio({ silencioso: true })
  const activar = useActivarFondoSitio()
  const eliminar = useEliminarFondoSitio()

  const [ajustando, setAjustando] = useState<TipoFondo | null>(null)
  const [borrador, setBorrador] = useState<Configuracion>({
    ...CONFIGURACION_FONDO_DEFAULT,
  })
  // Si el último cambio vino del slider se retrasa la publicación al lienzo.
  const cambioDeSlider = useRef(false)

  // Marco con las variables del tema activo, igual que el lienzo (`PuckRoot`).
  const modo: ModoTema = modoVistaPrevia ?? (theme === 'dark' ? 'oscuro' : 'claro')
  const temaActivo = temas?.find((tema) => tema.activo)
  const estiloTema = temaActivo ? temaComoVariablesCss(temaActivo, modo) : undefined

  // Un fondo por tipo: el activo o, si no hay, el último del listado.
  const { porTipo, duplicados } = useMemo(() => {
    const grupos = new Map<TipoFondo, FondoSitio[]>()
    for (const fondo of fondos ?? []) {
      const tipo = normalizarTipoFondo(fondo.tipo)
      grupos.set(tipo, [...(grupos.get(tipo) ?? []), fondo])
    }
    const representantes = new Map<TipoFondo, FondoSitio>()
    const sobrantes: FondoSitio[] = []
    for (const [tipo, lista] of grupos) {
      const elegido = lista.find((f) => f.activo) ?? lista[lista.length - 1]
      representantes.set(tipo, elegido)
      sobrantes.push(...lista.filter((f) => f.id !== elegido.id))
    }
    return { porTipo: representantes, duplicados: sobrantes }
  }, [fondos])

  const existente = ajustando ? porTipo.get(ajustando) : undefined
  const actualizar = useActualizarFondoSitio(existente?.id ?? '')

  // Publica el fondo en curso al lienzo; el slider lo hace con un retraso corto.
  useEffect(() => {
    if (!ajustando) return
    const publicar = () =>
      setFondoEnEdicion(fondoDeBorrador(ajustando, existente, borrador))
    if (!cambioDeSlider.current) {
      publicar()
      return
    }
    const temporizador = setTimeout(publicar, RETRASO_SLIDER_MS)
    return () => clearTimeout(temporizador)
  }, [ajustando, existente, borrador, setFondoEnEdicion])

  // Cambiar de plugin desmonta el panel: el ajuste sin guardar se descarta.
  useEffect(() => () => setFondoEnEdicion(null), [setFondoEnEdicion])

  const cerrarAjuste = () => {
    cambioDeSlider.current = false
    setAjustando(null)
    setFondoEnEdicion(null)
  }

  // Crear + activar se encadenan con `mutateAsync`: no dependen de que el
  // componente siga montado. Los errores ya los notifica `query-client` (toast).
  const manejarActivar = async (tipo: TipoFondo) => {
    const guardado = porTipo.get(tipo)
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

  const manejarAjustar = (tipo: TipoFondo) => {
    if (ajustando === tipo) {
      cerrarAjuste()
      return
    }
    cambioDeSlider.current = false
    setBorrador({
      ...CONFIGURACION_FONDO_DEFAULT,
      ...porTipo.get(tipo)?.configuracion,
    })
    setAjustando(tipo)
  }

  const cambiar = (parcial: Partial<Configuracion>, desdeSlider = false) => {
    cambioDeSlider.current = desdeSlider
    setBorrador((actual) => ({ ...actual, ...parcial }))
  }

  const manejarGuardar = async () => {
    if (!ajustando) return
    try {
      if (existente) {
        await actualizar.mutateAsync({ configuracion: borrador })
        cerrarAjuste()
        return
      }
      const nuevo = await crear.mutateAsync({ tipo: ajustando, configuracion: borrador })
      cerrarAjuste()
      await activar.mutateAsync(nuevo.id)
    } catch {
      // Ya notificado por el manejador global de mutaciones.
    }
  }

  const entradaAjuste = ajustando ? entradaCatalogo(ajustando) : null
  const guardando = crear.isPending || actualizar.isPending

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
            ajustando={ajustando === entrada.tipo}
            ocupado={activar.isPending || crear.isPending}
            onActivar={() => manejarActivar(entrada.tipo)}
            onAjustar={() => manejarAjustar(entrada.tipo)}
          />
        ))}
      </ul>

      {ajustando && entradaAjuste ? (
        <section
          aria-label={`Ajustes de ${entradaAjuste.nombre}`}
          className="grid gap-3 rounded-lg border p-3"
        >
          <h4 className="text-sm font-semibold">Ajustar: {entradaAjuste.nombre}</h4>

          <div
            data-testid="vista-previa-fondo"
            style={estiloTema}
            className="relative aspect-video overflow-hidden rounded-md border"
          >
            <FondoAnimado
              fondo={fondoDeBorrador(ajustando, existente, borrador)}
              modo="sitio"
              ambito="caja"
            />
            <div className="relative z-10 grid gap-1 p-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
                Vista previa
              </p>
              <p className="text-xs" style={{ color: 'var(--color-texto)', opacity: 0.7 }}>
                {entradaAjuste.interactivo
                  ? 'Mueve el cursor sobre este recuadro.'
                  : 'Este fondo no reacciona al cursor.'}
              </p>
            </div>
          </div>

          <ControlSegmentado
            etiqueta="Velocidad"
            opciones={OPCIONES_VELOCIDAD}
            valor={borrador.velocidad}
            onChange={(velocidad) => cambiar({ velocidad })}
          />

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              {/* Sin `htmlFor`: la raíz del Slider no es enfocable; el thumb lleva `aria-label`. */}
              <Label className="text-xs">Opacidad</Label>
              <span aria-hidden="true">{Math.round(borrador.opacidad * 100)} %</span>
            </div>
            <Slider
              aria-label="Opacidad"
              min={0}
              max={100}
              step={5}
              value={[Math.round(borrador.opacidad * 100)]}
              onValueChange={([valor]) => cambiar({ opacidad: valor / 100 }, true)}
            />
          </div>

          <ControlSegmentado
            etiqueta="Intensidad"
            opciones={OPCIONES_INTENSIDAD}
            valor={borrador.intensidad ?? 'media'}
            onChange={(intensidad) => cambiar({ intensidad })}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="grid gap-0.5">
              <Label htmlFor="fondo-interactivo" className="text-xs">
                Interactivo
              </Label>
              <span className="text-xs text-muted-foreground">
                {entradaAjuste.interactivo
                  ? 'Reacciona al cursor o al scroll.'
                  : 'Este fondo es solo animación.'}
              </span>
            </div>
            <Switch
              id="fondo-interactivo"
              checked={borrador.interactivo ?? true}
              disabled={!entradaAjuste.interactivo}
              onCheckedChange={(interactivo) => cambiar({ interactivo })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={cerrarAjuste}>
              Cancelar
            </Button>
            <Button size="sm" disabled={guardando} onClick={manejarGuardar}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </section>
      ) : null}

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
  ajustando: boolean
  ocupado: boolean
  onActivar: () => void
  onAjustar: () => void
}

function TarjetaFondo({
  entrada,
  guardado,
  estiloTema,
  ajustando,
  ocupado,
  onActivar,
  onAjustar,
}: TarjetaFondoProps) {
  const activo = guardado?.activo ?? false
  const configuracion = guardado?.configuracion ?? CONFIGURACION_FONDO_DEFAULT
  return (
    <li
      data-testid={`tarjeta-fondo-${entrada.tipo}`}
      className={cn(
        'tarjeta-fondo grid content-start gap-2 rounded-lg border p-2',
        activo && 'border-primary ring-1 ring-primary',
      )}
    >
      <div
        style={estiloTema}
        className="relative aspect-[16/10] overflow-hidden rounded-md border"
      >
        <FondoAnimado
          fondo={{ tipo: entrada.tipo, configuracion }}
          modo="miniatura"
        />
      </div>
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
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
        </div>
        <p className="text-xs text-muted-foreground">{entrada.descripcion}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          className="min-w-[5.5rem] flex-1"
          disabled={activo || ocupado}
          onClick={onActivar}
        >
          Activar
        </Button>
        <Button
          size="sm"
          variant={ajustando ? 'secondary' : 'outline'}
          className="min-w-[5.5rem] flex-1"
          disabled={entrada.tipo === 'solido'}
          aria-pressed={ajustando}
          onClick={onAjustar}
        >
          Ajustar
        </Button>
      </div>
    </li>
  )
}
