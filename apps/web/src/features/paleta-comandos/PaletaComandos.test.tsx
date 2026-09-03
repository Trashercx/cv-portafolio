import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { useAuthStore } from '@/store/auth-store'
import {
  ProveedorPaletaComandos,
  useComandosContextuales,
} from './contexto-paleta'
import { PaletaComandos } from './PaletaComandos'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    )
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function PaginaConComandoContextual({ accion }: { accion: () => void }) {
  useComandosContextuales([
    { id: 'accion-de-prueba', etiqueta: 'Acción de prueba', accion },
  ])
  return <div>Página de prueba</div>
}

function renderPaleta(children?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ProveedorPaletaComandos>
          <PaletaComandos />
          {children}
        </ProveedorPaletaComandos>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('PaletaComandos', () => {
  beforeEach(() => {
    useAuthStore.setState({ admin: null, isAuthenticated: false })
    window.open = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('está cerrada por defecto y se abre con Ctrl+K', async () => {
    const user = userEvent.setup()
    renderPaleta()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.keyboard('{Control>}k{/Control}')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/buscá una página o acción/i),
    ).toBeInTheDocument()
  })

  it('se cierra al volver a presionar Ctrl+K', async () => {
    const user = userEvent.setup()
    renderPaleta()

    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Control>}k{/Control}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('navega a una ruta admin al hacer click en un ítem de "Navegar"', async () => {
    const user = userEvent.setup()
    renderPaleta()

    await user.keyboard('{Control>}k{/Control}')
    await user.click(await screen.findByText('Proyectos'))

    expect(navigateMock).toHaveBeenCalledWith('/admin/proyectos')
  })

  it('abre el sitio público en una pestaña nueva', async () => {
    const user = userEvent.setup()
    renderPaleta()

    await user.keyboard('{Control>}k{/Control}')
    await user.click(await screen.findByText('Ver sitio público'))

    expect(window.open).toHaveBeenCalledWith('/', '_blank', 'noopener,noreferrer')
  })

  it('cierra la sesión y navega al login al ejecutar "Cerrar sesión"', async () => {
    useAuthStore.setState({
      admin: { email: 'admin@example.com', nombre: 'Oscar' },
      isAuthenticated: true,
    })
    const user = userEvent.setup()
    renderPaleta()

    await user.keyboard('{Control>}k{/Control}')
    await user.click(await screen.findByText('Cerrar sesión'))

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(navigateMock).toHaveBeenCalledWith('/admin/login', { replace: true })
  })

  it('muestra un comando contextual mientras la página que lo registró está montada, y desaparece al desmontarla', async () => {
    const accion = vi.fn()
    const user = userEvent.setup()
    const { rerender } = renderPaleta(
      <PaginaConComandoContextual accion={accion} />,
    )

    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByText('Página actual')).toBeInTheDocument()
    expect(screen.getByText('Acción de prueba')).toBeInTheDocument()

    await user.click(screen.getByText('Acción de prueba'))
    expect(accion).toHaveBeenCalledTimes(1)

    // Desmonta la página (deja de renderizar el hijo con el comando
    // contextual) y vuelve a abrir la paleta: el comando ya no debe estar.
    rerender(
      <MemoryRouter>
        <ThemeProvider>
          <ProveedorPaletaComandos>
            <PaletaComandos />
          </ProveedorPaletaComandos>
        </ThemeProvider>
      </MemoryRouter>,
    )

    await user.keyboard('{Control>}k{/Control}')
    await screen.findByRole('dialog')
    expect(screen.queryByText('Página actual')).not.toBeInTheDocument()
    expect(screen.queryByText('Acción de prueba')).not.toBeInTheDocument()
  })
})
