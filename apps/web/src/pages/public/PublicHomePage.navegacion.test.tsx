import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
      .filter((enlace) => enlace.getAttribute('href')?.startsWith('#seccion-'))
    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual(['#seccion-sm'])
    expect(within(nav).queryByText('Portada')).not.toBeInTheDocument()
    expect(within(nav).queryByText('Logros ocultos')).not.toBeInTheDocument()
  })

  it('cada sección lleva su ancla #seccion-{id} y la navegación no se envuelve en una <section>', () => {
    const { container } = renderHome([seccion('nav', 'navegacion', 'Navegación', 0, {}), HERO, SOBRE_MI])
    expect(container.querySelector('section#seccion-sm')).toBeInTheDocument()
    expect(container.querySelector('section#seccion-hero')).toBeInTheDocument()
    expect(container.querySelector('section#seccion-nav')).not.toBeInTheDocument()
  })

  it('el indicador de scroll del hero enlaza a la sección siguiente', () => {
    renderHome([HERO, SOBRE_MI])
    expect(screen.getByRole('link', { name: 'Ir a la siguiente sección' })).toHaveAttribute(
      'href',
      '#seccion-sm',
    )
  })
})
