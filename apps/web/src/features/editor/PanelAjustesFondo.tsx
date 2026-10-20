import { useEffect, useMemo, useRef, useState } from 'react'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  CONFIGURACION_FONDO_DEFAULT,
  entradaCatalogo,
  type TipoFondo,
} from '@/features/fondo-sitio/catalogo-fondos'
import { agruparFondosPorTipo, fondoDeBorrador } from '@/features/fondo-sitio/agrupar-fondos'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import {
  useActualizarFondoSitio,
  useFondosSitio,
} from '@/features/fondo-sitio/useFondosSitio'
import { useTemas } from '@/features/tema/useTemas'
import { temaComoVariablesCss } from '@/lib/tema-css'
import type { ModoTema } from '@/lib/tema-oscuro'
import { cn } from '@/lib/utils'
import { useEditorPanelStore } from '@/store/editor-panel-store'

type Configuracion = FondoSitio['configuracion']
type EstadoGuardado = 'inactivo' | 'guardando' | 'guardado' | 'error'

/** Retraso (ms) con que el slider publica el fondo en curso al lienzo: evita repintar el iframe en cada paso del arrastre. */
export const RETRASO_SLIDER_MS = 120

/** Espera (ms) sin cambios antes de persistir los ajustes con PATCH (Fase 7l, UC-15). */
export const RETRASO_GUARDADO_MS = 500

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

const TEXTO_ESTADO: Record<Exclude<EstadoGuardado, 'inactivo'>, string> = {
  guardando: 'Guardando…',
  guardado: 'Guardado',
  error: 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.',
}

/**
 * Ajustes del fondo elegido en la galería (Fase 7l, UC-15). Se renderiza en el
 * panel derecho de Puck (`CamposBloque` de `LienzoPuck`) cuando el plugin
 * activo es `fondo`, hay `fondoSeleccionado` en `editor-panel-store` y no hay
 * un bloque seleccionado. Sin "Guardar"/"Cancelar": cada cambio se publica al
 * lienzo (`fondoEnEdicion`; el slider con `RETRASO_SLIDER_MS`) y se persiste
 * solo con un PATCH con debounce de `RETRASO_GUARDADO_MS`. Si el panel se
 * desmonta con un cambio pendiente (otro plugin, otro tipo, un bloque), se
 * guarda al instante para no perderlo.
 */
export function PanelAjustesFondo() {
  const tipo = useEditorPanelStore((state) => state.fondoSeleccionado)
  if (!tipo) return null
  // `key`: cada tipo arranca con su propio borrador y sus propios temporizadores.
  return <AjustesDeFondo key={tipo} tipo={tipo} />
}

function AjustesDeFondo({ tipo }: { tipo: TipoFondo }) {
  const { data: fondos } = useFondosSitio()
  const { data: temas } = useTemas()
  const { theme } = useTheme()
  const modoVistaPrevia = useEditorPanelStore((state) => state.modoVistaPrevia)
  const setFondoEnEdicion = useEditorPanelStore((state) => state.setFondoEnEdicion)

  const entrada = entradaCatalogo(tipo)
  const existente = useMemo(
    () => agruparFondosPorTipo(fondos).porTipo.get(tipo),
    [fondos, tipo],
  )
  const actualizar = useActualizarFondoSitio(existente?.id ?? '', { silencioso: true })

  const [borrador, setBorrador] = useState<Configuracion>(() => ({
    ...CONFIGURACION_FONDO_DEFAULT,
    ...existente?.configuracion,
  }))
  const [estado, setEstado] = useState<EstadoGuardado>('inactivo')
  // Hay un cambio del usuario aún no confirmado por el servidor.
  const sucio = useRef(false)
  // Si el último cambio vino del slider se retrasa la publicación al lienzo.
  const cambioDeSlider = useRef(false)

  // Marco con las variables del tema activo, igual que el lienzo (`PuckRoot`).
  const modo: ModoTema = modoVistaPrevia ?? (theme === 'dark' ? 'oscuro' : 'claro')
  const temaActivo = temas?.find((t) => t.activo)
  const estiloTema = temaActivo ? temaComoVariablesCss(temaActivo, modo) : undefined

  // El fondo puede llegar después de montar (consulta en curso): se adopta
  // mientras el usuario no haya tocado nada.
  const idExistente = existente?.id
  useEffect(() => {
    if (sucio.current || !existente) return
    setBorrador({ ...CONFIGURACION_FONDO_DEFAULT, ...existente.configuracion })
  }, [existente])

  // Publica el cambio al lienzo (sin cambios del usuario no toca el store: la
  // tarjeta ya publicó la configuración guardada y así el fondo no parpadea).
  useEffect(() => {
    if (!sucio.current) return
    const publicar = () => setFondoEnEdicion(fondoDeBorrador(tipo, existente, borrador))
    if (!cambioDeSlider.current) {
      publicar()
      return
    }
    const temporizador = setTimeout(publicar, RETRASO_SLIDER_MS)
    return () => clearTimeout(temporizador)
  }, [tipo, existente, borrador, setFondoEnEdicion])

  const guardar = async () => {
    if (!existente) return
    const enviado = borrador
    setEstado('guardando')
    try {
      await actualizar.mutateAsync({ configuracion: enviado })
      // Si llegó otro cambio mientras viajaba el PATCH, sigue pendiente.
      if (enviado === ultimoBorrador.current) {
        sucio.current = false
        setEstado('guardado')
      }
    } catch {
      // El toast global ya avisó; aquí solo el indicador.
      setEstado('error')
    }
  }
  const guardarRef = useRef(guardar)
  const ultimoBorrador = useRef(borrador)
  useEffect(() => {
    guardarRef.current = guardar
    ultimoBorrador.current = borrador
  })

  // Debounce del PATCH.
  useEffect(() => {
    if (!sucio.current || !idExistente) return
    const temporizador = setTimeout(() => void guardarRef.current(), RETRASO_GUARDADO_MS)
    return () => clearTimeout(temporizador)
  }, [borrador, idExistente])

  // Al desmontar con un cambio pendiente se guarda ya (otro plugin, otro bloque).
  useEffect(
    () => () => {
      if (sucio.current) void guardarRef.current()
    },
    [],
  )

  const cambiar = (parcial: Partial<Configuracion>, desdeSlider = false) => {
    cambioDeSlider.current = desdeSlider
    sucio.current = true
    setEstado('guardando')
    setBorrador((actual) => ({ ...actual, ...parcial }))
  }

  if (tipo === 'solido') {
    return (
      <section aria-label={`Ajustes de ${entrada.nombre}`} className="grid gap-2 p-4">
        <h3 className="text-sm font-semibold">Ajustes del fondo: {entrada.nombre}</h3>
        <p className="text-sm text-muted-foreground">
          El fondo sólido toma el color del tema y no tiene nada que ajustar.
        </p>
      </section>
    )
  }

  return (
    <section aria-label={`Ajustes de ${entrada.nombre}`} className="grid gap-3 p-4">
      <h3 className="text-sm font-semibold">Ajustes del fondo: {entrada.nombre}</h3>

      <div
        data-testid="vista-previa-fondo"
        style={estiloTema}
        className="relative aspect-video overflow-hidden rounded-md border"
      >
        <FondoAnimado
          fondo={fondoDeBorrador(tipo, existente, borrador)}
          modo="sitio"
          ambito="caja"
        />
        <div className="relative z-10 grid gap-1 p-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
            Vista previa
          </p>
          <p className="text-xs" style={{ color: 'var(--color-texto)', opacity: 0.7 }}>
            {entrada.interactivo
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
            {entrada.interactivo
              ? 'Reacciona al cursor o al scroll.'
              : 'Este fondo es solo animación.'}
          </span>
        </div>
        <Switch
          id="fondo-interactivo"
          checked={borrador.interactivo ?? true}
          disabled={!entrada.interactivo}
          onCheckedChange={(interactivo) => cambiar({ interactivo })}
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          'min-h-4 text-xs',
          estado === 'error' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {estado === 'inactivo' ? '' : TEXTO_ESTADO[estado]}
      </p>
    </section>
  )
}
