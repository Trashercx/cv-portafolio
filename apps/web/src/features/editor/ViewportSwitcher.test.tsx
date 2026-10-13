import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create } from 'zustand'
import { ViewportSwitcher } from './ViewportSwitcher'

type ViewportsFalso = {
  current: { width: number; height: number | 'auto' }
  controlsVisible: boolean
  options: unknown[]
}

const dispatchMock = vi.fn()

const usePuckStoreFalso = create<{
  dispatch: typeof dispatchMock
  appState: { ui: { viewports: ViewportsFalso } }
}>(() => ({
  dispatch: dispatchMock,
  appState: {
    ui: {
      viewports: {
        current: { width: 1280, height: 'auto' },
        controlsVisible: true,
        options: [],
      },
    },
  },
}))

vi.mock('./usePuckEditor', () => ({
  usePuckEditor: (selector: (state: unknown) => unknown) =>
    usePuckStoreFalso(selector as never),
}))

describe('ViewportSwitcher', () => {
  beforeEach(() => {
    usePuckStoreFalso.setState({
      appState: {
        ui: {
          viewports: {
            current: { width: 1280, height: 'auto' },
            controlsVisible: true,
            options: [],
          },
        },
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra los 3 botones de tamaño y marca "Escritorio" como activo por defecto', () => {
    render(<ViewportSwitcher />)

    expect(
      screen.getByRole('button', { name: 'Escritorio' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tablet' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Móvil' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('despacha "setUi" con el nuevo viewport preservando controlsVisible/options', async () => {
    const user = userEvent.setup()
    render(<ViewportSwitcher />)

    await user.click(screen.getByRole('button', { name: 'Móvil' }))

    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'setUi',
      ui: {
        viewports: {
          current: { width: 360, height: 'auto' },
          controlsVisible: true,
          options: [],
        },
      },
    })
  })
})
