import { useEffect, useRef, type RefObject } from 'react'
import { leerColoresTema, type ColoresFondo } from '../utilidades'

/** Tope de la densidad de píxeles del canvas (Fase 7b, UC-15): más allá no se nota y cuesta fill-rate. */
export const DPR_MAXIMO = 1.5

export type EstadoCuadro = {
  /** Ancho/alto en píxeles CSS (el contexto ya está escalado por el DPR). */
  ancho: number
  alto: number
  /** Segundos desde que arrancó el bucle. */
  t: number
  /** Segundos desde el cuadro anterior (acotado a 0,1 s para no "saltar" tras una pausa). */
  dt: number
  colores: ColoresFondo
}

export type OpcionesBucleCanvas = {
  /** `true`: dibuja un único fotograma y no registra `requestAnimationFrame`. */
  estatico: boolean
  /** Tope de fotogramas por segundo. */
  maxFps: number
  /** Cualquier cambio reinicia el estado (densidad, intensidad…): se vuelve a llamar a `preparar`. */
  clave: string
  /** Se llama al montar, al redimensionar y al cambiar `clave`. */
  preparar: (ancho: number, alto: number) => void
  dibujar: (ctx: CanvasRenderingContext2D, cuadro: EstadoCuadro) => void
}

/**
 * Bucle de dibujo de un `<canvas>` 2D (Fase 7b, UC-15): `requestAnimationFrame`
 * con tope de fps, pausa con `document.hidden` y cuando el canvas no
 * intersecta el viewport (`IntersectionObserver`), DPR limitado a
 * `DPR_MAXIMO`, redimensionado con `ResizeObserver` y limpieza completa al
 * desmontar (cancela el rAF, desconecta los observadores y quita los
 * listeners). Los colores del tema se resuelven una vez por montaje y se
 * releen cuando cambian la `class`/`style` de algún ancestro (modo oscuro,
 * tema distinto). Si el contexto 2D no existe (jsdom) no hace nada.
 */
export function useBucleCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  opciones: OpcionesBucleCanvas,
) {
  const { estatico, maxFps, clave } = opciones
  const referencia = useRef(opciones)
  useEffect(() => {
    referencia.current = opciones
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const doc = canvas.ownerDocument
    const ventana = doc.defaultView ?? window

    let ancho = 0
    let alto = 0
    let colores = leerColoresTema(canvas)
    let cuadroId = 0
    let visible = true
    let inicio = 0
    let anterior = 0
    let ultimoDibujo = 0
    const intervalo = 1000 / Math.max(1, maxFps)

    const dibujarCuadro = (ahora: number, dt: number) => {
      referencia.current.dibujar(ctx, {
        ancho,
        alto,
        t: (ahora - inicio) / 1000,
        dt,
        colores,
      })
    }

    const redimensionar = () => {
      const dpr = Math.min(ventana.devicePixelRatio || 1, DPR_MAXIMO)
      const rect = canvas.getBoundingClientRect()
      ancho = Math.max(1, Math.round(rect.width))
      alto = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(ancho * dpr)
      canvas.height = Math.round(alto * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      referencia.current.preparar(ancho, alto)
      if (estatico) dibujarCuadro(inicio, 0)
    }

    const paso = (ahora: number) => {
      cuadroId = ventana.requestAnimationFrame(paso)
      if (ahora - ultimoDibujo < intervalo - 1) return
      const dt = Math.min(0.1, (ahora - (anterior || ahora)) / 1000)
      anterior = ahora
      ultimoDibujo = ahora
      dibujarCuadro(ahora, dt)
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

    inicio = ventana.performance?.now() ?? 0
    redimensionar()
    sincronizar()

    const observadorTamano =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            // La notificación inicial del `observe` repite el tamaño ya preparado:
            // se ignora si no cambió (evita regenerar partículas y redibujar).
            const rect = canvas.getBoundingClientRect()
            if (
              Math.max(1, Math.round(rect.width)) === ancho &&
              Math.max(1, Math.round(rect.height)) === alto
            ) {
              return
            }
            redimensionar()
          })
        : null
    observadorTamano?.observe(canvas)

    const observadorVisibilidad =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entradas) => {
            visible = entradas.some((e) => e.isIntersecting) || entradas.length === 0
            sincronizar()
          })
        : null
    observadorVisibilidad?.observe(canvas)
    doc.addEventListener('visibilitychange', sincronizar)

    // Tema/modo oscuro: las variables viven en algún ancestro (`style`) y la
    // clase `dark` en el contenedor o en `<html>`.
    let relecturaPendiente = false
    const observadorTema = new MutationObserver(() => {
      if (relecturaPendiente) return
      relecturaPendiente = true
      queueMicrotask(() => {
        relecturaPendiente = false
        colores = leerColoresTema(canvas)
        if (estatico) dibujarCuadro(inicio, 0)
      })
    })
    for (let nodo: Element | null = canvas; nodo; nodo = nodo.parentElement) {
      observadorTema.observe(nodo, { attributes: true, attributeFilter: ['class', 'style'] })
    }

    return () => {
      if (cuadroId) ventana.cancelAnimationFrame(cuadroId)
      observadorTamano?.disconnect()
      observadorVisibilidad?.disconnect()
      observadorTema.disconnect()
      doc.removeEventListener('visibilitychange', sincronizar)
    }
  }, [canvasRef, estatico, maxFps, clave])
}
