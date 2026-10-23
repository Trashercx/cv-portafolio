import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { m, useScroll, useSpring } from 'motion/react'
import { Download, Menu, X } from 'lucide-react'
import type { PerfilPublico } from '@/features/publico/types'
import type { NavegacionConfiguracion } from '@/features/secciones/types'
import { API_BASE_URL } from '@/lib/api-client'
import { useAnimacionesActivas } from '@/lib/animaciones'
import { registrarEvento } from '@/lib/analitica'
import type { EnlaceNavegacion } from '@/lib/navegacion'
import {
  BORDE_BLOQUE_VARIABLES,
  CLASES_BORDE_BLOQUE,
  CLASES_BORDE_INFERIOR_BLOQUE,
} from '@/lib/escalas-bloque'
import { cn } from '@/lib/utils'
import { EnlaceBloque, useModoRenderizado } from '../contexto-renderizado'
import { ToggleModoTema } from '../ToggleModoTema'

type BloqueNavegacionProps = {
  config: NavegacionConfiguracion
  /**
   * Enlaces ya generados (`generarEnlacesNavegacion`): en el sitio público
   * salen de `snapshot.secciones` y en el lienzo del editor del `content`
   * actual de Puck (espejo en `useEditorSeccionesStore`).
   */
  enlaces: EnlaceNavegacion[]
  /** Nombre (`mostrar_nombre`) y CV (`mostrar_cv`) salen del perfil. */
  perfil: PerfilPublico | null
  /**
   * `true` en la vista previa del panel (`DialogVistaPrevia`): la barra no
   * puede ser `fixed` (se pegaría al viewport del panel), así que `fijo` se
   * resuelve como `sticky` dentro del contenedor con scroll, igual que en el
   * lienzo del editor.
   */
  enFlujo?: boolean
  /** Sección oculta (`visible=false`): la barra se ve atenuada (sin `div` envolvente que anule el sticky). */
  atenuado?: boolean
}

type Estilo = NonNullable<NavegacionConfiguracion['estilo']>

/**
 * Fase 7 (7.3, UC-12): clases por modo de posición. `fixed` solo en el sitio
 * público; el lienzo del editor y la vista previa usan `sticky top-0` para
 * que la barra siga siendo seleccionable y no escape de su contenedor. En el
 * lienzo de Puck el `sticky` no llega a pegarse (ver `NavegacionEnLienzo`).
 */
const POSICION_CLASE = {
  fixed: 'fixed inset-x-0 top-0 z-40',
  sticky: 'sticky top-0 z-40',
  relativa: 'relative z-40',
} as const

/** Contenedor externo por `estilo`: píldora flotante centrada o barra de ancho completo con borde inferior. */
const CONTENEDOR_ESTILO_CLASE: Record<Estilo, string> = {
  flotante: 'pointer-events-none px-3 pt-3',
  // Fase 7c (UC-12): contorno con las variables del bloque (`borde_bloque`).
  barra: `${CLASES_BORDE_INFERIOR_BLOQUE} bg-background/80 backdrop-blur`,
}

const INTERIOR_ESTILO_CLASE: Record<Estilo, string> = {
  flotante:
    `pointer-events-auto mx-auto w-fit max-w-full rounded-full ${CLASES_BORDE_BLOQUE} bg-card/60 px-3 shadow-lg backdrop-blur`,
  barra: 'mx-auto max-w-7xl px-4 sm:px-6',
}

const PANEL_MOVIL_ESTILO_CLASE: Record<Estilo, string> = {
  flotante:
    `pointer-events-auto mx-auto mt-2 w-full max-w-sm rounded-2xl ${CLASES_BORDE_BLOQUE} bg-card/90 p-2 shadow-lg backdrop-blur`,
  barra: 'mx-auto max-w-7xl px-4 pb-3 sm:px-6',
}

const ENLACE_BASE_CLASE =
  'block rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent'
const ENLACE_ACTIVO_CLASE = 'bg-[var(--color-primario)]/15 font-semibold'

/**
 * Sección actualmente "en pantalla": `IntersectionObserver` sobre las anclas
 * de los enlaces (slugs, Fase 7n) con una banda de detección en el centro del viewport. Solo
 * en el sitio público (en el lienzo el observador del documento padre no
 * correspondería al scroll del iframe).
 */
function useSeccionActiva(anclas: string[], habilitado: boolean): string | null {
  const [activo, setActivo] = useState<string | null>(null)
  const clave = anclas.join('|')

  useEffect(() => {
    if (!habilitado || clave === '' || typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setActivo(entrada.target.id)
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    for (const ancla of clave.split('|')) {
      const elemento = document.getElementById(ancla)
      if (elemento) observador.observe(elemento)
    }
    return () => observador.disconnect()
  }, [clave, habilitado])

  return activo
}

/**
 * Activa `scroll-behavior: smooth` en el `<html>` mientras la navegación está
 * montada en el sitio público (clase `scroll-suave`, `index.css`, que ya se
 * apaga con `prefers-reduced-motion`).
 */
function useScrollSuave(habilitado: boolean) {
  useEffect(() => {
    if (!habilitado) return
    const html = document.documentElement
    html.classList.add('scroll-suave')
    return () => html.classList.remove('scroll-suave')
  }, [habilitado])
}

/**
 * Barra de progreso de lectura de 2 px (`mostrar_progreso_scroll`), con
 * `scaleX` según el scroll del documento y `--color-primario`. En el lienzo y
 * en la vista previa el scroll es de otro documento/contenedor, así que se
 * dibuja una muestra estática de un tercio del ancho.
 */
function BarraProgreso({ estatica }: { estatica: boolean }) {
  const animaciones = useAnimacionesActivas()
  const { scrollYProgress } = useScroll()
  const suavizado = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  if (estatica) {
    return (
      <div
        data-progreso-scroll="estatico"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5"
      >
        <div className="h-full w-1/3" style={{ backgroundColor: 'var(--color-primario)' }} />
      </div>
    )
  }

  return (
    <m.div
      data-progreso-scroll="vivo"
      aria-hidden="true"
      style={{
        scaleX: animaciones ? suavizado : scrollYProgress,
        backgroundColor: 'var(--color-primario)',
      }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left"
    />
  )
}

/**
 * Bloque `navegacion` (Fase 7, 7.2/7.3, UC-07 y UC-12): enlaces a las
 * secciones (generados, no configurados) con la sección activa resaltada
 * (`aria-current="location"`), nombre del perfil, botón del CV, toggle de modo
 * claro/oscuro y barra de progreso opcionales. Estilo `flotante` (píldora
 * centrada con vidrio) o `barra`; `fijo` → `position: fixed` en el sitio
 * público. Menú compacto bajo `lg` (1024 px): con 6-8 enlaces el menú
 * horizontal no cabe en tablet, así que el desplegable cubre móvil y tablet.
 * No usa `EnvoltorioSeccion`: su posición no depende de espaciado, ancho,
 * fondo ni animación de entrada (un ancestro con `transform` rompería el
 * `fixed`).
 */
export function BloqueNavegacion({
  config,
  enlaces,
  perfil,
  enFlujo = false,
  atenuado = false,
}: BloqueNavegacionProps) {
  const modo = useModoRenderizado()
  const esEditor = modo === 'editor'
  const estilo: Estilo = config.estilo ?? 'flotante'
  const fijo = config.fijo ?? true
  const mostrarNombre = config.mostrar_nombre ?? true
  const mostrarCv = config.mostrar_cv ?? true
  const mostrarToggle = config.mostrar_toggle_modo ?? true
  const mostrarProgreso = config.mostrar_progreso_scroll ?? false
  const [abierto, setAbierto] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const botonMenuRef = useRef<HTMLButtonElement>(null)
  const publico = !esEditor && !enFlujo
  const activo = useSeccionActiva(
    enlaces.map((enlace) => enlace.ancla),
    publico,
  )
  useScrollSuave(publico)

  // Menú compacto accesible (Fase 7, UC-12): Escape cierra y devuelve el foco
  // al botón; un clic (o toque) fuera de la barra también lo cierra.
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return
      setAbierto(false)
      botonMenuRef.current?.focus()
    }
    const alPulsar = (evento: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('pointerdown', alPulsar)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('pointerdown', alPulsar)
    }
  }, [abierto])

  // Lienzo: siempre sticky (seleccionable); vista previa: sticky si es fijo.
  const posicion = esEditor ? 'sticky' : !fijo ? 'relativa' : enFlujo ? 'sticky' : 'fixed'
  const tieneCv = mostrarCv && Boolean(perfil?.cv_media)
  const idMenuMovil = 'menu-navegacion-movil'

  const listaEnlaces = (clase: string, alCerrar?: () => void) => (
    <ul className={clase}>
      {enlaces.map((enlace) => (
        <li key={enlace.id}>
          <EnlaceBloque
            href={`#${enlace.ancla}`}
            aria-current={activo === enlace.ancla ? 'location' : undefined}
            onClick={alCerrar}
            className={cn(ENLACE_BASE_CLASE, activo === enlace.ancla && ENLACE_ACTIVO_CLASE)}
          >
            {enlace.titulo}
          </EnlaceBloque>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {mostrarProgreso ? <BarraProgreso estatica={!publico} /> : null}
      <nav
        ref={navRef}
        aria-label="Navegación principal"
        data-estilo-navegacion={estilo}
        data-posicion={posicion}
        // Fase 7c (UC-12): la barra va fuera de `EnvoltorioSeccion`, así que fija ella misma las variables del contorno.
        style={BORDE_BLOQUE_VARIABLES[config.borde_bloque ?? 'sutil'] as CSSProperties}
        className={cn(
          POSICION_CLASE[posicion],
          CONTENEDOR_ESTILO_CLASE[estilo],
          atenuado && 'opacity-40',
        )}
      >
        <div className={cn('flex h-12 items-center gap-2', INTERIOR_ESTILO_CLASE[estilo])}>
          {mostrarNombre && perfil ? (
            <EnlaceBloque
              href="#top"
              className="max-w-[10rem] truncate px-2 text-sm font-semibold sm:max-w-[14rem]"
            >
              {perfil.nombre_completo}
            </EnlaceBloque>
          ) : null}
          {enlaces.length > 0
            ? listaEnlaces('ml-2 hidden items-center gap-1 lg:flex')
            : null}
          <div className="ml-auto flex items-center gap-2">
            {tieneCv ? (
              <EnlaceBloque
                href={`${API_BASE_URL}/cv`}
                // Fase 8 (UC-27): `descargar_cv`.
                onClick={() => registrarEvento('descargar_cv')}
                aria-label="Descargar CV"
                style={{ backgroundColor: 'var(--color-primario)' }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white"
              >
                <Download className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">CV</span>
              </EnlaceBloque>
            ) : null}
            {mostrarToggle ? (
              // En el lienzo el toggle es solo una muestra: cambiar el modo
              // del sitio público desde el editor no tiene sentido.
              <div className={esEditor ? 'pointer-events-none' : undefined}>
                <ToggleModoTema etiquetaAbajo />
              </div>
            ) : null}
            {enlaces.length > 0 ? (
              <button
                ref={botonMenuRef}
                type="button"
                aria-expanded={abierto}
                aria-controls={idMenuMovil}
                aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
                onClick={() => setAbierto((actual) => !actual)}
                className={cn('inline-flex size-9 items-center justify-center rounded-full hover:bg-accent lg:hidden', CLASES_BORDE_BLOQUE)}
              >
                {abierto ? (
                  <X className="size-4" aria-hidden="true" />
                ) : (
                  <Menu className="size-4" aria-hidden="true" />
                )}
              </button>
            ) : null}
          </div>
        </div>
        {abierto && enlaces.length > 0 ? (
          <div id={idMenuMovil} className={cn('lg:hidden', PANEL_MOVIL_ESTILO_CLASE[estilo])}>
            {listaEnlaces('grid gap-1', () => setAbierto(false))}
          </div>
        ) : null}
      </nav>
    </>
  )
}
