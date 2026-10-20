import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import {
  PanelAjustesFondo,
  RETRASO_GUARDADO_MS,
  RETRASO_SLIDER_MS,
} from './PanelAjustesFondo'

const actualizarMutateMock = vi.fn()
const idActualizadoMock = vi.fn()

const fondosMock: { data: FondoSitio[] | undefined } = { data: [] }

vi.mock('@/features/fondo-sitio/useFondosSitio', () => ({
  useFondosSitio: () => ({ data: fondosMock.data }),
  useActualizarFondoSitio: (id: string, opciones?: { silencioso?: boolean }) => {
    idActualizadoMock(id, opciones)
    return { mutateAsync: actualizarMutateMock, isPending: false }
  },
}))

vi.mock('@/features/tema/useTemas', () => ({ useTemas: () => ({ data: [] }) }))

vi.mock('@/components/publico/FondoAnimado', () => ({
  FondoAnimado: ({
    fondo,
  }: {
    fondo: { tipo: string; configuracion: { opacidad: number } }
  }) => (
    <div
      data-testid="fondo-mock"
      data-tipo={fondo.tipo}
      data-opacidad={fondo.configuracion.opacidad}
    />
  ),
}))

const FONDO_ACTIVO: FondoSitio = {
  id: 'fondo-1',
  usuario_admin_id: 'admin-1',
  tipo: 'aurora_mesh',
  configuracion: { velocidad: 'media', opacidad: 0.5 },
  activo: true,
}

function arbol() {
  return (
    <ThemeProvider>
      <PanelAjustesFondo />
    </ThemeProvider>
  )
}

/**
 * Ajustes del fondo en el panel derecho (Fase 7l, UC-15): sin Guardar/Cancelar,
 * cada cambio va al lienzo y se persiste solo con PATCH (debounce de 500 ms).
 */
describe('PanelAjustesFondo (UC-15, Fase 7l)', () => {
  beforeEach(() => {
    // El desmontaje automático del test anterior puede haber guardado un cambio pendiente.
    vi.clearAllMocks()
    fondosMock.data = [FONDO_ACTIVO]
    actualizarMutateMock.mockResolvedValue({})
    useEditorPanelStore.setState({
      pluginActivo: 'fondo',
      modoVistaPrevia: null,
      fondoEnEdicion: null,
      fondoSeleccionado: 'aurora_mesh',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('sin fondo seleccionado no renderiza nada', () => {
    useEditorPanelStore.setState({ fondoSeleccionado: null })
    const { container } = render(arbol())
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra vista previa y controles con la configuración guardada, sin Guardar ni Cancelar, y sin publicar al lienzo al montar', () => {
    render(arbol())

    const panel = screen.getByRole('region', { name: 'Ajustes de Aurora mesh' })
    expect(within(panel).getByTestId('vista-previa-fondo')).toBeInTheDocument()
    expect(within(panel).getByRole('radiogroup', { name: 'Velocidad' })).toBeInTheDocument()
    expect(within(panel).getByRole('slider', { name: 'Opacidad' })).toBeInTheDocument()
    expect(within(panel).getByRole('radiogroup', { name: 'Intensidad' })).toBeInTheDocument()
    expect(within(panel).getByRole('switch', { name: 'Interactivo' })).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    // El fondo del lienzo no parpadea: montar no toca `fondoEnEdicion`.
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
    expect(idActualizadoMock).toHaveBeenCalledWith('fondo-1', { silencioso: true })
  })

  it('un cambio de velocidad llega al lienzo al instante y se guarda con un PATCH tras 500 ms', async () => {
    vi.useFakeTimers()
    render(arbol())

    act(() => screen.getByRole('radio', { name: 'Rápida' }).click())
    expect(useEditorPanelStore.getState().fondoEnEdicion).toMatchObject({
      id: 'fondo-1',
      tipo: 'aurora_mesh',
      configuracion: { velocidad: 'rapida', opacidad: 0.5, intensidad: 'media', interactivo: true },
    })
    expect(screen.getByRole('status')).toHaveTextContent('Guardando…')

    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS - 1))
    expect(actualizarMutateMock).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(actualizarMutateMock).toHaveBeenCalledTimes(1)
    expect(actualizarMutateMock.mock.calls[0][0]).toEqual({
      configuracion: { velocidad: 'rapida', opacidad: 0.5, intensidad: 'media', interactivo: true },
    })
    expect(screen.getByRole('status')).toHaveTextContent('Guardado')
  })

  it('varios cambios seguidos se agrupan en un solo PATCH con el último valor', async () => {
    vi.useFakeTimers()
    render(arbol())

    act(() => screen.getByRole('radio', { name: 'Lenta' }).click())
    await act(() => vi.advanceTimersByTimeAsync(300))
    act(() => screen.getByRole('radio', { name: 'Alta' }).click())
    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS))

    expect(actualizarMutateMock).toHaveBeenCalledTimes(1)
    expect(actualizarMutateMock.mock.calls[0][0]).toEqual({
      configuracion: { velocidad: 'lenta', opacidad: 0.5, intensidad: 'alta', interactivo: true },
    })
  })

  it('el switch Interactivo publica al lienzo y persiste', async () => {
    vi.useFakeTimers()
    render(arbol())

    act(() => screen.getByRole('switch', { name: 'Interactivo' }).click())
    expect(useEditorPanelStore.getState().fondoEnEdicion?.configuracion.interactivo).toBe(false)

    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS))
    expect(actualizarMutateMock.mock.calls[0][0].configuracion.interactivo).toBe(false)
  })

  it('el slider publica al lienzo con retraso corto y persiste con el debounce', async () => {
    vi.useFakeTimers()
    render(arbol())
    const slider = screen.getByRole('slider', { name: 'Opacidad' })

    act(() => slider.focus())
    await act(async () => {
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()

    await act(() => vi.advanceTimersByTimeAsync(RETRASO_SLIDER_MS))
    expect(useEditorPanelStore.getState().fondoEnEdicion?.configuracion.opacidad).toBe(0.55)

    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS))
    expect(actualizarMutateMock.mock.calls[0][0].configuracion.opacidad).toBe(0.55)
  })

  it('si el PATCH falla muestra el error en el indicador', async () => {
    vi.useFakeTimers()
    actualizarMutateMock.mockRejectedValue(new Error('boom'))
    render(arbol())

    act(() => screen.getByRole('radio', { name: 'Lenta' }).click())
    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS))

    expect(screen.getByRole('status')).toHaveTextContent(/no se pudo guardar/i)
  })

  it('al desmontar con un cambio pendiente lo guarda de inmediato', async () => {
    const user = userEvent.setup()
    const { unmount } = render(arbol())

    await user.click(screen.getByRole('radio', { name: 'Lenta' }))
    expect(actualizarMutateMock).not.toHaveBeenCalled()
    unmount()

    await waitFor(() => expect(actualizarMutateMock).toHaveBeenCalledTimes(1))
    expect(actualizarMutateMock.mock.calls[0][0].configuracion.velocidad).toBe('lenta')
  })

  it('sin cambios no hace ningún PATCH', async () => {
    vi.useFakeTimers()
    const { unmount } = render(arbol())
    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS * 2))
    unmount()
    expect(actualizarMutateMock).not.toHaveBeenCalled()
  })

  it('un tipo aún sin guardar publica al lienzo pero espera a que exista para el PATCH', async () => {
    vi.useFakeTimers()
    fondosMock.data = []
    useEditorPanelStore.setState({ fondoSeleccionado: 'campo_estrellas' })
    const { rerender } = render(arbol())

    act(() => screen.getByRole('radio', { name: 'Lenta' }).click())
    expect(useEditorPanelStore.getState().fondoEnEdicion).toMatchObject({
      id: '',
      tipo: 'campo_estrellas',
    })
    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS * 2))
    expect(actualizarMutateMock).not.toHaveBeenCalled()

    // El servidor ya lo creó: el cambio pendiente se persiste.
    fondosMock.data = [{ ...FONDO_ACTIVO, id: 'fondo-9', tipo: 'campo_estrellas' }]
    rerender(arbol())
    await act(() => vi.advanceTimersByTimeAsync(RETRASO_GUARDADO_MS))
    expect(actualizarMutateMock).toHaveBeenCalledTimes(1)
    expect(actualizarMutateMock.mock.calls[0][0].configuracion.velocidad).toBe('lenta')
  })

  it('el fondo sólido no tiene controles', () => {
    useEditorPanelStore.setState({ fondoSeleccionado: 'solido' })
    render(arbol())
    expect(screen.getByText(/no tiene nada que ajustar/i)).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})
