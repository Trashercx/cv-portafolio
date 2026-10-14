import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CATALOGO_FONDOS, type TipoFondo } from '@/features/fondo-sitio/catalogo-fondos'
import { registroOgl } from '@/test/mocks/ogl'
import { registroParticulas } from '@/test/mocks/tsparticles-react'
import { FondoAnimado, type ModoFondo } from '../FondoAnimado'
import { FRAGMENTO_AURORA } from './ogl/shaders/aurora.glsl'
import { FRAGMENTO_LIQUIDO } from './ogl/shaders/liquido.glsl'
import { FRAGMENTO_ONDAS_DITHER } from './ogl/shaders/ondas-dither.glsl'
import { FRAGMENTO_PLASMA } from './ogl/shaders/plasma.glsl'
import { FRAGMENTO_SEDA } from './ogl/shaders/seda.glsl'
import { registrarMotorParticulas } from './tsparticles/MotorParticulas'

/**
 * Fase 7c (UC-15): los 11 fondos nuevos (6 con tsparticles, 5 shaders con
 * ogl) montan y desmontan sin fugas con los motores mockeados (jsdom no
 * tiene canvas ni WebGL), respetan el modo, el movimiento reducido y la
 * interactividad, y liberan el contexto WebGL al desmontar.
 */

const CONFIG = { velocidad: 'media', opacidad: 0.5, intensidad: 'media', interactivo: true }
const TSPARTICLES = CATALOGO_FONDOS.filter((e) => e.motor === 'tsparticles').map((e) => e.tipo)
const OGL = CATALOGO_FONDOS.filter((e) => e.motor === 'ogl').map((e) => e.tipo)

const matchMediaOriginal = window.matchMedia
const rafOriginal = window.requestAnimationFrame

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

function montar(
  tipo: TipoFondo,
  modo: ModoFondo = 'editor',
  configuracion: Record<string, unknown> = CONFIG,
) {
  return render(<FondoAnimado fondo={{ tipo, configuracion }} modo={modo} />)
}

beforeEach(() => {
  registroParticulas.reiniciar()
  registroOgl.reiniciar()
})

afterEach(() => {
  window.matchMedia = matchMediaOriginal
  window.requestAnimationFrame = rafOriginal
  vi.restoreAllMocks()
})

describe('catálogo: motor por tipo', () => {
  it('reparte los 20 tipos entre css, canvas, tsparticles y ogl', () => {
    const porMotor = (m: string) => CATALOGO_FONDOS.filter((e) => e.motor === m).length
    expect(porMotor('tsparticles')).toBe(6)
    expect(porMotor('ogl')).toBe(5)
    expect(porMotor('canvas')).toBe(2)
    expect(porMotor('css')).toBe(7)
  })
})

describe.each(TSPARTICLES)('fondo tsparticles %s', (tipo) => {
  it('monta con el motor compartido y desmonta sin fugas', async () => {
    const { container, unmount } = montar(tipo)
    await waitFor(() => expect(registroParticulas.montadas).toBeGreaterThan(0))
    expect(container.querySelector('[data-testid="particulas-mock"]')).not.toBeNull()
    // Siempre el mismo registrador estable (el proveedor guarda una única promesa).
    expect(registroParticulas.inits.every((init) => init === registrarMotorParticulas)).toBe(true)

    unmount()
    expect(registroParticulas.desmontadas).toBe(registroParticulas.montadas)
  })

  it('en el sitio activa el puntero y fija los fps y la pausa fuera de pantalla', async () => {
    montar(tipo, 'sitio')
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    const opciones = registroParticulas.opciones
    expect(opciones.every((o) => o.fpsLimit === 60)).toBe(true)
    expect(opciones.every((o) => o.pauseOnOutsideViewport === true && o.pauseOnBlur === true)).toBe(true)
    const interactivo = CATALOGO_FONDOS.find((e) => e.tipo === tipo)!.interactivo
    const conPuntero = opciones.some((o) => {
      const eventos = (o.interactivity as { events?: { onHover?: { enable?: boolean } } } | undefined)?.events
      return eventos?.onHover?.enable === true
    })
    expect(conPuntero).toBe(interactivo)
  })

  it('con interactivo=false no registra modos de puntero', async () => {
    montar(tipo, 'sitio', { ...CONFIG, interactivo: false })
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    expect(registroParticulas.opciones.every((o) => o.interactivity === undefined)).toBe(true)
  })

  it('en el editor corre a 30 fps y sin puntero', async () => {
    montar(tipo, 'editor')
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    expect(registroParticulas.opciones.every((o) => o.fpsLimit === 30)).toBe(true)
    expect(registroParticulas.opciones.every((o) => o.interactivity === undefined)).toBe(true)
  })

  it('en miniatura corre a 20 fps, sin puntero y sin retina', async () => {
    montar(tipo, 'miniatura')
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    for (const o of registroParticulas.opciones) {
      expect(o.fpsLimit).toBe(20)
      expect(o.interactivity).toBeUndefined()
      expect(o.detectRetina).toBe(false)
    }
  })

  it('con movimiento reducido congela las partículas y quita la vida finita', async () => {
    simularMedia((c) => c.includes('prefers-reduced-motion'))
    montar(tipo, 'sitio')
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    for (const o of registroParticulas.opciones) {
      const particulas = o.particles as Record<string, unknown>
      expect((particulas.move as { enable: boolean }).enable).toBe(false)
      expect(particulas.life).toBeUndefined()
      expect(o.interactivity).toBeUndefined()
    }
  })

  it('escala el número de partículas por intensidad y por modo (miniatura 40 %)', async () => {
    const cantidad = (): number =>
      (registroParticulas.opciones[0].particles as { number: { value: number } }).number.value

    const media = montar(tipo, 'editor', { ...CONFIG, intensidad: 'media' })
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    const base = cantidad()
    media.unmount()

    registroParticulas.reiniciar()
    const alta = montar(tipo, 'editor', { ...CONFIG, intensidad: 'alta' })
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    expect(cantidad()).toBeGreaterThanOrEqual(base)
    alta.unmount()

    registroParticulas.reiniciar()
    const sutil = montar(tipo, 'editor', { ...CONFIG, intensidad: 'sutil' })
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    expect(cantidad()).toBeLessThanOrEqual(base)
    sutil.unmount()

    registroParticulas.reiniciar()
    montar(tipo, 'miniatura', { ...CONFIG, intensidad: 'media' })
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    expect(cantidad()).toBeLessThan(base)
  })
})

describe('colores del tema en tsparticles', () => {
  it('se leen de las variables CSS del contenedor, nunca fijos', async () => {
    const { container } = render(
      <div style={{ '--color-primario': '#ff0000', '--color-secundario': '#0000ff', '--color-fondo': '#101010' } as React.CSSProperties}>
        <FondoAnimado fondo={{ tipo: 'constelacion', configuracion: CONFIG }} modo="editor" />
      </div>,
    )
    await waitFor(() => expect(registroParticulas.opciones.length).toBeGreaterThan(0))
    expect(container).toBeTruthy()
    const particulas = registroParticulas.opciones[0].particles as {
      paint: { color: { value: string } }
      links: { color: { value: string } }
    }
    expect(particulas.paint.color.value).toBe('rgb(255, 0, 0)')
    expect(particulas.links.color.value).toBe('rgb(0, 0, 255)')
  })

  it('estrellas fugaces usa dos capas (cielo y trazos) y la de trazos es una línea orientada', async () => {
    montar('estrellas_fugaces', 'editor')
    await waitFor(() => expect(registroParticulas.opciones).toHaveLength(2))
    const trazos = registroParticulas.opciones[1].particles as {
      shape: { type: string }
      rotate: { path: boolean }
    }
    expect(trazos.shape.type).toBe('line')
    expect(trazos.rotate.path).toBe(true)
  })
})

describe.each(OGL)('fondo ogl %s', (tipo) => {
  it('crea el renderer con DPR acotado, dibuja y libera el contexto al desmontar', async () => {
    simularMedia(() => false)
    const { container, unmount } = montar(tipo, 'sitio')
    await waitFor(() => expect(registroOgl.renderers).toHaveLength(1))
    expect(container.querySelector('canvas')).not.toBeNull()
    const renderer = registroOgl.renderers[0]
    expect(renderer.dpr).toBeLessThanOrEqual(1.5)
    expect(renderer.opciones.webgl).toBe(1)
    expect(renderer.render).toHaveBeenCalled()

    const uniforms = registroOgl.programas[0].uniforms
    for (const nombre of ['uTime', 'uResolution', 'uColorA', 'uColorB', 'uColorC', 'uIntensidad', 'uPuntero']) {
      expect(uniforms).toHaveProperty(nombre)
    }
    expect(registroOgl.loseContext).not.toHaveBeenCalled()
    unmount()
    expect(registroOgl.loseContext).toHaveBeenCalledTimes(1)
  })

  it('en miniatura usa DPR 1; con (hover: none) renderiza a media resolución', async () => {
    montar(tipo, 'miniatura')
    await waitFor(() => expect(registroOgl.renderers).toHaveLength(1))
    expect(registroOgl.renderers[0].dpr).toBe(1)

    registroOgl.reiniciar()
    simularMedia((c) => c.includes('hover: none'))
    montar(tipo, 'sitio')
    await waitFor(() => expect(registroOgl.renderers).toHaveLength(1))
    expect(registroOgl.renderers[0].dpr).toBe(0.5)
  })

  it('con movimiento reducido hace un único render con tiempo fijo y sin rAF', async () => {
    simularMedia((c) => c.includes('prefers-reduced-motion'))
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    montar(tipo, 'sitio')
    await waitFor(() => expect(registroOgl.renderers).toHaveLength(1))
    expect(raf).not.toHaveBeenCalled()
    expect(registroOgl.renderers[0].render).toHaveBeenCalledTimes(1)
    expect(registroOgl.programas[0].uniforms.uTime.value).toBeGreaterThan(0)
  })

  it('sin movimiento reducido pide fotogramas con rAF y los cancela al desmontar', async () => {
    simularMedia(() => false)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7)
    const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const { unmount } = montar(tipo, 'sitio')
    await waitFor(() => expect(raf).toHaveBeenCalled())
    unmount()
    expect(caf).toHaveBeenCalledWith(7)
  })

  it('sin WebGL no pinta ni lanza', async () => {
    registroOgl.sinWebGL = true
    const { container, unmount } = montar(tipo, 'editor')
    await waitFor(() => expect(container.querySelector('canvas')).not.toBeNull())
    expect(registroOgl.renderers).toHaveLength(0)
    expect(() => unmount()).not.toThrow()
    expect(registroOgl.loseContext).not.toHaveBeenCalled()
  })
})

describe('shader ogl: colores del tema y uniforms', () => {
  it('uColorA/B/C salen de --color-primario/secundario/fondo', async () => {
    simularMedia(() => false)
    render(
      <div style={{ '--color-primario': '#ff0000', '--color-secundario': '#00ff00', '--color-fondo': '#0000ff' } as React.CSSProperties}>
        <FondoAnimado fondo={{ tipo: 'plasma', configuracion: CONFIG }} modo="editor" />
      </div>,
    )
    await waitFor(() => expect(registroOgl.programas).toHaveLength(1))
    const u = registroOgl.programas[0].uniforms
    expect(u.uColorA.value).toEqual([1, 0, 0])
    expect(u.uColorB.value).toEqual([0, 1, 0])
    expect(u.uColorC.value).toEqual([0, 0, 1])
  })

  it('la intensidad escala uIntensidad (sutil < media < alta)', async () => {
    simularMedia(() => false)
    const valores: number[] = []
    for (const intensidad of ['sutil', 'media', 'alta']) {
      registroOgl.reiniciar()
      const { unmount } = montar('seda', 'editor', { ...CONFIG, intensidad })
      await waitFor(() => expect(registroOgl.programas).toHaveLength(1))
      valores.push(registroOgl.programas[0].uniforms.uIntensidad.value as number)
      unmount()
    }
    expect(valores[0]).toBeLessThan(valores[1])
    expect(valores[1]).toBeLessThan(valores[2])
  })
})

describe('fragment shaders (GLSL ES 1.0, compatible con WebGL1)', () => {
  const SHADERS = {
    aurora: FRAGMENTO_AURORA,
    seda: FRAGMENTO_SEDA,
    plasma: FRAGMENTO_PLASMA,
    liquido: FRAGMENTO_LIQUIDO,
    ondas_dither: FRAGMENTO_ONDAS_DITHER,
  }

  it.each(Object.entries(SHADERS))('%s declara los uniforms del contrato y escribe gl_FragColor', (_nombre, fuente) => {
    for (const uniform of ['uTime', 'uResolution', 'uColorA', 'uColorB', 'uColorC', 'uIntensidad', 'uPuntero']) {
      expect(fuente).toContain(`uniform`)
      expect(fuente).toContain(uniform)
    }
    expect(fuente).toContain('void main()')
    expect(fuente).toContain('gl_FragColor')
  })

  it.each(Object.entries(SHADERS))('%s no usa sintaxis de GLSL ES 3.0', (_nombre, fuente) => {
    expect(fuente).not.toContain('#version')
    expect(fuente).not.toMatch(/\bin vec|\bout vec|texture\(|\bgl_FragColor\s*;\s*layout/)
    expect(fuente).not.toMatch(/\bint\s+\w+\s*=\s*\w+\s*%/)
  })
})

describe('fondos nuevos y rAF global', () => {
  it('los 11 tipos nuevos son chunks despachables (ninguno cae al sólido)', async () => {
    for (const tipo of [...TSPARTICLES, ...OGL]) {
      registroParticulas.reiniciar()
      registroOgl.reiniciar()
      const { container, unmount } = montar(tipo, 'editor')
      await waitFor(() => expect(container.querySelector('[data-fondo-tipo] > div')).not.toBeNull())
      expect(container.firstElementChild).toHaveAttribute('data-fondo-tipo', tipo)
      await act(async () => {
        unmount()
      })
    }
  })
})
