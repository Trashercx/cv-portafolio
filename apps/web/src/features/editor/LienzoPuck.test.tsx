import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LienzoPuck } from './LienzoPuck'

const backMock = vi.fn()
const forwardMock = vi.fn()
const historyMock: { hasPast: boolean; hasFuture: boolean } = {
  hasPast: false,
  hasFuture: false,
}

/**
 * `LienzoPuck` reconstruye TODO el layout de Puck a mano vía `children` (ver
 * su comentario de cabecera) — igual que en `EditorSeccionesPage.test.tsx`,
 * montar un `<Puck>` real en jsdom no aporta valor acá: se stubea `Puck`
 * (renderiza `children` tal cual, con las 4 sub-funciones estáticas que usa
 * `LienzoPuck`) y `usePuckEditor` (para poder controlar `history` sin
 * depender de un store real de Puck).
 */
vi.mock('@measured/puck', () => ({
  Puck: Object.assign(
    (props: { children?: ReactNode }) => <>{props.children}</>,
    {
      Components: () => <div>Bloques disponibles</div>,
      Outline: () => <div>Árbol de capas</div>,
      Preview: () => <div>Lienzo</div>,
    },
  ),
}))

vi.mock('./usePuckEditor', () => ({
  usePuckEditor: (
    selector: (state: {
      history: { back: () => void; forward: () => void; hasPast: boolean; hasFuture: boolean }
    }) => unknown,
  ) =>
    selector({
      history: {
        back: backMock,
        forward: forwardMock,
        hasPast: historyMock.hasPast,
        hasFuture: historyMock.hasFuture,
      },
    }),
}))

vi.mock('./ViewportSwitcher', () => ({
  ViewportSwitcher: () => <div>Selector de viewport</div>,
}))

vi.mock('./PanelLateralEditor', () => ({
  PanelLateralEditor: () => <div>Panel lateral</div>,
}))

describe('LienzoPuck', () => {
  beforeEach(() => {
    historyMock.hasPast = false
    historyMock.hasFuture = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('compone la barra de herramientas, los controles de deshacer/rehacer, el selector de viewport, el drawer de bloques y el panel lateral', () => {
    render(
      <LienzoPuck
        data={{ content: [], root: {} }}
        metadata={undefined}
        editorKey={0}
        onChange={() => {}}
        toolbar={<button type="button">Guardar cambios</button>}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rehacer' })).toBeDisabled()
    expect(screen.getByText('Selector de viewport')).toBeInTheDocument()
    expect(screen.getByText('Bloques disponibles')).toBeInTheDocument()
    expect(screen.getByText('Árbol de capas')).toBeInTheDocument()
    expect(screen.getByText('Lienzo')).toBeInTheDocument()
    expect(screen.getByText('Panel lateral')).toBeInTheDocument()
  })

  it('habilita "Deshacer"/"Rehacer" según `history.hasPast`/`hasFuture`, y disparan `back`/`forward` al hacer click', async () => {
    historyMock.hasPast = true
    historyMock.hasFuture = true
    const user = userEvent.setup()

    render(
      <LienzoPuck
        data={{ content: [], root: {} }}
        metadata={undefined}
        editorKey={0}
        onChange={() => {}}
        toolbar={null}
      />,
    )

    const deshacer = screen.getByRole('button', { name: 'Deshacer' })
    const rehacer = screen.getByRole('button', { name: 'Rehacer' })
    expect(deshacer).toBeEnabled()
    expect(rehacer).toBeEnabled()

    await user.click(deshacer)
    expect(backMock).toHaveBeenCalledTimes(1)

    await user.click(rehacer)
    expect(forwardMock).toHaveBeenCalledTimes(1)
  })
})
