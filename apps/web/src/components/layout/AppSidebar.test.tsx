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

const ITEMS_ESPERADOS = [
  'Perfil',
  'Proyectos',
  'Certificaciones',
  'Logros',
  'Skills',
  'Redes sociales',
  'Editor visual',
  'Tema',
  'Fondo del sitio',
  'Biblioteca de medios',
]

describe('AppSidebar', () => {
  it('muestra las 10 entradas de navegación agrupadas en 3 secciones', () => {
    renderSidebar('/admin/perfil')

    for (const label of ITEMS_ESPERADOS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(screen.getByText('Contenido')).toBeInTheDocument()
    expect(screen.getByText('Diseño')).toBeInTheDocument()
    expect(screen.getByText('Recursos')).toBeInTheDocument()
  })

  it('el link "Ver sitio público" abre en una pestaña nueva', () => {
    renderSidebar('/admin/perfil')

    const link = screen.getByRole('link', { name: 'Ver sitio público' })
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marca activo el ítem cuya ruta coincide exactamente', () => {
    renderSidebar('/admin/tema')

    expect(screen.getByRole('link', { name: 'Tema' })).toHaveAttribute(
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
    renderSidebar('/admin/tema-avanzado')

    expect(screen.getByRole('link', { name: 'Tema' })).toHaveAttribute(
      'data-active',
      'false',
    )
  })
})
