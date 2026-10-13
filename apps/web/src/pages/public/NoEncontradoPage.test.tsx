import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoEncontradoPage } from './NoEncontradoPage'

const useSitioMock = vi.fn()
const useModoTemaMock = vi.fn(() => ({ modo: 'claro', setModo: vi.fn() }))

vi.mock('@/features/publico/usePublico', () => ({
  useSitio: () => useSitioMock(),
}))

vi.mock('@/hooks/useModoTema', () => ({
  useModoTema: () => useModoTemaMock(),
}))

describe('NoEncontradoPage (Fase 6, UC-12)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
    document.head.innerHTML = ''
  })

  it('muestra el título, el enlace al inicio y un <title> propio', () => {
    useSitioMock.mockReturnValue({ data: null })

    render(
      <MemoryRouter initialEntries={['/no-existe']}>
        <NoEncontradoPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /volver al inicio/i }),
    ).toHaveAttribute('href', '/')
    expect(document.title).toBe('Página no encontrada')
  })

  it('aplica el tema del sitio como variables CSS y la clase dark en modo oscuro', () => {
    useSitioMock.mockReturnValue({
      data: {
        tema: {
          color_primario: '#111111',
          color_secundario: '#222222',
          color_fondo: '#ffffff',
          color_texto: '#000000',
          fuente_principal: 'Inter',
        },
      },
    })
    useModoTemaMock.mockReturnValue({ modo: 'oscuro', setModo: vi.fn() })

    const { container } = render(
      <MemoryRouter>
        <NoEncontradoPage />
      </MemoryRouter>,
    )

    const raiz = container.querySelector('[data-tema-modo="oscuro"]')
    expect(raiz).toHaveClass('dark')
    expect((raiz as HTMLElement).style.getPropertyValue('--color-primario')).not.toBe('')
  })
})
