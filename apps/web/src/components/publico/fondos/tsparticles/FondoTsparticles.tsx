import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Container } from '@tsparticles/engine'
import { CapaFondo } from '../CapaFondo'
import {
  analizarColor,
  leerColoresTema,
  oscurecerColor,
  type PropsFondoVisual,
} from '../utilidades'
import { motorParticulasListo } from './MotorParticulas'
import type {
  CapaParticulas,
  ColoresParticulas,
  ConstructorCapas,
  OpcionesParticulas,
} from './tipos'

/** Intensidad → factor de cantidad de partículas (contrato 7c: sutil 50 %, media 100 %, alta 160 %). */
const FACTOR_CANTIDAD = { sutil: 0.5, media: 1, alta: 1.6 } as const

/** Fracción de partículas en miniatura (contrato 7c: 40 %). */
const FACTOR_MINIATURA = 0.4

const RITMO = { lenta: 0.6, media: 1, rapida: 1.8 } as const

/** Ventana de referencia (px²) a partir de la cual la cantidad base se considera completa. */
const AREA_REFERENCIA = 1440 * 900

const DPR_MAXIMO = 1.5

/** Los canvas no entienden `var()`; `rgb()` es lo que tsparticles siempre interpreta. */
function aColorParticulas(color: string): string {
  const rgb = analizarColor(color)
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : color
}

function normalizarColores(el: Element): ColoresParticulas {
  const base = leerColoresTema(el)
  // Fondo claro (QA Fase 7b): los tonos pálidos se pierden; se oscurecen.
  const ajustar = (c: string) => aColorParticulas(base.claro ? oscurecerColor(c, 0.25) : c)
  return {
    primario: ajustar(base.primario),
    secundario: ajustar(base.secundario),
    fondo: aColorParticulas(base.fondo),
    claro: base.claro,
  }
}

type PropsFondoTsparticles = PropsFondoVisual & {
  /** Construye las capas a partir de los colores y la escala; debe ser una función estable (de módulo). */
  capas: ConstructorCapas
}

/** Congela una capa para `prefers-reduced-motion`: partículas quietas, sin parpadeo ni vida finita. */
function congelar(capa: CapaParticulas): Record<string, unknown> {
  const resto = { ...capa.particulas }
  delete resto.life
  return {
    ...resto,
    move: { ...(resto.move as object), enable: false },
    opacity: { ...(resto.opacity as object), animation: { enable: false } },
    size: { ...(resto.size as object), animation: { enable: false } },
    rotate: { ...(resto.rotate as object), animation: { enable: false } },
  }
}

/**
 * Componente común de los fondos con tsparticles (Fase 7c, UC-15). Recibe un
 * constructor de capas y se ocupa de todo lo transversal: motor compartido
 * (`loadSlim` una sola vez por página, ver `MotorParticulas`),
 * `fpsLimit` por modo (60/30/20), pausa fuera de pantalla y con pestaña oculta,
 * DPR ≤ 1,5 (`detectRetina` solo si el dispositivo no lo supera), colores del
 * tema resueltos con `getComputedStyle`, cantidad escalada por intensidad,
 * modo y área, puntero solo con `interactivo` (modo `sitio`, sin
 * `(hover: none)`) y movimiento reducido (partículas quietas tras el primer
 * cuadro). Las opciones se memorizan: el efecto recrea los contenedores si
 * el objeto cambia de identidad (`tsParticles.load` directo sobre el
 * elemento real, válido también dentro del iframe del lienzo de Puck).
 */
export function FondoTsparticles({
  velocidad,
  intensidad,
  interactivo,
  estatico,
  maxFps,
  ambito,
  modo,
  capas,
}: PropsFondoTsparticles) {
  const raiz = useRef<HTMLDivElement>(null)
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [colores, setColores] = useState<ColoresParticulas | null>(null)
  const [areaVentana, setAreaVentana] = useState(AREA_REFERENCIA)

  // Colores del tema: se leen al montar y cuando cambia la `class`/`style` de algún ancestro (modo oscuro, otro tema).
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const leer = () => setColores(normalizarColores(el))
    leer()
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) setAreaVentana(rect.width * rect.height)
    let pendiente = false
    const observador = new MutationObserver(() => {
      if (pendiente) return
      pendiente = true
      queueMicrotask(() => {
        pendiente = false
        leer()
      })
    })
    for (let nodo: Element | null = el; nodo; nodo = nodo.parentElement) {
      observador.observe(nodo, { attributes: true, attributeFilter: ['class', 'style'] })
    }
    return () => observador.disconnect()
  }, [])

  const miniatura = modo === 'miniatura'
  // `interactivo` ya solo es true en modo `sitio` (FondoAnimado); la miniatura nunca lleva puntero.
  const puntero = interactivo && !miniatura && !estatico

  const listaOpciones = useMemo<OpcionesParticulas[]>(() => {
    if (!colores) return []
    const sinHover = window.matchMedia?.('(hover: none)').matches ?? false
    const conPuntero = puntero && !sinHover
    const factorArea =
      ambito === 'pagina' ? Math.min(1.3, Math.max(0.5, areaVentana / AREA_REFERENCIA)) : 1
    const factor =
      (FACTOR_CANTIDAD[intensidad] ?? 1) * (miniatura ? FACTOR_MINIATURA : 1) * factorArea
    const dprBajo = (window.devicePixelRatio || 1) <= DPR_MAXIMO

    const construidas = capas({
      colores,
      cantidad: (base) => Math.max(1, Math.round(base * factor)),
      ritmo: RITMO[velocidad] ?? 1,
      miniatura,
    })

    return construidas.map((capa) => {
      const opciones: Record<string, unknown> = {
        fullScreen: { enable: false },
        fpsLimit: maxFps,
        pauseOnBlur: true,
        pauseOnOutsideViewport: true,
        detectRetina: dprBajo && !miniatura,
        particles: estatico ? congelar(capa) : capa.particulas,
      }
      if (conPuntero && capa.interactividad) {
        opciones.interactivity = {
          detectsOn: 'window',
          events: { onHover: { enable: true, mode: capa.interactividad.modo } },
          modes: { [capa.interactividad.modo]: capa.interactividad.modos },
        }
      }
      return opciones as OpcionesParticulas
    })
  }, [colores, puntero, ambito, areaVentana, intensidad, miniatura, capas, velocidad, estatico, maxFps])

  // Carga cada capa con el motor directamente sobre un `<canvas>` propio dentro de la capa (nada de ids ni
  // `document` global: el lienzo de Puck vive en un iframe y `getElementById` del admin no lo vería).
  useEffect(() => {
    const capa = raiz.current
    if (!capa || listaOpciones.length === 0) return
    let cancelado = false
    const contenedores: Container[] = []
    // El canvas se crea con el `document` global a propósito: el motor comprueba `instanceof HTMLElement`
    // contra la ventana principal, y un elemento nacido en el iframe del editor no lo cumpliría. Un nodo
    // creado aquí y añadido a la capa del iframe se adopta solo y se dibuja con normalidad.
    const lienzos = listaOpciones.map((_, i) => {
      const lienzo = document.createElement('canvas')
      lienzo.id = `tsp-${idBase}-${i}`
      lienzo.className = 'absolute inset-0 size-full'
      capa.appendChild(lienzo)
      return lienzo
    })

    void motorParticulasListo()
      .then(async (motor) => {
        for (const [i, opciones] of listaOpciones.entries()) {
          if (cancelado) return
          const contenedor = await motor.load({ element: lienzos[i], options: opciones })
          if (!contenedor) continue
          if (cancelado) contenedor.destroy()
          else contenedores.push(contenedor)
        }
      })
      .catch(() => {
        // Sin motor no se pinta nada: queda el `--color-fondo` de la capa.
      })

    return () => {
      cancelado = true
      for (const contenedor of contenedores) contenedor.destroy()
      for (const lienzo of lienzos) lienzo.remove()
    }
  }, [listaOpciones, idBase])

  return <CapaFondo ambito={ambito} capaRef={raiz}>{null}</CapaFondo>
}
