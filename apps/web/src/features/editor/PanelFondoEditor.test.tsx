import { act, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { CATALOGO_FONDOS } from '@/features/fondo-sitio/catalogo-fondos'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import { ApiError } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import { PanelFondoEditor } from './PanelFondoEditor'

const activarMutateMock = vi.fn()
const eliminarMutateMock = vi.fn()
const crearMutateMock = vi.fn()
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const apiFetchMock = vi.hoisted(() => vi.fn())
// Fase 7m (#65): con `usarActivarReal` el hook de activar es el verdadero (con
// su `meta` y el `MutationCache` real) para comprobar los avisos.
const estado = { usarActivarReal: false }

vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-client')>()),
  apiFetch: apiFetchMock,
}))

const fondosMock: {
  data: FondoSitio[] | undefined
  isLoading: boolean
  error: unknown
} = {
  data: [],
  isLoading: false,
  error: null,
}

vi.mock('@/features/fondo-sitio/useFondosSitio', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/features/fondo-sitio/useFondosSitio')>()
  return {
    useFondosSitio: () => ({
      data: fondosMock.data,
      isLoading: fondosMock.isLoading,
      error: fondosMock.error,
    }),
  useActivarFondoSitio: (opciones?: { silencioso?: boolean }) =>
    estado.usarActivarReal
      ? real.useActivarFondoSitio(opciones)
      : { mutateAsync: activarMutateMock, isPending: false },
  useEliminarFondoSitio: () => ({ mutate: eliminarMutateMock, isPending: false }),
  useCrearFondoSitio: () => ({ mutateAsync: crearMutateMock, isPending: false }),
  }
})

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

/** Cada tarjeta es el `<button>` completo (Fase 7l). */
function tarjeta(tipo: string) {
  return screen.getByTestId(`tarjeta-fondo-${tipo}`)
}

function renderPanel() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PanelFondoEditor />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

/**
 * Plugin "Fondo" (UC-15, Fase 7b; tarjeta-botón en la Fase 7l): galería de 20
 * tarjetas con miniatura en vivo; pulsar una tarjeta crea + activa o activa,
 * la selecciona (`fondoSeleccionado`) y la publica al lienzo (`fondoEnEdicion`).
 * Los ajustes viven en `PanelAjustesFondo` (su propio test).
 */
describe('PanelFondoEditor (UC-15, Fase 7l)', () => {
  beforeEach(() => {
    fondosMock.data = []
    fondosMock.isLoading = false
    fondosMock.error = null
    useEditorPanelStore.setState({
      pluginActivo: null,
      modoVistaPrevia: null,
      fondoEnEdicion: null,
      fondoSeleccionado: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    estado.usarActivarReal = false
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

  it('cada tarjeta es un botón completo con aria-pressed, sin botones "Activar"/"Ajustar"', () => {
    renderPanel()

    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(20)
    for (const entrada of CATALOGO_FONDOS) {
      const t = tarjeta(entrada.tipo)
      expect(t.tagName).toBe('BUTTON')
      expect(t).toHaveAttribute('type', 'button')
    }
    expect(screen.queryByRole('button', { name: 'Activar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajustar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
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
    expect(tarjeta('particulas_red')).not.toHaveClass('border-primary')
    expect(screen.getAllByText('Activo')).toHaveLength(1)
  })

  it('al montar, el fondo activo queda preseleccionado y publicado al lienzo', async () => {
    fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    renderPanel()

    await waitFor(() =>
      expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('aurora_mesh'),
    )
    expect(tarjeta('aurora_mesh')).toHaveAttribute('aria-pressed', 'true')
    expect(tarjeta('aurora_mesh')).toHaveClass('ring-primary')
    expect(tarjeta('particulas_red')).toHaveAttribute('aria-pressed', 'false')
    expect(useEditorPanelStore.getState().fondoEnEdicion).toMatchObject({
      id: 'fondo-1',
      tipo: 'aurora_mesh',
    })
    // Preseleccionar no activa ni crea nada.
    expect(activarMutateMock).not.toHaveBeenCalled()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('sin fondo activo no preselecciona nada', () => {
    fondosMock.data = [FONDO_INACTIVO]
    renderPanel()
    expect(useEditorPanelStore.getState().fondoSeleccionado).toBeNull()
  })

  it('pulsar un tipo guardado e inactivo lo activa, lo selecciona y lo publica al lienzo con su configuración', async () => {
    fondosMock.data = [
      FONDO_ACTIVO,
      { ...FONDO_INACTIVO, configuracion: { velocidad: 'rapida', opacidad: 0.8 } },
    ]
    const user = userEvent.setup()
    renderPanel()

    await user.click(tarjeta('particulas_red'))

    expect(activarMutateMock).toHaveBeenCalledWith('fondo-2')
    expect(crearMutateMock).not.toHaveBeenCalled()
    expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('particulas_red')
    expect(useEditorPanelStore.getState().fondoEnEdicion).toMatchObject({
      id: 'fondo-2',
      tipo: 'particulas_red',
      configuracion: { velocidad: 'rapida', opacidad: 0.8 },
    })
    expect(tarjeta('particulas_red')).toHaveAttribute('aria-pressed', 'true')
  })

  it('pulsar el fondo que ya está activo solo lo selecciona (sin llamar al API)', async () => {
    fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    const user = userEvent.setup()
    renderPanel()
    await user.click(tarjeta('particulas_red'))
    activarMutateMock.mockClear()

    await user.click(tarjeta('aurora_mesh'))

    expect(activarMutateMock).not.toHaveBeenCalled()
    expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('aurora_mesh')
  })

  it('pulsar un tipo sin guardar lo crea con los valores por defecto, lo activa, lo selecciona y lo publica al lienzo', async () => {
    crearMutateMock.mockResolvedValue({ id: 'nuevo-1' })
    const user = userEvent.setup()
    renderPanel()

    await user.click(tarjeta('haces_luz'))

    const porDefecto = {
      velocidad: 'media',
      opacidad: 0.5,
      intensidad: 'media',
      interactivo: true,
    }
    expect(crearMutateMock).toHaveBeenCalledTimes(1)
    expect(crearMutateMock.mock.calls[0][0]).toEqual({
      tipo: 'haces_luz',
      configuracion: porDefecto,
    })
    expect(activarMutateMock).toHaveBeenCalledWith('nuevo-1')
    expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('haces_luz')
    expect(useEditorPanelStore.getState().fondoEnEdicion).toMatchObject({
      tipo: 'haces_luz',
      configuracion: porDefecto,
    })
  })

  it('la selección llega al lienzo antes de que responda el servidor (el fondo no espera)', async () => {
    crearMutateMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPanel()

    await user.click(tarjeta('haces_luz'))

    expect(useEditorPanelStore.getState().fondoEnEdicion?.tipo).toBe('haces_luz')
    expect(activarMutateMock).not.toHaveBeenCalled()
  })

  it('si crear falla no se intenta activar y la selección se mantiene', async () => {
    crearMutateMock.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPanel()

    await user.click(tarjeta('haces_luz'))

    expect(activarMutateMock).not.toHaveBeenCalled()
    expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('haces_luz')
  })

  it('al desmontar el panel (cambio de plugin) se descartan la selección y el fondo en curso', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    const { unmount } = renderPanel()
    await waitFor(() =>
      expect(useEditorPanelStore.getState().fondoSeleccionado).not.toBeNull(),
    )

    unmount()

    expect(useEditorPanelStore.getState().fondoSeleccionado).toBeNull()
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
  })

  it('cambiar de plugin en el store limpia la selección (setPluginActivo)', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    useEditorPanelStore.getState().setPluginActivo('fondo')
    renderPanel()
    await waitFor(() =>
      expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('aurora_mesh'),
    )

    act(() => useEditorPanelStore.getState().setPluginActivo('blocks'))

    expect(useEditorPanelStore.getState().fondoSeleccionado).toBeNull()
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
  })

  it('si el rail activa el plugin después de montar el panel, la preselección se repite', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    renderPanel()
    await waitFor(() =>
      expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('aurora_mesh'),
    )

    // `SincronizadorPlugin` llama a `setPluginActivo('fondo')` y limpia la selección.
    act(() => useEditorPanelStore.getState().setPluginActivo('fondo'))

    await waitFor(() =>
      expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('aurora_mesh'),
    )
  })

  it('si un bloque limpia la selección con el panel abierto, no se vuelve a preseleccionar', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    useEditorPanelStore.getState().setPluginActivo('fondo')
    renderPanel()
    await waitFor(() =>
      expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('aurora_mesh'),
    )

    act(() => useEditorPanelStore.getState().setFondoSeleccionado(null))

    expect(useEditorPanelStore.getState().fondoSeleccionado).toBeNull()
    expect(tarjeta('aurora_mesh')).toHaveAttribute('aria-pressed', 'false')
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

  describe('avisos al elegir un fondo (Fase 7m, #65)', () => {
    beforeEach(() => {
      estado.usarActivarReal = true
      fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    })

    it('pulsar una tarjeta no dispara toast de éxito ni abre diálogos', async () => {
      apiFetchMock.mockResolvedValue({ ...FONDO_INACTIVO, activo: true })
      const user = userEvent.setup()
      renderPanel()

      await user.click(tarjeta('particulas_red'))

      await waitFor(() =>
        expect(apiFetchMock).toHaveBeenCalledWith('/admin/fondos/fondo-2/activar', {
          method: 'PATCH',
        }),
      )
      // Deja resolver la mutación y el `import('sonner')` diferido.
      await new Promise((r) => setTimeout(r, 50))
      expect(toastMock.success).not.toHaveBeenCalled()
      expect(toastMock.error).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('un error del API sí muestra el toast de error', async () => {
      apiFetchMock.mockRejectedValue(new ApiError('Fallo al activar', 500, '/admin/fondos/fondo-2/activar'))
      const user = userEvent.setup()
      renderPanel()

      await user.click(tarjeta('particulas_red'))

      await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Fallo al activar'))
      expect(toastMock.success).not.toHaveBeenCalled()
    })
  })
})
