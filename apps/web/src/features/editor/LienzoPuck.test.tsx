import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import { LienzoPuck } from './LienzoPuck'
import { PLUGINS_EDITOR } from './plugins-editor'
import { PUCK_VIEWPORTS } from './puck-viewports'

type PropsPuckCapturadas = {
  plugins?: Array<{ name?: string; label?: string; render?: () => ReactNode }>
  overrides?: {
    headerActions?: ComponentType<{ children?: ReactNode }>
    fields?: ComponentType<{ children?: ReactNode; itemSelector?: unknown }>
  }
  dictionary?: Record<string, string>
  headerTitle?: string
  height?: string
  viewports?: unknown
  ui?: {
    plugin?: { current: string | null }
    viewports?: { current: { width: number | string; height: number | string } }
  }
  onAction?: (action: { type: string }) => void
}

const propsPuck: { actual: PropsPuckCapturadas } = { actual: {} }

/**
 * Montar un `<Puck>` real en jsdom no aporta valor (DnD, iframe, portales):
 * se stubea `Puck` para capturar las props con las que `LienzoPuck` lo
 * configura (plugins, overrides, dictionary, viewports, ...) y para renderizar
 * `overrides.headerActions` como lo haría el header nativo. `usePuckEditor`
 * se stubea con un plugin activo controlable.
 */
vi.mock('@puckeditor/core', () => ({
  Puck: (props: PropsPuckCapturadas) => {
    propsPuck.actual = props
    const HeaderActions = props.overrides?.headerActions
    return (
      <div data-testid="puck">
        {HeaderActions ? (
          <HeaderActions>
            <button type="button">Publicar nativo</button>
          </HeaderActions>
        ) : null}
      </div>
    )
  },
}))

const pluginActivoMock: { actual: string } = { actual: 'blocks' }

const itemSelectorMock: { actual: unknown } = { actual: null }

const previewModeMock: { actual: 'edit' | 'interactive' } = { actual: 'edit' }
const dispatchMock = vi.fn()

const viewportMock: { actual: { width: number; height: number | 'auto' } | undefined } = {
  actual: { width: 1280, height: 'auto' },
}

vi.mock('./usePuckEditor', () => ({
  usePuckEditor: (selector: (state: unknown) => unknown) =>
    selector({
      dispatch: dispatchMock,
      appState: {
        ui: {
          previewMode: previewModeMock.actual,
          itemSelector: itemSelectorMock.actual,
          plugin: { current: pluginActivoMock.actual },
          viewports: { current: viewportMock.actual },
        },
      },
    }),
}))

vi.mock('./PanelTemaEditor', () => ({
  PanelTemaEditor: () => <div>Panel de tema</div>,
}))
vi.mock('./PanelAjustesFondo', () => ({
  PanelAjustesFondo: () => <div>Ajustes del fondo</div>,
}))
vi.mock('./PanelFondoEditor', () => ({
  PanelFondoEditor: () => <div>Panel de fondo</div>,
}))

function renderLienzo(toolbar: ReactNode = null, onCambio?: () => void) {
  return render(
    <LienzoPuck
      data={{ content: [], root: {} }}
      metadata={undefined}
      editorKey={0}
      onChange={() => {}}
      toolbar={toolbar}
      onCambio={onCambio}
    />,
  )
}

describe('LienzoPuck (layout nativo con rail de plugins)', () => {
  beforeEach(() => {
    propsPuck.actual = {}
    pluginActivoMock.actual = 'blocks'
    viewportMock.actual = { width: 1280, height: 'auto' }
    previewModeMock.actual = 'edit'
    itemSelectorMock.actual = null
    dispatchMock.mockClear()
    useEditorPanelStore.setState({
      pluginActivo: null,
      viewportActual: null,
      vistaLimpia: false,
      fondoSeleccionado: null,
      fondoEnEdicion: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('monta el toolbar en overrides.headerActions y no pinta el botón nativo de Puck', () => {
    renderLienzo(<button type="button">Guardar cambios</button>)

    expect(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Publicar nativo' }),
    ).not.toBeInTheDocument()
  })

  it('configura los plugins propios tema y fondo, los viewports, el título y el diccionario en español', () => {
    renderLienzo()

    const { plugins, viewports, headerTitle, dictionary, height } = propsPuck.actual
    expect(plugins?.map((plugin) => plugin.name)).toEqual(['tema', 'fondo'])
    expect(plugins?.map((plugin) => plugin.label)).toEqual(['Tema', 'Fondo'])
    expect(viewports).toBe(PUCK_VIEWPORTS)
    expect(PUCK_VIEWPORTS.map((v) => v.width)).toEqual([360, 768, 1280, '100%'])
    expect(headerTitle).toBe('Editor visual')
    expect(height).toBe('100%')
    expect(dictionary?.['plugin-blocks']).toBe('Bloques')
    expect(dictionary?.['plugin-outline']).toBe('Esquema')
    expect(dictionary?.['plugin-fields']).toBe('Campos')
  })

  it('los plugins tema y fondo montan PanelTemaEditor y PanelFondoEditor', () => {
    const [tema, fondo] = PLUGINS_EDITOR
    render(<>{tema.render?.()}</>)
    expect(screen.getByText('Panel de tema')).toBeInTheDocument()
    render(<>{fondo.render?.()}</>)
    expect(screen.getByText('Panel de fondo')).toBeInTheDocument()
  })

  it('abre el plugin pedido por ?panel= (guardado en el store) como ui.plugin.current inicial', () => {
    useEditorPanelStore.setState({ pluginActivo: 'fondo' })
    renderLienzo()
    expect(propsPuck.actual.ui?.plugin?.current).toBe('fondo')
  })

  it('sin bloque seleccionado el panel de campos muestra la guía en vez de los campos de la raíz; con bloque, sus campos', () => {
    renderLienzo()
    const Campos = propsPuck.actual.overrides?.fields as ComponentType<{
      children?: ReactNode
      itemSelector?: unknown
    }>

    const sin = render(
      <Campos itemSelector={null}>
        <div>Campos de la raíz</div>
      </Campos>,
    )
    expect(screen.getByText(/selecciona un bloque en el lienzo/i)).toBeInTheDocument()
    expect(screen.queryByText('Campos de la raíz')).not.toBeInTheDocument()
    sin.unmount()

    render(
      <Campos itemSelector={{ index: 0, zone: 'root:default-zone' }}>
        <div>Campos del bloque</div>
      </Campos>,
    )
    expect(screen.getByText('Campos del bloque')).toBeInTheDocument()
  })

  it('onCambio se invoca solo con acciones de Puck que editan datos', () => {
    const onCambio = vi.fn()
    renderLienzo(null, onCambio)
    const onAction = propsPuck.actual.onAction

    for (const tipo of ['setUi', 'set', 'registerZone', 'unregisterZone']) {
      onAction?.({ type: tipo })
    }
    expect(onCambio).not.toHaveBeenCalled()

    for (const tipo of ['insert', 'move', 'reorder', 'replace', 'replaceRoot', 'remove', 'duplicate', 'setData']) {
      onAction?.({ type: tipo })
    }
    expect(onCambio).toHaveBeenCalledTimes(8)
  })

  it('recuerda en el store el plugin activo del rail para sobrevivir al remount tras guardar', () => {
    pluginActivoMock.actual = 'tema'
    renderLienzo()
    expect(useEditorPanelStore.getState().pluginActivo).toBe('tema')
  })

  it('recuerda el viewport actual y lo restaura en el ui inicial al remontar <Puck>', () => {
    viewportMock.actual = { width: 360, height: 'auto' }
    const { unmount } = renderLienzo()
    expect(useEditorPanelStore.getState().viewportActual).toEqual({
      width: 360,
      height: 'auto',
    })
    unmount()

    renderLienzo()
    expect(propsPuck.actual.ui?.viewports?.current).toEqual({ width: 360, height: 'auto' })
  })

  it('sin viewport recordado arranca en escritorio (1280)', () => {
    viewportMock.actual = undefined
    renderLienzo()
    expect(propsPuck.actual.ui?.viewports?.current).toEqual({ width: 1280, height: 'auto' })
  })
})

describe('Vista limpia (Fase 7c, UC-07)', () => {
  beforeEach(() => {
    propsPuck.actual = {}
    previewModeMock.actual = 'edit'
    dispatchMock.mockClear()
    useEditorPanelStore.setState({ pluginActivo: null, viewportActual: null, vistaLimpia: false })
  })

  it('el toggle del toolbar alterna vistaLimpia y aria-pressed', async () => {
    const user = userEvent.setup()
    renderLienzo()
    const boton = screen.getByRole('button', { name: /vista limpia/i })
    expect(boton).toHaveAttribute('aria-pressed', 'false')

    await user.click(boton)
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(true)
    expect(screen.getByRole('button', { name: /vista limpia/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /vista limpia/i }))
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(false)
  })

  it('activa despacha setUi con previewMode interactive', () => {
    useEditorPanelStore.setState({ vistaLimpia: true })
    renderLienzo()
    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'setUi',
      ui: { previewMode: 'interactive' },
    })
  })

  it('desactiva (con Puck aún en interactive) despacha setUi con previewMode edit', () => {
    previewModeMock.actual = 'interactive'
    renderLienzo()
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'setUi', ui: { previewMode: 'edit' } })
  })

  it('sin cambios de modo no despacha nada', () => {
    renderLienzo()
    expect(dispatchMock).not.toHaveBeenCalled()
  })

  it('el panel de campos muestra el aviso mientras está activa, aun con bloque seleccionado', () => {
    useEditorPanelStore.setState({ vistaLimpia: true })
    renderLienzo()
    const Campos = propsPuck.actual.overrides?.fields as ComponentType<{
      children?: ReactNode
      itemSelector?: unknown
    }>
    render(
      <Campos itemSelector={{ index: 0, zone: 'root:default-zone' }}>
        <div>Campos del bloque</div>
      </Campos>,
    )
    expect(
      screen.getByText('Vista limpia: desactívala para seleccionar bloques'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Campos del bloque')).not.toBeInTheDocument()
  })

  it('Ctrl+Shift+L (y Cmd+Shift+L) alterna la vista limpia; Ctrl+L solo, no', () => {
    renderLienzo()
    fireEvent.keyDown(document, { key: 'L', ctrlKey: true, shiftKey: true })
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(true)
    fireEvent.keyDown(document, { key: 'l', metaKey: true, shiftKey: true })
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(false)
    fireEvent.keyDown(document, { key: 'l', ctrlKey: true })
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(false)
  })

  it('se desactiva sola al desmontar el editor (cambio de ruta) y quita el atajo', () => {
    useEditorPanelStore.setState({ vistaLimpia: true })
    const { unmount } = renderLienzo()
    unmount()
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(false)
    fireEvent.keyDown(document, { key: 'L', ctrlKey: true, shiftKey: true })
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(false)
  })
})

type CamposProps = { children?: ReactNode; itemSelector?: unknown }

function renderCampos(itemSelector: unknown) {
  renderLienzo()
  const Campos = propsPuck.actual.overrides?.fields as ComponentType<CamposProps>
  return render(
    <Campos itemSelector={itemSelector}>
      <div>Campos del bloque</div>
    </Campos>,
  )
}

describe('Panel derecho con el plugin Fondo (Fase 7l, UC-15)', () => {
  beforeEach(() => {
    propsPuck.actual = {}
    pluginActivoMock.actual = 'fondo'
    itemSelectorMock.actual = null
    previewModeMock.actual = 'edit'
    dispatchMock.mockClear()
    useEditorPanelStore.setState({
      pluginActivo: 'fondo',
      viewportActual: null,
      vistaLimpia: false,
      fondoSeleccionado: null,
      fondoEnEdicion: null,
    })
  })

  afterEach(() => {
    pluginActivoMock.actual = 'blocks'
    itemSelectorMock.actual = null
  })

  it('con un fondo seleccionado y sin bloque muestra los ajustes del fondo', () => {
    useEditorPanelStore.setState({ fondoSeleccionado: 'aurora_mesh' })
    renderCampos(null)
    expect(screen.getByText('Ajustes del fondo')).toBeInTheDocument()
    expect(screen.queryByText('Campos del bloque')).not.toBeInTheDocument()
  })

  it('con un bloque seleccionado muestra los campos del bloque, no los del fondo', () => {
    useEditorPanelStore.setState({ fondoSeleccionado: 'aurora_mesh' })
    renderCampos({ index: 0, zone: 'root:default-zone' })
    expect(screen.getByText('Campos del bloque')).toBeInTheDocument()
    expect(screen.queryByText('Ajustes del fondo')).not.toBeInTheDocument()
  })

  it('sin fondo seleccionado pide elegir uno en la galería', () => {
    renderCampos(null)
    expect(screen.getByText(/elige un fondo en la galería/i)).toBeInTheDocument()
  })

  it('con Vista limpia los ajustes del fondo siguen disponibles (no afecta al fondo)', () => {
    useEditorPanelStore.setState({ fondoSeleccionado: 'aurora_mesh', vistaLimpia: true })
    renderCampos(null)
    expect(screen.getByText('Ajustes del fondo')).toBeInTheDocument()
  })

  it('fuera del plugin Fondo, un fondo seleccionado no desplaza la guía de bloques', () => {
    pluginActivoMock.actual = 'blocks'
    useEditorPanelStore.setState({ pluginActivo: 'blocks', fondoSeleccionado: 'aurora_mesh' })
    renderCampos(null)
    expect(screen.getByText(/selecciona un bloque en el lienzo/i)).toBeInTheDocument()
  })

  it('al seleccionar un bloque en el lienzo se descarta el fondo elegido y el fondo en curso', () => {
    useEditorPanelStore.setState({
      fondoSeleccionado: 'aurora_mesh',
      fondoEnEdicion: { id: 'f1' } as never,
    })
    itemSelectorMock.actual = { index: 0, zone: 'root:default-zone' }
    renderLienzo()
    expect(useEditorPanelStore.getState().fondoSeleccionado).toBeNull()
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
  })

  it('sin bloque seleccionado no toca el fondo elegido', () => {
    useEditorPanelStore.setState({ fondoSeleccionado: 'aurora_mesh' })
    renderLienzo()
    expect(useEditorPanelStore.getState().fondoSeleccionado).toBe('aurora_mesh')
  })
})
