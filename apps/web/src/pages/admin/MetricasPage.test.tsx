import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RespuestaMetricas } from '@/features/metricas/types'
import { MetricasPage } from './MetricasPage'

const DISPONIBLE: RespuestaMetricas = {
  disponible: true,
  periodo: 30,
  desde: '2026-09-14T00:00:00.000Z',
  hasta: '2026-10-14T00:00:00.000Z',
  resumen: {
    paginas_vistas: 120,
    visitas: 80,
    visitantes: 55,
    rebote_pct: 42.4,
    duracion_media_s: 125,
  },
  paginas: [{ ruta: '/proyecto/abc', vistas: 33 }],
  referidos: [
    { origen: 'linkedin.com', visitas: 12 },
    { origen: '', visitas: 5 }, // tráfico directo: Umami lo entrega vacío
  ],
  paises: [{ pais: 'PE', visitas: 40 }],
  eventos: { descargar_cv: 7, clic_red: 9 },
  eventos_detalle: [{ nombre: 'descargar_cv', total: 7 }],
}

const useMetricasMock = vi.fn()
vi.mock('@/features/metricas/useMetricas', () => ({
  useMetricas: (periodo: number) => useMetricasMock(periodo),
}))

describe('MetricasPage (Fase 8, UC-27)', () => {
  beforeEach(() => {
    useMetricasMock.mockReset()
  })

  it('con datos muestra resumen, eventos y tablas', () => {
    useMetricasMock.mockReturnValue({ data: DISPONIBLE, isLoading: false, error: null })
    render(<MetricasPage />)

    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('42 %')).toBeInTheDocument()
    expect(screen.getByText('02:05')).toBeInTheDocument()
    expect(screen.getByText('Descargas de CV')).toBeInTheDocument()
    expect(screen.getByText('/proyecto/abc')).toBeInTheDocument()
    expect(screen.getByText('linkedin.com')).toBeInTheDocument()
    expect(screen.getByText('Directo')).toBeInTheDocument()
    expect(screen.getByText('PE')).toBeInTheDocument()
  })

  it('no_configurado explica el motivo y remite a docs/despliegue.md §7', () => {
    useMetricasMock.mockReturnValue({
      data: { disponible: false, motivo: 'no_configurado' },
      isLoading: false,
      error: null,
    })
    render(<MetricasPage />)

    expect(screen.getByText(/analítica no está configurada.*despliegue\.md §7/i)).toBeInTheDocument()
    expect(screen.queryByText('Páginas vistas')).not.toBeInTheDocument()
  })

  it.each([
    ['sin_respuesta', /Umami no respondió/],
    ['no_autorizado', /Credenciales de Umami inválidas/],
  ] as const)('motivo %s', (motivo, texto) => {
    useMetricasMock.mockReturnValue({ data: { disponible: false, motivo }, isLoading: false, error: null })
    render(<MetricasPage />)
    expect(screen.getByText(texto)).toBeInTheDocument()
  })

  it('muestra skeleton mientras carga', () => {
    useMetricasMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    render(<MetricasPage />)
    expect(screen.getByLabelText('Cargando métricas')).toBeInTheDocument()
  })

  it('cambiar el periodo vuelve a pedir las métricas con el nuevo valor', async () => {
    useMetricasMock.mockReturnValue({ data: DISPONIBLE, isLoading: false, error: null })
    render(<MetricasPage />)
    expect(useMetricasMock).toHaveBeenLastCalledWith(30)

    await userEvent.setup().click(screen.getByRole('tab', { name: '7 días' }))
    expect(useMetricasMock).toHaveBeenLastCalledWith(7)

    await userEvent.setup().click(screen.getByRole('tab', { name: '90 días' }))
    expect(useMetricasMock).toHaveBeenLastCalledWith(90)
  })
})
