import type { Plugin } from '@puckeditor/core'
import { Palette, Sparkles } from 'lucide-react'
import { PanelFondoEditor } from './PanelFondoEditor'
import { PanelTemaEditor } from './PanelTemaEditor'

/**
 * Plugins propios del rail de Puck (Fase 7, UC-07/UC-08): `tema` y `fondo`
 * montan los paneles que antes vivían en pestañas del panel derecho
 * (`PanelLateralEditor`, eliminado). Los plugins core `blocks` (Bloques),
 * `outline` (Esquema) y `fields` (Campos) los añade Puck por su cuenta:
 * `Layout` antepone `blocksPlugin`/`outlinePlugin` y agrega `fieldsPlugin` si
 * no se pasó uno (confirmado en `node_modules/@puckeditor/core/dist`); su
 * etiqueta sale de `dictionary` (`plugin-blocks`, `plugin-outline`,
 * `plugin-fields`).
 *
 * El array y las funciones `render` son constantes de módulo a propósito:
 * Puck usa `render` como componente (`<Render />`), así que una función
 * nueva en cada render remontaría el panel y perdería el estado de sus
 * formularios.
 */
export const PLUGIN_TEMA = 'tema'
export const PLUGIN_FONDO = 'fondo'

function PluginTema() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-fina">
      <PanelTemaEditor />
    </div>
  )
}

function PluginFondo() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-fina">
      <PanelFondoEditor />
    </div>
  )
}

export const PLUGINS_EDITOR: Plugin[] = [
  {
    name: PLUGIN_TEMA,
    label: 'Tema',
    icon: <Palette />,
    render: () => <PluginTema />,
  },
  {
    name: PLUGIN_FONDO,
    label: 'Fondo',
    icon: <Sparkles />,
    render: () => <PluginFondo />,
  },
]
