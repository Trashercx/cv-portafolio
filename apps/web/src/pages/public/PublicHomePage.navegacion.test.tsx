import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SnapshotSitio } from '@/features/publico/types'
import type { Seccion } from '@/features/secciones/types'
import { PublicHomePage } from './PublicHomePage'

/**
 * Fase 7 (7.3, UC-12): con un bloque `navegacion` visible que trae su propio
 * toggle, la home oculta el `ToggleModoTema` fijo de la esquina; los enlaces
 * se generan con las secciones del snapshot y el hero enlaza a la siguiente.
 */

function seccion(
  id: string,
  tipo_seccion: Seccion['tipo_seccion'],
  titulo_visible: string,
  orden: number,
  configuracion: object,
  visible = true,
): Seccion {
  return {
    id,
    usuario_admin_id: 'admin-1',
    tipo_seccion,
    titulo_visible,
    orden,
    visible,
    configuracion: configuracion as never,
  }
}

function snapshotCon(secciones: Seccion[]): SnapshotSitio {
  return {
    perfil: {
      id: 'perfil-1',
      usuario_admin_id: 'admin-1',
      nombre_completo: 'Ada Lovelace',
      titulo_profesional: 'Ingeniera',
      resumen_bio: 'Bio',
      imagen_perfil_id: null,
      cv_media_id: null,
      ubicacion: 'Remoto',
      updated_at: '2026-01-01T00:00:00.000Z',
      imagen_perfil: null,
      cv_media: null,
    },
    tema: null,
    secciones,
    proyectos: [],
    certificaciones: [],
    logros: [],
    redes_sociales: [],
    skills: [],
    fondo: null,
  }
}

const HERO = seccion('hero', 'hero', 'Portada', 1, {
  titulo: 'Hola',
  subtitulo: 'Sub',
  mostrar_indicador_scroll: true,
})
const SOBRE_MI = seccion('sm', 'sobre-mi', 'Sobre mí', 2, { mostrar_foto: false })
const OCULTA = seccion('oc', 'logros', 'Logros ocultos', 3, {}, false)

const useSitioMock = vi.fn()

vi.mock('@/features/publico/usePublico', () => ({
  useSitio: () => useSitioMock(),
}))

vi.mock('@/hooks/useModoTema', () => ({
  useModoTema: () => ({ modo: 'claro', setModo: vi.fn() }),
}))

function renderHome(secciones: Seccion[]) {
  useSitioMock.mockReturnValue({ data: snapshotCon(secciones), isLoading: false, error: null })
  return render(
    <MemoryRouter>
      <PublicHomePage />
    </MemoryRouter>,
  )
}

describe('PublicHomePage — navegación (Fase 7)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sin navegación conserva el toggle fijo de la esquina', () => {
    renderHome([HERO, SOBRE_MI])
    expect(screen.getByRole('button', { name: /cambiar a modo/i })).toBeInTheDocument()
  })

  it('con navegación y mostrar_toggle_modo oculta el toggle de la esquina (queda solo el de la barra)', () => {
    renderHome([seccion('nav', 'navegacion', 'Navegación', 0, {}), HERO, SOBRE_MI])
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(screen.getAllByRole('button', { name: /cambiar a modo/i })).toHaveLength(1)
    expect(within(nav).getByRole('button', { name: /cambiar a modo/i })).toBeInTheDocument()
  })

  it('con navegación sin toggle restaura el de la esquina', () => {
    renderHome([seccion('nav', 'navegacion', 'Navegación', 0, { mostrar_toggle_modo: false }), HERO])
    const botones = screen.getAllByRole('button', { name: /cambiar a modo/i })
    expect(botones).toHaveLength(1)
    expect(screen.getByRole('navigation')).not.toContainElement(botones[0])
  })

  it('los enlaces de la barra salen de las secciones visibles con título (sin hero ni navegación)', () => {
    renderHome([seccion('nav', 'navegacion', 'Navegación', 0, {}), HERO, SOBRE_MI, OCULTA])
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    const enlaces = within(nav)
      .getAllByRole('link')
      // El enlace del nombre apunta a #top: aquí solo interesan las secciones.
      .filter((enlace) => {
        const href = enlace.getAttribute('href') ?? ''
        return href.startsWith('#') && href !== '#top'
      })
    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual(['#sobre-mi'])
    expect(within(nav).queryByText('Portada')).not.toBeInTheDocument()
    expect(within(nav).queryByText('Logros ocultos')).not.toBeInTheDocument()
  })

  it('cada sección lleva su ancla legible (slug del título, Fase 7n #73) y la navegación no se envuelve en una <section>', () => {
    const { container } = renderHome([seccion('nav', 'navegacion', 'Navegación', 0, {}), HERO, SOBRE_MI])
    expect(container.querySelector('section#sobre-mi')).toBeInTheDocument()
    expect(container.querySelector('section#portada')).toBeInTheDocument()
    expect(container.querySelector('section#navegacion')).not.toBeInTheDocument()
    expect(container.querySelector('section[id^="seccion-"]')).not.toBeInTheDocument()
    // Alias del formato anterior dentro de la sección (enlaces ya guardados o compartidos).
    expect(container.querySelector('section#sobre-mi > span#seccion-sm')).toBeInTheDocument()
  })

  it('el indicador de scroll del hero enlaza a la sección siguiente', () => {
    renderHome([HERO, SOBRE_MI])
    expect(screen.getByRole('link', { name: 'Ir a la siguiente sección' })).toHaveAttribute(
      'href',
      '#sobre-mi',
    )
  })
})

/**
 * Fase 7n (#73): al cargar con un hash en la URL, la home salta a la sección
 * cuando el snapshot ya está pintado (el navegador lo intentó antes de que
 * existiera) y traduce los enlaces antiguos `#seccion-{uuid}` al slug.
 */
describe('PublicHomePage — ancla inicial (Fase 7n, #73)', () => {
  const scrollIntoViewOriginal = window.HTMLElement.prototype.scrollIntoView
  let scrollIntoView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollIntoView = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView as unknown as typeof scrollIntoViewOriginal
  })

  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewOriginal
    window.history.replaceState(null, '', window.location.pathname)
  })

  it('con #sobre-mi en la URL hace scroll a esa sección al pintar el snapshot', () => {
    window.history.replaceState(null, '', '#sobre-mi')
    const { container } = renderHome([HERO, SOBRE_MI])
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(container.querySelector('section#sobre-mi'))
    expect(window.location.hash).toBe('#sobre-mi')
  })

  it('traduce un enlace antiguo #seccion-{id} al slug, corrige la URL y hace scroll', () => {
    window.history.replaceState(null, '', '#seccion-sm')
    const { container } = renderHome([HERO, SOBRE_MI])
    expect(window.location.hash).toBe('#sobre-mi')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(container.querySelector('section#sobre-mi'))
  })

  it('si un enlace interno antiguo cambia el hash a #seccion-{id}, corrige la URL al slug sin volver a hacer scroll', () => {
    renderHome([HERO, SOBRE_MI])
    expect(scrollIntoView).not.toHaveBeenCalled()
    window.history.replaceState(null, '', '#seccion-sm')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(window.location.hash).toBe('#sobre-mi')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('un hash que no es de ninguna sección no hace nada', () => {
    window.history.replaceState(null, '', '#contenido')
    renderHome([HERO, SOBRE_MI])
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#contenido')
  })
})
