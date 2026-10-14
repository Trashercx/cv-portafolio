import { useEffect, useRef } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import { CapaFondo } from '../CapaFondo'
import { usePunteroRelativo } from '../hooks/usePunteroRelativo'
import {
  analizarColor,
  factorIntensidad,
  leerColoresTema,
  ritmo,
  type PropsFondoVisual,
} from '../utilidades'
import { VERTICE_PANTALLA } from './shaders/comun.glsl'

/** Tope de la densidad de píxeles (misma regla que los canvas 2D de la Fase 7b). */
const DPR_MAXIMO = 1.5

/** Instante del reloj del shader con movimiento reducido: un cuadro estático con forma interesante. */
const TIEMPO_ESTATICO = 4

type PropsLienzoShader = PropsFondoVisual & {
  /** Fragment shader completo (cabecera + cuerpo), GLSL ES 1.0. */
  fragmento: string
}

/** `rgb()`/`#hex` → `[r, g, b]` en 0–1 para un `uniform vec3`. */
function aVec3(color: string): [number, number, number] {
  const rgb = analizarColor(color)
  return rgb ? [rgb.r / 255, rgb.g / 255, rgb.b / 255] : [0.5, 0.5, 0.5]
}

/**
 * Lienzo WebGL común a los fondos con shader (Fase 7c, UC-15), basado en
 * `ogl`: un triángulo a pantalla completa con el fragment shader recibido y
 * estos `uniform`: `uTime` (segundos escalados por `velocidad`), `uResolution`
 * (píxeles del buffer), `uColorA/B/C` (primario, secundario y fondo del tema
 * como `vec3`), `uIntensidad` (0,6 / 1 / 1,45), `uPuntero` (0–1, suavizado) y
 * `uClaro`. Resolución: DPR ≤ 1,5; 1 en miniatura; la mitad con `(hover:
 * none)` (móvil). Bucle propio (`useBucleCanvas` solo sirve para contextos
 * 2D): rAF con tope de fps por modo, pausa con la pestaña oculta y fuera de
 * pantalla, relectura de los colores si cambia el tema/modo oscuro. Con
 * movimiento reducido, un único render con tiempo fijo. Al desmontar se
 * libera el contexto con `WEBGL_lose_context`; sin WebGL no pinta nada (queda
 * el `--color-fondo` del contenedor).
 */
export function LienzoShader({
  fragmento,
  velocidad,
  intensidad,
  interactivo,
  estatico,
  maxFps,
  ambito,
  modo,
}: PropsLienzoShader) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const puntero = useRef<{ x: number; y: number } | null>(null)

  usePunteroRelativo(canvas, interactivo, (p) => {
    // El origen del shader está abajo a la izquierda.
    puntero.current = p ? { x: p.x, y: 1 - p.y } : null
  })

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const doc = el.ownerDocument
    const ventana = doc.defaultView ?? window
    const miniatura = modo === 'miniatura'

    let renderer: Renderer | null = null
    try {
      renderer = new Renderer({
        canvas: el,
        alpha: false,
        antialias: false,
        depth: false,
        webgl: 1,
        dpr: 1,
      })
    } catch {
      return
    }
    const gl = renderer.gl
    if (!gl) return

    const sinHover = ventana.matchMedia?.('(hover: none)').matches ?? false
    let dpr = miniatura ? 1 : Math.min(ventana.devicePixelRatio || 1, DPR_MAXIMO)
    if (sinHover) dpr = Math.min(dpr, 0.5)
    renderer.dpr = dpr

    const factor = factorIntensidad(intensidad)
    const velocidadTiempo = ritmo(velocidad)

    let colores = leerColoresTema(el)
    const programa = new Program(gl, {
      vertex: VERTICE_PANTALLA,
      fragment: fragmento,
      uniforms: {
        uTime: { value: estatico ? TIEMPO_ESTATICO : 0 },
        uResolution: { value: [1, 1] },
        uColorA: { value: aVec3(colores.primario) },
        uColorB: { value: aVec3(colores.secundario) },
        uColorC: { value: aVec3(colores.fondo) },
        uIntensidad: { value: factor },
        uPuntero: { value: [0.5, 0.5] },
        uClaro: { value: colores.claro ? 1 : 0 },
      },
    })
    const malla = new Mesh(gl, { geometry: new Triangle(gl), program: programa })

    let activo = true
    let cuadroId = 0
    let visible = true
    let tiempo = estatico ? TIEMPO_ESTATICO : 0
    let anterior = 0
    let ultimoDibujo = 0
    const intervalo = 1000 / Math.max(1, maxFps)
    const suave = { x: 0.5, y: 0.5 }

    const dibujar = (dt: number) => {
      if (!activo || !renderer) return
      tiempo += dt * velocidadTiempo
      const objetivo = puntero.current ?? { x: 0.5, y: 0.5 }
      const k = 1 - Math.exp(-5 * dt)
      suave.x += (objetivo.x - suave.x) * k
      suave.y += (objetivo.y - suave.y) * k
      programa.uniforms.uTime.value = tiempo
      programa.uniforms.uPuntero.value = [suave.x, suave.y]
      renderer.render({ scene: malla })
    }

    const redimensionar = () => {
      if (!renderer) return
      const rect = el.getBoundingClientRect()
      const ancho = Math.max(1, Math.round(rect.width))
      const alto = Math.max(1, Math.round(rect.height))
      renderer.setSize(ancho, alto)
      // `setSize` fija el estilo en píxeles; se devuelve al 100 % para que el contenedor mande.
      el.style.width = '100%'
      el.style.height = '100%'
      programa.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight]
      // `setSize` borra el buffer: se repinta de inmediato (también el primer cuadro, sin parpadeo en blanco).
      dibujar(0)
    }

    const paso = (ahora: number) => {
      cuadroId = ventana.requestAnimationFrame(paso)
      if (ahora - ultimoDibujo < intervalo - 1) return
      const dt = Math.min(0.1, (ahora - (anterior || ahora)) / 1000)
      anterior = ahora
      ultimoDibujo = ahora
      dibujar(dt)
    }

    const sincronizar = () => {
      const debeCorrer = !estatico && visible && !doc.hidden
      if (debeCorrer && !cuadroId) {
        anterior = 0
        cuadroId = ventana.requestAnimationFrame(paso)
      } else if (!debeCorrer && cuadroId) {
        ventana.cancelAnimationFrame(cuadroId)
        cuadroId = 0
      }
    }

    redimensionar()
    sincronizar()

    let ancho0 = Math.round(el.getBoundingClientRect().width)
    let alto0 = Math.round(el.getBoundingClientRect().height)
    const observadorTamano =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const rect = el.getBoundingClientRect()
            const ancho = Math.round(rect.width)
            const alto = Math.round(rect.height)
            if (ancho === ancho0 && alto === alto0) return
            ancho0 = ancho
            alto0 = alto
            redimensionar()
          })
        : null
    observadorTamano?.observe(el)

    const observadorVisibilidad =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entradas) => {
            visible = entradas.some((e) => e.isIntersecting) || entradas.length === 0
            sincronizar()
          })
        : null
    observadorVisibilidad?.observe(el)
    doc.addEventListener('visibilitychange', sincronizar)

    let relecturaPendiente = false
    const observadorTema = new MutationObserver(() => {
      if (relecturaPendiente) return
      relecturaPendiente = true
      queueMicrotask(() => {
        relecturaPendiente = false
        if (!activo) return
        colores = leerColoresTema(el)
        programa.uniforms.uColorA.value = aVec3(colores.primario)
        programa.uniforms.uColorB.value = aVec3(colores.secundario)
        programa.uniforms.uColorC.value = aVec3(colores.fondo)
        programa.uniforms.uClaro.value = colores.claro ? 1 : 0
        if (estatico) dibujar(0)
      })
    })
    for (let nodo: Element | null = el; nodo; nodo = nodo.parentElement) {
      observadorTema.observe(nodo, { attributes: true, attributeFilter: ['class', 'style'] })
    }

    return () => {
      activo = false
      if (cuadroId) ventana.cancelAnimationFrame(cuadroId)
      observadorTamano?.disconnect()
      observadorVisibilidad?.disconnect()
      observadorTema.disconnect()
      doc.removeEventListener('visibilitychange', sincronizar)
      // Libera la memoria de GPU y el contexto (el navegador limita los contextos WebGL vivos).
      renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [fragmento, velocidad, intensidad, estatico, maxFps, modo])

  return (
    <CapaFondo ambito={ambito}>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
    </CapaFondo>
  )
}
