import { render, screen } from '@testing-library/react'
import type { PuckContext } from '@puckeditor/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'
import { PuckRoot } from './PuckRoot'

/**
 * Tema claro con valores reconocibles: el oscuro se deriva
 * (`lib/tema-oscuro.ts`), así que `--color-fondo` cambia al invertir el modo.
 */
const TEMA = {
  id: 't1',
  usuario_admin_id: 'a1',
  nombre: 'Prueba',
  color_primario: '#2563eb',
  color_secundario: '#64748b',
  color_fondo: '#ffffff',
  color_texto: '#111111',
  fuente_principal: 'manrope',
  modo: 'claro' as const,
  activo: true,
}

const puck = {
  metadata: {
    datos: {
      perfil: null,
      tema: TEMA,
      proyectos: [],
      certificaciones: [],
      logros: [],
      redes_sociales: [],
      skills: [],
      fondo: null,
      mediaPorId: {},
    },
  },
} as unknown as PuckContext

function renderRoot(temaPanel: 'light' | 'dark') {
  window.localStorage.setItem('panel-admin-theme', temaPanel)
  return render(
    <ThemeProvider>
      <PuckRoot puck={puck}>
        <p>Contenido del lienzo</p>
      </PuckRoot>
    </ThemeProvider>,
  )
}

function contenedor() {
  return screen.getByText('Contenido del lienzo').closest('div.relative.min-h-svh') as HTMLElement
}

describe('PuckRoot — modo de la vista previa (Fase 7, UC-08)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useEditorPanelStore.setState({ modoVistaPrevia: null })
    useEditorSeccionesStore.setState({ accionGuardar: null })
  })

  it('sin override sigue al panel: panel claro, lienzo sin clase dark y con el fondo claro del tema', () => {
    renderRoot('light')
    expect(contenedor()).not.toHaveClass('dark')
    expect(contenedor().style.getPropertyValue('--color-fondo')).toBe('#ffffff')
  })

  it('sin override sigue al panel: panel oscuro, lienzo con clase dark', () => {
    renderRoot('dark')
    expect(contenedor()).toHaveClass('dark')
  })

  it('panel claro + override oscuro: el lienzo lleva la clase dark y las variables del tema oscuro', () => {
    useEditorPanelStore.setState({ modoVistaPrevia: 'oscuro' })
    renderRoot('light')

    expect(contenedor()).toHaveClass('dark')
    expect(contenedor().style.getPropertyValue('--color-fondo')).not.toBe('#ffffff')
  })

  it('panel oscuro + override claro: el lienzo no lleva la clase dark y usa las variables claras', () => {
    useEditorPanelStore.setState({ modoVistaPrevia: 'claro' })
    renderRoot('dark')

    expect(contenedor()).not.toHaveClass('dark')
    expect(contenedor().style.getPropertyValue('--color-fondo')).toBe('#ffffff')
  })

  it('inyecta la scrollbar fina del documento del iframe', () => {
    const { container } = renderRoot('light')
    const estilo = container.querySelector('style')
    expect(estilo?.textContent).toContain('scrollbar-width: thin')
  })

  it('Ctrl+S dentro del documento del lienzo dispara la acción de guardado registrada y cancela el atajo del navegador', () => {
    let llamadas = 0
    useEditorSeccionesStore.setState({ accionGuardar: () => (llamadas += 1) })
    renderRoot('light')

    const evento = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(evento)

    expect(llamadas).toBe(1)
    expect(evento.defaultPrevented).toBe(true)
  })
})
