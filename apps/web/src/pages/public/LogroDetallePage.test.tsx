import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Logro } from '@/features/logros/types'
import type { SnapshotSitio } from '@/features/publico/types'
import { LogroDetallePage } from './LogroDetallePage'

const LOGRO: Logro = {
  id: 'logro-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Certificación AWS',
  descripcion: 'Obtuve la certificación',
  fecha: '2025-01-01',
  categoria: 'certificacion',
  url_referencia: null,
  orden: 0,
}

const SNAPSHOT_BASE: SnapshotSitio = {
  perfil: null,
  tema: null,
  secciones: [],
  proyectos: [],
  certificaciones: [],
  logros: [LOGRO],
  redes_sociales: [],
  skills: [],
  fondo: null,
}

const useSitioMock = vi.fn()

vi.mock('@/features/publico/usePublico', () => ({
  useSitio: () => useSitioMock(),
}))

function renderConId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/logro/${id}`]}>
      <Routes>
        <Route path="/logro/:id" element={<LogroDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LogroDetallePage (UC-13, Fase 4.3)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el detalle del logro cuando existe en el snapshot publicado', () => {
    useSitioMock.mockReturnValue({
      data: SNAPSHOT_BASE,
      isLoading: false,
      error: null,
    })

    renderConId('logro-1')

    expect(
      screen.getByRole('heading', { name: 'Certificación AWS', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Obtuve la certificación')).toBeInTheDocument()
  })

  it('muestra un 404 amigable cuando el logro no existe en lo publicado', () => {
    useSitioMock.mockReturnValue({
      data: SNAPSHOT_BASE,
      isLoading: false,
      error: null,
    })

    renderConId('no-existe')

    expect(
      screen.getByText(/no existe o todavía no está publicado/i),
    ).toBeInTheDocument()
  })

  it('muestra "Cargando…" mientras se resuelve el snapshot', () => {
    useSitioMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    renderConId('logro-1')

    expect(screen.getByText(/cargando logro/i)).toBeInTheDocument()
  })
})
