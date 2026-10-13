import { render, screen } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import { LienzoPuck } from './LienzoPuck'
import { PLUGINS_EDITOR } from './plugins-editor'
import { PUCK_VIEWPORTS } from './puck-viewports'

type PropsPuckCapturadas = {
  plugins?: Array<{ name?: string; label?: string; render?: () => ReactNode }>
  overrides?: { headerActions?: ComponentType<{ children?: ReactNode }> }
  dictionary?: Record<string, string>
  headerTitle?: string
  height?: string
  viewports?: unknown
  ui?: { plugin?: { current: string | null } }
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

vi.mock('./usePuckEditor', () => ({
  usePuckEditor: (
    selector: (state: { appState: { ui: { plugin: { current: string } } } }) => unknown,
  ) => selector({ appState: { ui: { plugin: { current: pluginActivoMock.actual } } } }),
}))

vi.mock('./PanelTemaEditor', () => ({
  PanelTemaEditor: () => <div>Panel de tema</div>,
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
    useEditorPanelStore.setState({ pluginActivo: null })
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
})
