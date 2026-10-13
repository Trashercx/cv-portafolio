import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create } from 'zustand'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import { PanelLateralEditor } from './PanelLateralEditor'

type SelectedItemFalso = { type: string; props: { id: string } } | null

/**
 * Store de zustand propio (no el real de Puck) para poder disparar
 * transiciones de selección de forma controlada, igual que haría el store
 * interno real que expone `usePuck`/`usePuckEditor` — se mockea el módulo
 * entero (`./usePuckEditor`), no `@measured/puck`, porque esta suite no
 * necesita ejercitar nada del lienzo real, solo la lógica de pestañas.
 */
const usePuckStoreFalso = create<{ selectedItem: SelectedItemFalso }>(() => ({
  selectedItem: null,
}))

vi.mock('./usePuckEditor', () => ({
  usePuckEditor: (selector: (state: { selectedItem: SelectedItemFalso }) => unknown) =>
    usePuckStoreFalso(selector),
}))

vi.mock('./PanelBloqueSeleccionado', () => ({
  PanelBloqueSeleccionado: () => <div>Contenido de Bloque</div>,
}))
vi.mock('./PanelTemaEditor', () => ({
  PanelTemaEditor: () => <div>Contenido de Tema</div>,
}))
vi.mock('./PanelFondoEditor', () => ({
  PanelFondoEditor: () => <div>Contenido de Fondo</div>,
}))

describe('PanelLateralEditor (Fase 5, panel unificado)', () => {
  beforeEach(() => {
    usePuckStoreFalso.setState({ selectedItem: null })
    useEditorPanelStore.setState({ pestanaActiva: 'bloque' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('arranca en la pestaña "Bloque"', () => {
    render(<PanelLateralEditor />)

    expect(screen.getByText('Contenido de Bloque')).toBeInTheDocument()
  })

  it('cambia a "Tema" y "Fondo" al hacer click en sus pestañas', async () => {
    const user = userEvent.setup()
    render(<PanelLateralEditor />)

    await user.click(screen.getByRole('tab', { name: 'Tema' }))
    expect(screen.getByText('Contenido de Tema')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Fondo' }))
    expect(screen.getByText('Contenido de Fondo')).toBeInTheDocument()
  })

  it('cambia automáticamente a "Bloque" en la transición sin-selección → selección concreta', () => {
    useEditorPanelStore.setState({ pestanaActiva: 'tema' })
    render(<PanelLateralEditor />)
    expect(useEditorPanelStore.getState().pestanaActiva).toBe('tema')

    act(() => {
      usePuckStoreFalso.setState({
        selectedItem: { type: 'hero', props: { id: 'seccion-1' } },
      })
    })

    expect(useEditorPanelStore.getState().pestanaActiva).toBe('bloque')
  })

  it('NO cambia de pestaña en la transición selección → sin-selección (deseleccionar no saca de Tema/Fondo)', () => {
    usePuckStoreFalso.setState({
      selectedItem: { type: 'hero', props: { id: 'seccion-1' } },
    })
    useEditorPanelStore.setState({ pestanaActiva: 'tema' })
    render(<PanelLateralEditor />)

    act(() => {
      usePuckStoreFalso.setState({ selectedItem: null })
    })

    expect(useEditorPanelStore.getState().pestanaActiva).toBe('tema')
  })

  it('NO fuerza la pestaña "Bloque" al seleccionar un segundo bloque distinto mientras ya había uno seleccionado', () => {
    usePuckStoreFalso.setState({
      selectedItem: { type: 'hero', props: { id: 'seccion-1' } },
    })
    useEditorPanelStore.setState({ pestanaActiva: 'fondo' })
    render(<PanelLateralEditor />)

    act(() => {
      usePuckStoreFalso.setState({
        selectedItem: { type: 'contacto', props: { id: 'seccion-2' } },
      })
    })

    expect(useEditorPanelStore.getState().pestanaActiva).toBe('fondo')
  })
})
