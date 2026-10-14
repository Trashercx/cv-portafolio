import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { CATALOGO_FONDOS } from '@/features/fondo-sitio/catalogo-fondos'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import { PanelFondoEditor } from './PanelFondoEditor'

const activarMutateMock = vi.fn()
const eliminarMutateMock = vi.fn()
const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()

const fondosMock: {
  data: FondoSitio[] | undefined
  isLoading: boolean
  error: unknown
} = {
  data: [],
  isLoading: false,
  error: null,
}

vi.mock('@/features/fondo-sitio/useFondosSitio', () => ({
  useFondosSitio: () => ({
    data: fondosMock.data,
    isLoading: fondosMock.isLoading,
    error: fondosMock.error,
  }),
  useActivarFondoSitio: () => ({ mutateAsync: activarMutateMock, isPending: false }),
  useEliminarFondoSitio: () => ({ mutate: eliminarMutateMock, isPending: false }),
  useCrearFondoSitio: () => ({ mutateAsync: crearMutateMock, isPending: false }),
  useActualizarFondoSitio: () => ({ mutateAsync: actualizarMutateMock, isPending: false }),
}))

vi.mock('@/features/tema/useTemas', () => ({
  useTemas: () => ({
    data: [
      {
        id: 't1',
        usuario_admin_id: 'a1',
        nombre: 'Prueba',
        color_primario: '#2563eb',
        color_secundario: '#64748b',
        color_fondo: '#ffffff',
        color_texto: '#111111',
        fuente_principal: 'manrope',
        modo: 'claro',
        activo: true,
      },
    ],
  }),
}))

// Los fondos reales (lazy, canvas) se prueban en `FondoAnimado.test.tsx`.
vi.mock('@/components/publico/FondoAnimado', () => ({
  FondoAnimado: ({
    fondo,
    modo,
  }: {
    fondo: { tipo: string; configuracion: { opacidad: number } }
    modo?: string
  }) => (
    <div
      data-testid="fondo-mock"
      data-tipo={fondo.tipo}
      data-modo={modo}
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

const FONDO_INACTIVO: FondoSitio = {
  ...FONDO_ACTIVO,
  id: 'fondo-2',
  tipo: 'particulas_red',
  activo: false,
}

function tarjeta(tipo: string) {
  return screen.getByTestId(`tarjeta-fondo-${tipo}`)
}

function renderPanel() {
  return render(
    <ThemeProvider>
      <PanelFondoEditor />
    </ThemeProvider>,
  )
}

/**
 * Plugin "Fondo" (UC-15, Fase 7b): galería de 20 tarjetas con miniatura en
 * vivo, Activar (crea + activa o solo activa), Ajustar (editor inline +
 * `fondoEnEdicion` en el store), Guardar (un solo PATCH) y Cancelar.
 */
describe('PanelFondoEditor (UC-15, Fase 7b)', () => {
  beforeEach(() => {
    fondosMock.data = []
    fondosMock.isLoading = false
    fondosMock.error = null
    useEditorPanelStore.setState({
      pluginActivo: null,
      modoVistaPrevia: null,
      fondoEnEdicion: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra la galería con las 20 tarjetas del catálogo aunque no haya fondos guardados', () => {
    renderPanel()

    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    for (const entrada of CATALOGO_FONDOS) {
      const t = within(tarjeta(entrada.tipo))
      expect(t.getByText(entrada.nombre)).toBeInTheDocument()
      expect(t.getByText(entrada.descripcion)).toBeInTheDocument()
    }
    expect(screen.queryByText('Activo')).not.toBeInTheDocument()
  })

  it('cada tarjeta lleva una miniatura en vivo en modo miniatura', () => {
    renderPanel()

    const miniaturas = screen.getAllByTestId('fondo-mock')
    expect(miniaturas).toHaveLength(20)
    for (const m of miniaturas) expect(m).toHaveAttribute('data-modo', 'miniatura')
  })

  it('marca "Interactivo" solo en los fondos interactivos', () => {
    renderPanel()

    expect(screen.getAllByText('Interactivo')).toHaveLength(14)
    expect(within(tarjeta('solido')).queryByText('Interactivo')).not.toBeInTheDocument()
    expect(within(tarjeta('degradado_grano')).queryByText('Interactivo')).not.toBeInTheDocument()
    expect(within(tarjeta('campo_estrellas')).getByText('Interactivo')).toBeInTheDocument()
  })

  it('la tarjeta del fondo activo lleva borde primary y la etiqueta "Activo"', () => {
    fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    renderPanel()

    expect(tarjeta('aurora_mesh')).toHaveClass('border-primary')
    expect(within(tarjeta('aurora_mesh')).getByText('Activo')).toBeInTheDocument()
    expect(within(tarjeta('aurora_mesh')).getByRole('button', { name: 'Activar' })).toBeDisabled()
    expect(tarjeta('particulas_red')).not.toHaveClass('border-primary')
    expect(screen.getAllByText('Activo')).toHaveLength(1)
  })

  it('"Activar" sobre un tipo ya guardado solo lo activa', async () => {
    fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    const user = userEvent.setup()
    renderPanel()

    await user.click(within(tarjeta('particulas_red')).getByRole('button', { name: 'Activar' }))

    expect(activarMutateMock).toHaveBeenCalledWith('fondo-2')
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('"Activar" sobre un tipo sin guardar lo crea con los valores por defecto y luego lo activa', async () => {
    crearMutateMock.mockResolvedValue({ id: 'nuevo-1' })
    const user = userEvent.setup()
    renderPanel()

    await user.click(within(tarjeta('haces_luz')).getByRole('button', { name: 'Activar' }))

    expect(crearMutateMock).toHaveBeenCalledTimes(1)
    expect(crearMutateMock.mock.calls[0][0]).toEqual({
      tipo: 'haces_luz',
      configuracion: { velocidad: 'media', opacidad: 0.5, intensidad: 'media', interactivo: true },
    })
    expect(activarMutateMock).toHaveBeenCalledWith('nuevo-1')
  })

  it('"Ajustar" abre el editor inline y publica el fondo en curso en el store', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    const user = userEvent.setup()
    renderPanel()

    expect(screen.queryByRole('region', { name: /ajustes de/i })).not.toBeInTheDocument()
    await user.click(within(tarjeta('aurora_mesh')).getByRole('button', { name: 'Ajustar' }))

    const editor = screen.getByRole('region', { name: 'Ajustes de Aurora mesh' })
    expect(within(editor).getByTestId('vista-previa-fondo')).toBeInTheDocument()
    expect(within(editor).getByRole('radiogroup', { name: 'Velocidad' })).toBeInTheDocument()
    expect(within(editor).getByRole('slider', { name: 'Opacidad' })).toBeInTheDocument()
    expect(within(editor).getByRole('radiogroup', { name: 'Intensidad' })).toBeInTheDocument()
    expect(within(editor).getByRole('switch', { name: 'Interactivo' })).toBeChecked()

    const enEdicion = useEditorPanelStore.getState().fondoEnEdicion
    expect(enEdicion).toMatchObject({
      id: 'fondo-1',
      tipo: 'aurora_mesh',
      configuracion: { velocidad: 'media', opacidad: 0.5, intensidad: 'media', interactivo: true },
    })
  })

  it('los controles actualizan el fondo en curso del store (velocidad, intensidad, interactivo y slider con retraso)', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    const user = userEvent.setup()
    renderPanel()
    await user.click(within(tarjeta('aurora_mesh')).getByRole('button', { name: 'Ajustar' }))
    const editor = screen.getByRole('region', { name: 'Ajustes de Aurora mesh' })

    await user.click(within(editor).getByRole('radio', { name: 'Rápida' }))
    expect(useEditorPanelStore.getState().fondoEnEdicion?.configuracion.velocidad).toBe('rapida')

    await user.click(within(within(editor).getByRole('radiogroup', { name: 'Intensidad' })).getByRole('radio', { name: 'Alta' }))
    expect(useEditorPanelStore.getState().fondoEnEdicion?.configuracion.intensidad).toBe('alta')

    await user.click(within(editor).getByRole('switch', { name: 'Interactivo' }))
    expect(useEditorPanelStore.getState().fondoEnEdicion?.configuracion.interactivo).toBe(false)

    const slider = within(editor).getByRole('slider', { name: 'Opacidad' })
    slider.focus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() =>
      expect(useEditorPanelStore.getState().fondoEnEdicion?.configuracion.opacidad).toBe(0.55),
    )
  })

  it('"Guardar" sobre un fondo existente hace un único PATCH con la configuración y limpia el store', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    actualizarMutateMock.mockResolvedValue({})
    const user = userEvent.setup()
    renderPanel()
    await user.click(within(tarjeta('aurora_mesh')).getByRole('button', { name: 'Ajustar' }))
    const editor = screen.getByRole('region', { name: 'Ajustes de Aurora mesh' })
    await user.click(within(editor).getByRole('radio', { name: 'Lenta' }))

    await user.click(within(editor).getByRole('button', { name: 'Guardar' }))

    expect(actualizarMutateMock).toHaveBeenCalledTimes(1)
    expect(actualizarMutateMock.mock.calls[0][0]).toEqual({
      configuracion: { velocidad: 'lenta', opacidad: 0.5, intensidad: 'media', interactivo: true },
    })
    expect(crearMutateMock).not.toHaveBeenCalled()
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
    expect(screen.queryByRole('region', { name: /ajustes de/i })).not.toBeInTheDocument()
  })

  it('"Guardar" sobre un tipo sin guardar crea el fondo y lo activa', async () => {
    crearMutateMock.mockResolvedValue({ id: 'nuevo-2' })
    const user = userEvent.setup()
    renderPanel()
    await user.click(within(tarjeta('campo_estrellas')).getByRole('button', { name: 'Ajustar' }))
    const editor = screen.getByRole('region', { name: 'Ajustes de Campo de estrellas' })

    await user.click(within(editor).getByRole('button', { name: 'Guardar' }))

    expect(crearMutateMock).toHaveBeenCalledTimes(1)
    expect(crearMutateMock.mock.calls[0][0]).toMatchObject({ tipo: 'campo_estrellas' })
    expect(activarMutateMock).toHaveBeenCalledWith('nuevo-2')
    expect(actualizarMutateMock).not.toHaveBeenCalled()
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
  })

  it('"Cancelar" cierra el editor, limpia el store y no guarda nada', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    const user = userEvent.setup()
    renderPanel()
    await user.click(within(tarjeta('aurora_mesh')).getByRole('button', { name: 'Ajustar' }))
    expect(useEditorPanelStore.getState().fondoEnEdicion).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
    expect(screen.queryByRole('region', { name: /ajustes de/i })).not.toBeInTheDocument()
    expect(actualizarMutateMock).not.toHaveBeenCalled()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('al desmontar el panel (cambio de plugin) el ajuste sin guardar se descarta', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    const user = userEvent.setup()
    const { unmount } = renderPanel()
    await user.click(within(tarjeta('aurora_mesh')).getByRole('button', { name: 'Ajustar' }))
    expect(useEditorPanelStore.getState().fondoEnEdicion).not.toBeNull()

    unmount()

    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
  })

  it('el fondo sólido no tiene nada que ajustar', () => {
    renderPanel()
    expect(within(tarjeta('solido')).getByRole('button', { name: 'Ajustar' })).toBeDisabled()
  })

  it('sin duplicados no muestra el desplegable "Fondos duplicados"', () => {
    fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    renderPanel()
    expect(screen.queryByText(/fondos duplicados/i)).not.toBeInTheDocument()
  })

  it('con dos fondos del mismo tipo usa el activo y permite eliminar el otro (con confirmación)', async () => {
    const duplicado: FondoSitio = { ...FONDO_ACTIVO, id: 'fondo-dup', activo: false }
    fondosMock.data = [duplicado, FONDO_ACTIVO]
    const user = userEvent.setup()
    renderPanel()

    expect(within(tarjeta('aurora_mesh')).getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText(/fondos duplicados \(1\)/i)).toBeInTheDocument()

    await user.click(screen.getByText(/fondos duplicados/i))
    await user.click(screen.getByRole('button', { name: /eliminar/i }))
    const dialogo = await screen.findByRole('alertdialog')
    await user.click(within(dialogo).getByRole('button', { name: /^eliminar$/i }))

    expect(eliminarMutateMock).toHaveBeenCalledWith('fondo-dup')
  })

  it('un tipo antiguo de datos sin migrar se agrupa bajo su reemplazo', () => {
    fondosMock.data = [{ ...FONDO_ACTIVO, tipo: 'aurora_animada' as unknown as FondoSitio['tipo'] }]
    renderPanel()
    expect(within(tarjeta('aurora_mesh')).getByText('Activo')).toBeInTheDocument()
  })

  it('muestra el estado de carga y los errores de la consulta', () => {
    fondosMock.isLoading = true
    fondosMock.error = new Error('boom')
    renderPanel()
    expect(screen.getByText(/cargando fondos/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudieron cargar los fondos/i)
  })
})
