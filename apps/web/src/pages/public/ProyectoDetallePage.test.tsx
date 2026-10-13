import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Proyecto } from '@/features/proyectos/types'
import { ApiError } from '@/lib/api-client'
import { ProyectoDetallePage } from './ProyectoDetallePage'

const PROYECTO: Proyecto = {
  id: 'proyecto-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Portafolio personal',
  descripcion: 'Descripción de prueba.',
  url_demo: 'https://demo.example.com',
  url_repositorio: 'https://github.com/example/repo',
  fecha_inicio: '2024-01-01',
  fecha_fin: null,
  estado: 'en_progreso',
  destacado: true,
  orden: 0,
  tecnologias: [],
  imagenes: [],
}

const useProyectoPublicoMock = vi.fn()

vi.mock('@/features/publico/usePublico', () => ({
  useProyectoPublico: (id?: string) => useProyectoPublicoMock(id),
  useSitio: () => ({ data: undefined }),
}))

function renderConId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/proyecto/${id}`]}>
      <Routes>
        <Route path="/proyecto/:id" element={<ProyectoDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProyectoDetallePage (UC-13)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el detalle del proyecto cuando existe en el snapshot publicado', () => {
    useProyectoPublicoMock.mockReturnValue({
      data: PROYECTO,
      isLoading: false,
      error: null,
    })

    renderConId('proyecto-1')

    expect(screen.getByText('Portafolio personal')).toBeInTheDocument()
    expect(screen.getByText('Descripción de prueba.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver demo/i })).toHaveAttribute(
      'href',
      'https://demo.example.com',
    )
  })

  it('muestra un 404 amigable cuando el proyecto no existe en lo publicado', () => {
    useProyectoPublicoMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError('No existe', 404, '/proyectos/no-existe'),
    })

    renderConId('no-existe')

    expect(
      screen.getByText(/no existe o todavía no está publicado/i),
    ).toBeInTheDocument()
  })
})
