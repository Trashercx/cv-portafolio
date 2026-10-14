import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilPublico } from '@/features/publico/types'
import type { NavegacionConfiguracion } from '@/features/secciones/types'
import type { EnlaceNavegacion } from '@/lib/navegacion'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueNavegacion } from './BloqueNavegacion'

/**
 * Fase 7 (7.3, UC-07 y UC-12): enlaces generados, sección activa
 * (`aria-current`), nombre, CV, toggle de modo, posición según el contexto
 * (`fixed` en el sitio, `sticky` en el lienzo) y menú compacto.
 */

const ENLACES: EnlaceNavegacion[] = [
  { id: 'a', titulo: 'Sobre mí' },
  { id: 'b', titulo: 'Proyectos' },
]

const PERFIL: PerfilPublico = {
  id: 'perfil-1',
  usuario_admin_id: 'admin-1',
  nombre_completo: 'Ada Lovelace',
  titulo_profesional: 'Ingeniera',
  resumen_bio: 'Bio',
  imagen_perfil_id: null,
  cv_media_id: 'cv-1',
  ubicacion: 'Remoto',
  updated_at: '2026-01-01T00:00:00.000Z',
  imagen_perfil: null,
  cv_media: {
    id: 'cv-1',
    url: 'https://cdn.example.com/cv.pdf',
    s3_key: 'cv.pdf',
    tipo: 'documento',
    ancho: null,
    alto: null,
    alt_text: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
}

type Observador = {
  callback: IntersectionObserverCallback
  objetivos: Element[]
}

let observadores: Observador[] = []
const IntersectionObserverOriginal = window.IntersectionObserver

beforeEach(() => {
  observadores = []
  window.IntersectionObserver = class {
    private registro: Observador
    constructor(callback: IntersectionObserverCallback) {
      this.registro = { callback, objetivos: [] }
      observadores.push(this.registro)
    }
    observe(elemento: Element) {
      this.registro.objetivos.push(elemento)
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof window.IntersectionObserver
})

afterEach(() => {
  window.IntersectionObserver = IntersectionObserverOriginal
  document.body.innerHTML = ''
  document.documentElement.classList.remove('scroll-suave')
})

function renderNav(
  config: NavegacionConfiguracion = {},
  extra: {
    modo?: 'publico' | 'editor'
    enlaces?: EnlaceNavegacion[]
    perfil?: PerfilPublico | null
    enFlujo?: boolean
  } = {},
) {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo={extra.modo ?? 'publico'}>
        <BloqueNavegacion
          config={config}
          enlaces={extra.enlaces ?? ENLACES}
          perfil={extra.perfil === undefined ? PERFIL : extra.perfil}
          enFlujo={extra.enFlujo}
        />
      </ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('BloqueNavegacion — enlaces (Fase 7)', () => {
  it('pinta un enlace por sección con ancla #seccion-{id}', () => {
    renderNav()
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    const sobreMi = within(nav).getAllByRole('link', { name: 'Sobre mí' })[0]
    expect(sobreMi).toHaveAttribute('href', '#seccion-a')
    expect(within(nav).getAllByRole('link', { name: 'Proyectos' })[0]).toHaveAttribute(
      'href',
      '#seccion-b',
    )
  })

  it('sin enlaces no hay botón de menú', () => {
    renderNav({}, { enlaces: [] })
    expect(screen.queryByRole('button', { name: 'Abrir menú' })).not.toBeInTheDocument()
  })

  it('marca con aria-current la sección activa que detecta el IntersectionObserver', () => {
    const destino = document.createElement('section')
    destino.id = 'seccion-b'
    document.body.append(destino)

    renderNav()
    expect(observadores).toHaveLength(1)
    expect(observadores[0].objetivos).toContain(destino)
    expect(screen.queryByRole('link', { current: 'location' })).not.toBeInTheDocument()

    act(() => {
      observadores[0].callback(
        [{ isIntersecting: true, target: destino } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    const activo = screen.getAllByRole('link', { current: 'location' })[0]
    expect(activo).toHaveTextContent('Proyectos')
    expect(screen.getAllByRole('link', { name: 'Sobre mí' })[0]).not.toHaveAttribute('aria-current')
  })

  it('en el lienzo del editor no observa secciones (no hay sección activa)', () => {
    renderNav({}, { modo: 'editor' })
    expect(observadores).toHaveLength(0)
  })

  it('activa el scroll suave del documento solo en el sitio público', () => {
    const { unmount } = renderNav()
    expect(document.documentElement).toHaveClass('scroll-suave')
    unmount()
    expect(document.documentElement).not.toHaveClass('scroll-suave')

    renderNav({}, { modo: 'editor' })
    expect(document.documentElement).not.toHaveClass('scroll-suave')
  })
})

describe('BloqueNavegacion — contenido opcional (Fase 7)', () => {
  it('mostrar_nombre (default true) enlaza el nombre del perfil a #top', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Ada Lovelace' })).toHaveAttribute('href', '#top')
  })

  it('mostrar_nombre=false lo oculta', () => {
    renderNav({ mostrar_nombre: false })
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
  })

  it('mostrar_cv (default true) con CV muestra el botón de descarga', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Descargar CV' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/cv$/),
    )
  })

  it('el botón del CV registra descargar_cv sin cambiar el href (Fase 8, UC-27)', async () => {
    const track = vi.fn()
    window.umami = { track }
    const user = userEvent.setup()
    renderNav()
    const enlace = screen.getByRole('link', { name: 'Descargar CV' })
    // jsdom no navega al hacer clic en un enlace; solo comprobamos el evento.
    await user.click(enlace)
    expect(track).toHaveBeenCalledWith('descargar_cv', undefined)
    expect(enlace).toHaveAttribute('href', expect.stringMatching(/\/cv$/))
    delete window.umami
  })

  it('sin CV en el perfil o con mostrar_cv=false no hay botón', () => {
    const { unmount } = renderNav({}, { perfil: { ...PERFIL, cv_media: null } })
    expect(screen.queryByRole('link', { name: 'Descargar CV' })).not.toBeInTheDocument()
    unmount()
    renderNav({ mostrar_cv: false })
    expect(screen.queryByRole('link', { name: 'Descargar CV' })).not.toBeInTheDocument()
  })

  it('mostrar_toggle_modo (default true) incluye el toggle de claro/oscuro', () => {
    renderNav()
    expect(screen.getByRole('button', { name: /cambiar a modo (claro|oscuro)/i })).toBeInTheDocument()
  })

  it('mostrar_toggle_modo=false no lo incluye', () => {
    renderNav({ mostrar_toggle_modo: false })
    expect(screen.queryByRole('button', { name: /cambiar a modo/i })).not.toBeInTheDocument()
  })

  it('mostrar_progreso_scroll pinta la barra de 2 px con el color primario', () => {
    const { container } = renderNav({ mostrar_progreso_scroll: true })
    const barra = container.querySelector('[data-progreso-scroll="vivo"]') as HTMLElement
    expect(barra).toHaveClass('h-0.5', 'fixed', 'origin-left')
    expect(barra.style.backgroundColor).toBe('var(--color-primario)')
  })

  it('sin mostrar_progreso_scroll (default) no hay barra', () => {
    const { container } = renderNav()
    expect(container.querySelector('[data-progreso-scroll]')).not.toBeInTheDocument()
  })

  it('en el lienzo la barra de progreso es una muestra estática', () => {
    const { container } = renderNav({ mostrar_progreso_scroll: true }, { modo: 'editor' })
    expect(container.querySelector('[data-progreso-scroll="estatico"]')).toBeInTheDocument()
    expect(container.querySelector('[data-progreso-scroll="vivo"]')).not.toBeInTheDocument()
  })
})

describe('BloqueNavegacion — estilo y posición (Fase 7)', () => {
  it('flotante (default) es una píldora de vidrio centrada', () => {
    renderNav()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-estilo-navegacion', 'flotante')
    const pildora = nav.firstElementChild
    expect(pildora).toHaveClass('rounded-full', 'bg-card/60', 'backdrop-blur', 'mx-auto')
  })

  it('barra ocupa el ancho completo con borde inferior', () => {
    renderNav({ estilo: 'barra' })
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-estilo-navegacion', 'barra')
    expect(nav).toHaveClass('border-b', 'bg-background/80')
  })

  it('fijo (default) es position fixed en el sitio público', () => {
    renderNav()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-posicion', 'fixed')
    expect(nav).toHaveClass('fixed', 'top-0', 'inset-x-0')
  })

  it('fijo=false queda en el flujo del documento', () => {
    renderNav({ fijo: false })
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-posicion', 'relativa')
    expect(nav).not.toHaveClass('fixed')
  })

  it('en el lienzo del editor siempre es sticky top-0 para poder seleccionarla', () => {
    const { unmount } = renderNav({ fijo: true }, { modo: 'editor' })
    expect(screen.getByRole('navigation')).toHaveClass('sticky', 'top-0')
    expect(screen.getByRole('navigation')).not.toHaveClass('fixed')
    unmount()

    renderNav({ fijo: false }, { modo: 'editor' })
    expect(screen.getByRole('navigation')).toHaveClass('sticky', 'top-0')
  })

  it('en la vista previa del panel (enFlujo) un menú fijo se resuelve como sticky', () => {
    renderNav({}, { enFlujo: true })
    expect(screen.getByRole('navigation')).toHaveClass('sticky')
    expect(screen.getByRole('navigation')).not.toHaveClass('fixed')
  })

  it('los enlaces de escritorio se ocultan bajo lg y el botón de menú solo aparece bajo lg', () => {
    renderNav()
    const lista = screen.getByRole('navigation').querySelector('ul')
    expect(lista).toHaveClass('hidden', 'lg:flex')
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveClass('lg:hidden')
  })
})

describe('BloqueNavegacion — menú compacto (Fase 7)', () => {
  it('el botón despliega y cierra los enlaces', async () => {
    const user = userEvent.setup()
    renderNav()
    const boton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('menu-navegacion-movil')).not.toBeInTheDocument()

    await user.click(boton)
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById('menu-navegacion-movil') as HTMLElement
    expect(within(panel).getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '#seccion-b')

    await user.click(within(panel).getByRole('link', { name: 'Proyectos' }))
    expect(document.getElementById('menu-navegacion-movil')).not.toBeInTheDocument()
  })

  it('Escape cierra el menú y devuelve el foco al botón', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    const panel = document.getElementById('menu-navegacion-movil') as HTMLElement
    within(panel).getByRole('link', { name: 'Proyectos' }).focus()

    await user.keyboard('{Escape}')
    expect(document.getElementById('menu-navegacion-movil')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus()
  })

  it('un clic fuera de la barra cierra el menú; dentro de ella no', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    await user.click(screen.getByRole('navigation'))
    expect(document.getElementById('menu-navegacion-movil')).toBeInTheDocument()

    await user.click(document.body)
    expect(document.getElementById('menu-navegacion-movil')).not.toBeInTheDocument()
  })

  it('atenuado se aplica sobre el propio nav', () => {
    render(
      <MemoryRouter>
        <ProveedorModoRenderizado modo="publico">
          <BloqueNavegacion config={{}} enlaces={ENLACES} perfil={null} atenuado />
        </ProveedorModoRenderizado>
      </MemoryRouter>,
    )
    expect(screen.getByRole('navigation')).toHaveClass('opacity-40')
  })
})
