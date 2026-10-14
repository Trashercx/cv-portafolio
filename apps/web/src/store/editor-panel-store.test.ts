import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CLAVE_MODO_VISTA_PREVIA,
  useEditorPanelStore,
} from './editor-panel-store'

describe('editor-panel-store (Fase 7, UC-08)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useEditorPanelStore.setState({
      pluginActivo: null,
      modoVistaPrevia: null,
      fondoEnEdicion: null,
    })
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

  it('fondoEnEdicion arranca en null y se guarda con setFondoEnEdicion (Fase 7b, UC-15)', () => {
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
    const fondo = {
      id: 'f1',
      usuario_admin_id: 'a1',
      tipo: 'haces_luz' as const,
      configuracion: { velocidad: 'media' as const, opacidad: 0.4 },
      activo: false,
    }
    useEditorPanelStore.getState().setFondoEnEdicion(fondo)
    expect(useEditorPanelStore.getState().fondoEnEdicion).toEqual(fondo)
  })

  it('cambiar de plugin limpia fondoEnEdicion, pero repetir el mismo no (Fase 7b, UC-15)', () => {
    useEditorPanelStore.setState({ pluginActivo: 'fondo' })
    useEditorPanelStore.getState().setFondoEnEdicion({
      id: '',
      usuario_admin_id: '',
      tipo: 'aurora_mesh',
      configuracion: { velocidad: 'lenta', opacidad: 0.5 },
      activo: false,
    })

    useEditorPanelStore.getState().setPluginActivo('fondo')
    expect(useEditorPanelStore.getState().fondoEnEdicion).not.toBeNull()

    useEditorPanelStore.getState().setPluginActivo('tema')
    expect(useEditorPanelStore.getState().fondoEnEdicion).toBeNull()
  })
})

describe('vistaLimpia (Fase 7c, UC-07)', () => {
  it('parte en false, alterna y no se persiste en localStorage', () => {
    useEditorPanelStore.setState({ vistaLimpia: false })
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(false)
    useEditorPanelStore.getState().alternarVistaLimpia()
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(true)
    useEditorPanelStore.getState().setVistaLimpia(false)
    expect(useEditorPanelStore.getState().vistaLimpia).toBe(false)
    expect(Object.keys(window.localStorage)).not.toContain('vistaLimpia')
  })
})
