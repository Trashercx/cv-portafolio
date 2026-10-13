import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CLAVE_MODO_VISTA_PREVIA,
  useEditorPanelStore,
} from './editor-panel-store'

describe('editor-panel-store (Fase 7, UC-08)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useEditorPanelStore.setState({ pluginActivo: null, modoVistaPrevia: null })
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('arranca sin plugin activo y siguiendo el modo del panel (null)', () => {
    const { pluginActivo, modoVistaPrevia } = useEditorPanelStore.getState()
    expect(pluginActivo).toBeNull()
    expect(modoVistaPrevia).toBeNull()
  })

  it('setModoVistaPrevia cambia el estado y lo persiste en localStorage (editor-modo-vista-previa)', () => {
    expect(CLAVE_MODO_VISTA_PREVIA).toBe('editor-modo-vista-previa')

    useEditorPanelStore.getState().setModoVistaPrevia('oscuro')
    expect(useEditorPanelStore.getState().modoVistaPrevia).toBe('oscuro')
    expect(window.localStorage.getItem('editor-modo-vista-previa')).toBe('oscuro')

    useEditorPanelStore.getState().setModoVistaPrevia('claro')
    expect(window.localStorage.getItem('editor-modo-vista-previa')).toBe('claro')
  })

  it('setModoVistaPrevia(null) vuelve a seguir al panel y borra la clave', () => {
    useEditorPanelStore.getState().setModoVistaPrevia('oscuro')
    useEditorPanelStore.getState().setModoVistaPrevia(null)

    expect(useEditorPanelStore.getState().modoVistaPrevia).toBeNull()
    expect(window.localStorage.getItem('editor-modo-vista-previa')).toBeNull()
  })

  it('restaura el modo guardado al crear el store (recarga de la página)', async () => {
    window.localStorage.setItem('editor-modo-vista-previa', 'oscuro')
    vi.resetModules()
    const { useEditorPanelStore: recargado } = await import('./editor-panel-store')
    expect(recargado.getState().modoVistaPrevia).toBe('oscuro')
  })

  it('ignora valores inválidos guardados en localStorage', async () => {
    window.localStorage.setItem('editor-modo-vista-previa', 'sepia')
    vi.resetModules()
    const { useEditorPanelStore: recargado } = await import('./editor-panel-store')
    expect(recargado.getState().modoVistaPrevia).toBeNull()
  })

  it('setPluginActivo guarda el plugin del rail', () => {
    useEditorPanelStore.getState().setPluginActivo('tema')
    expect(useEditorPanelStore.getState().pluginActivo).toBe('tema')
  })
})
