import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TIPOS_FONDO } from '@/features/fondo-sitio/catalogo-fondos'
import { FondoAnimado, type ModoFondo } from './FondoAnimado'

const CONFIG = { velocidad: 'media', opacidad: 0.5 }
const TIPOS_VISUALES = TIPOS_FONDO.filter((t) => t !== 'solido')
const MODOS: ModoFondo[] = ['sitio', 'editor', 'miniatura']

const matchMediaOriginal = window.matchMedia

/** jsdom no evalúa media queries: se simula cuáles coinciden. */
function simularMedia(coincide: (consulta: string) => boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: coincide(consulta),
    media: consulta,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  // jsdom no implementa el contexto 2D (avisa por consola): los canvas lo toleran como ausente.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  window.matchMedia = matchMediaOriginal
  vi.restoreAllMocks()
})

/** Los fondos se cargan con `lazy`: espera a que aparezca su capa visual. */
async function esperarCapa(container: HTMLElement) {
  await waitFor(() =>
    expect(container.querySelector('[data-fondo-tipo] > div')).not.toBeNull(),
  )
}

describe('FondoAnimado (Fase 7b, UC-15)', () => {
  it('sólido no dibuja nada (lo pinta --color-fondo del contenedor)', () => {
    const { container } = render(
      <FondoAnimado fondo={{ tipo: 'solido', configuracion: CONFIG }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('un tipo desconocido se trata como sólido', () => {
    const { container } = render(
      <FondoAnimado fondo={{ tipo: 'inventado', configuracion: CONFIG }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('el contenedor es decorativo, no recibe puntero y aplica la opacidad', async () => {
    const { container } = render(
      <FondoAnimado
        fondo={{ tipo: 'aurora_mesh', configuracion: { ...CONFIG, opacidad: 0.3 } }}
      />,
    )
    await waitFor(() => expect(container.firstElementChild).not.toBeNull())
    const raiz = container.firstElementChild as HTMLElement
    expect(raiz).toHaveAttribute('aria-hidden', 'true')
    expect(raiz).toHaveClass(
      'fondo-animado',
      'pointer-events-none',
      'absolute',
      'inset-0',
      'z-0',
      'overflow-hidden',
    )
    expect(raiz.style.opacity).toBe('0.3')
  })

  it('normaliza los tipos antiguos de un snapshot ya publicado', async () => {
    const { container } = render(
      <FondoAnimado fondo={{ tipo: 'aurora_animada', configuracion: CONFIG }} />,
    )
    await waitFor(() => expect(container.firstElementChild).not.toBeNull())
    expect(container.firstElementChild).toHaveAttribute('data-fondo-tipo', 'aurora_mesh')
  })

  it('tolera una configuración sin intensidad ni interactivo', async () => {
    const { container } = render(
      <FondoAnimado fondo={{ tipo: 'haces_luz', configuracion: {} }} />,
    )
    await waitFor(() => expect(container.firstElementChild).not.toBeNull())
    expect((container.firstElementChild as HTMLElement).style.opacity).toBe('0.5')
  })

  describe('montaje diferido (Fase 7b, presupuesto de Lighthouse)', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('en sitio no monta antes del idle y sí después', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { container } = render(
        <FondoAnimado fondo={{ tipo: 'aurora_mesh', configuracion: CONFIG }} />,
      )
      expect(container).toBeEmptyDOMElement()
      act(() => {
        vi.advanceTimersByTime(10)
      })
      expect(container.firstElementChild).toHaveAttribute('data-fondo-modo', 'sitio')
    })

    it('en sitio espera al evento load si el documento aún carga', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const estado = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
      const { container } = render(
        <FondoAnimado fondo={{ tipo: 'aurora_mesh', configuracion: CONFIG }} />,
      )
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(container).toBeEmptyDOMElement()
      act(() => {
        window.dispatchEvent(new Event('load'))
        vi.advanceTimersByTime(10)
      })
      expect(container.firstElementChild).not.toBeNull()
      estado.mockRestore()
    })

    it('sin requestIdleCallback usa el fallback de 300 ms y limpia al desmontar', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const original = window.requestIdleCallback
      // @ts-expect-error simula un navegador sin la API
      window.requestIdleCallback = undefined
      try {
        const { container, unmount } = render(
          <FondoAnimado fondo={{ tipo: 'aurora_mesh', configuracion: CONFIG }} />,
        )
        act(() => {
          vi.advanceTimersByTime(299)
        })
        expect(container).toBeEmptyDOMElement()
        act(() => {
          vi.advanceTimersByTime(2)
        })
        expect(container.firstElementChild).not.toBeNull()
        unmount()
      } finally {
        window.requestIdleCallback = original
      }
    })

    it('desmontar antes del idle cancela el montaje', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { unmount } = render(
        <FondoAnimado fondo={{ tipo: 'aurora_mesh', configuracion: CONFIG }} />,
      )
      unmount()
      expect(() => vi.advanceTimersByTime(2000)).not.toThrow()
      expect(vi.getTimerCount()).toBe(0)
    })

    it.each(['editor', 'miniatura'] as const)('en %s monta de inmediato', (modo) => {
      const { container } = render(
        <FondoAnimado fondo={{ tipo: 'aurora_mesh', configuracion: CONFIG }} modo={modo} />,
      )
      expect(container.firstElementChild).toHaveAttribute('data-fondo-modo', modo)
    })
  })

  describe.each(TIPOS_VISUALES)('%s', (tipo) => {
    it.each(MODOS)('renderiza sin error en modo %s', async (modo) => {
      const { container } = render(
        <FondoAnimado fondo={{ tipo, configuracion: CONFIG }} modo={modo} />,
      )
      await esperarCapa(container)
      expect(container.firstElementChild).toHaveAttribute('data-fondo-modo', modo)
    })

    it('renderiza sin error con prefers-reduced-motion', async () => {
      simularMedia((c) => c.includes('prefers-reduced-motion'))
      const { container } = render(
        <FondoAnimado fondo={{ tipo, configuracion: CONFIG }} />,
      )
      await esperarCapa(container)
    })
  })

  it('en miniatura la capa es de caja y el contenedor lleva .fondo-miniatura', async () => {
    const { container } = render(
      <FondoAnimado fondo={{ tipo: 'ondas_fluidas', configuracion: CONFIG }} modo="miniatura" />,
    )
    await esperarCapa(container)
    expect(container.firstElementChild).toHaveClass('fondo-miniatura')
    expect(container.querySelector('.fixed')).toBeNull()

    // jsdom no calcula la cascada: se comprueba que la hoja pausa con !important
    // (el shorthand `animation` inline de los fondos restablece play-state a running).
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf-8')
    expect(css).toMatch(
      /\.fondo-miniatura,\s*\.fondo-miniatura \*\s*\{\s*animation-play-state:\s*paused\s*!important;/,
    )
  })

  it('index.css reanuda las miniaturas solo con hover/focus y sin movimiento reducido', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf-8')
    const inicio = css.indexOf('@media (prefers-reduced-motion: no-preference) {\n    .tarjeta-fondo:hover')
    expect(inicio).toBeGreaterThan(-1)
    const bloque = css.slice(inicio, css.indexOf('}\n  }', inicio))
    expect(bloque).toContain('.tarjeta-fondo:focus-within .fondo-miniatura *')
    expect(bloque).toMatch(/animation-play-state:\s*running\s*!important/)
  })

  it('en sitio y editor la capa se ancla al viewport (fixed)', async () => {
    const { container } = render(
      <FondoAnimado fondo={{ tipo: 'ondas_fluidas', configuracion: CONFIG }} modo="editor" />,
    )
    await esperarCapa(container)
    expect(container.querySelector('.fixed')).not.toBeNull()
  })

  it('index.css pausa las animaciones de .fondo-animado bajo prefers-reduced-motion', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf-8')
    const bloque = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {\n  .hero-blob'))
    expect(bloque).toContain('.fondo-animado *')
    expect(bloque).toMatch(/animation-play-state:\s*paused\s*!important/)
  })

  it('index.css ya no define los keyframes de los tipos anteriores', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf-8')
    for (const viejo of [
      'aurora-drift-1',
      'particles-float',
      'grid-drift',
      'wave-drift',
      'malla-drift-1',
      'diagonal-drift',
    ]) {
      expect(css).not.toContain(`@keyframes ${viejo}`)
    }
    for (const nuevo of ['aurora-deriva-a', 'rejilla-avance', 'onda-desplazar', 'haz-oscilar']) {
      expect(css).toContain(`@keyframes ${nuevo}`)
    }
  })
})
