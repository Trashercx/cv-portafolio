import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create } from 'zustand'
import { PanelBloqueSeleccionado } from './PanelBloqueSeleccionado'

type SelectedItemFalso = { type: string; props: { id: string } } | null

const usePuckStoreFalso = create<{ selectedItem: SelectedItemFalso }>(() => ({
  selectedItem: null,
}))

vi.mock('./usePuckEditor', () => ({
  usePuckEditor: (selector: (state: { selectedItem: SelectedItemFalso }) => unknown) =>
    usePuckStoreFalso(selector),
}))

// `<Puck.Fields/>` exige estar montado dentro de un `<Puck>` real (necesita
// su `UsePuckStoreContext`) — fuera del alcance de esta suite, que solo
// cubre el placeholder y el título del bloque seleccionado (ver
// `LienzoPuck.test.tsx`/`EditorSeccionesPage.test.tsx` para la decisión de
// no montar un `<Puck>` real en jsdom).
vi.mock('@measured/puck', () => ({
  Puck: Object.assign(() => null, { Fields: () => <div>Campos del bloque</div> }),
}))

describe('PanelBloqueSeleccionado', () => {
  beforeEach(() => {
    usePuckStoreFalso.setState({ selectedItem: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra un placeholder cuando no hay ningún bloque seleccionado', () => {
    render(<PanelBloqueSeleccionado />)

    expect(
      screen.getByText(/seleccioná un bloque en el lienzo/i),
    ).toBeInTheDocument()
  })

  it('muestra el label del bloque y sus campos cuando hay uno seleccionado', () => {
    usePuckStoreFalso.setState({
      selectedItem: { type: 'hero', props: { id: 'seccion-1' } },
    })
    render(<PanelBloqueSeleccionado />)

    expect(screen.getByText('Portada (hero)')).toBeInTheDocument()
    expect(screen.getByText('Campos del bloque')).toBeInTheDocument()
  })
})
