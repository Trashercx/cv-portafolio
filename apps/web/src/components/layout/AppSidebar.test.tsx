import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'

function renderSidebar(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  )
}

/**
 * Fase 5 (panel unificado): "Tema" y "Fondo del sitio" ya no son ítems
 * propios de la sidebar — se fusionaron como pestañas del panel lateral de
 * "Editor visual" (ver `PanelTemaEditor`/`PanelFondoEditor`), así que el
 * grupo "Diseño" quedó con un solo ítem.
 */
const ITEMS_ESPERADOS = [
  'Perfil',
  'Proyectos',
  'Certificaciones',
  'Logros',
  'Skills',
  'Redes sociales',
  'Editor visual',
  'Biblioteca de medios',
  'Métricas', // Fase 8 (UC-27)
]

describe('AppSidebar', () => {
  it('muestra las 9 entradas de navegación agrupadas en 4 secciones', () => {
    renderSidebar('/admin/perfil')

    for (const label of ITEMS_ESPERADOS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(screen.getByText('Contenido')).toBeInTheDocument()
    expect(screen.getByText('Diseño')).toBeInTheDocument()
    expect(screen.getByText('Recursos')).toBeInTheDocument()
    expect(screen.getByText('Analítica')).toBeInTheDocument()
  })

  it('no muestra "Tema" ni "Fondo del sitio" como ítems propios (fusionados en el panel lateral del editor)', () => {
    renderSidebar('/admin/perfil')

    expect(screen.queryByRole('link', { name: 'Tema' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Fondo del sitio' }),
    ).not.toBeInTheDocument()
  })

  it('el link "Ver sitio público" abre en una pestaña nueva', () => {
    renderSidebar('/admin/perfil')

    const link = screen.getByRole('link', { name: 'Ver sitio público' })
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marca activo el ítem cuya ruta coincide exactamente', () => {
    renderSidebar('/admin/editor')

    expect(screen.getByRole('link', { name: 'Editor visual' })).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('marca activo el ítem cuando la ruta actual es una sub-ruta real (con "/")', () => {
    renderSidebar('/admin/proyectos/algo-anidado')

    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('NO marca activo un ítem cuando la ruta actual solo comparte prefijo de texto (caso que fallaría con startsWith puro)', () => {
    renderSidebar('/admin/editor-avanzado')

    expect(screen.getByRole('link', { name: 'Editor visual' })).toHaveAttribute(
      'data-active',
      'false',
    )
  })
})
