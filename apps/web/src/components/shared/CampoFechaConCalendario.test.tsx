import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CampoFechaConCalendario } from './CampoFechaConCalendario'

/**
 * `react-day-picker` le pone al `<button>` de cada día un `aria-label`
 * completo ("Thursday, June 20th, 2024"), así que buscarlo por accessible
 * name exacto ("20") no funciona. La celda `<td role="gridcell">` que lo
 * envuelve sí trae un `data-day="AAAA-MM-DD"` estable (sin depender del
 * locale de `toLocaleDateString`, a diferencia del `data-day` del propio
 * botón) — se usa ese selector para ubicar el día sin ambigüedad.
 *
 * Busca en `document` (no en el `container` de `render`): el `Popover`
 * (Radix) monta su contenido en un portal, como hijo directo de `<body>`,
 * fuera del `container` por defecto de Testing Library.
 */
function obtenerBotonDelDia(fechaISO: string) {
  const celda = document.querySelector(`[data-day="${fechaISO}"]`)
  if (!celda) {
    throw new Error(`No se encontró la celda del día ${fechaISO}`)
  }
  return within(celda as HTMLElement).getByRole('button')
}

describe('CampoFechaConCalendario', () => {
  it('escribe AAAA-MM-DD al elegir un día del calendario', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CampoFechaConCalendario
        value="2024-06-15"
        onChange={onChange}
        triggerAriaLabel="Elegir fecha con calendario"
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /elegir fecha con calendario/i }),
    )

    await screen.findByRole('dialog')
    await user.click(obtenerBotonDelDia('2024-06-20'))

    expect(onChange).toHaveBeenCalledWith('2024-06-20')
  })

  it('respeta `max`: deshabilita los días posteriores al límite', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CampoFechaConCalendario
        value="2024-06-15"
        onChange={onChange}
        max="2024-06-18"
        triggerAriaLabel="Elegir fecha con calendario"
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /elegir fecha con calendario/i }),
    )
    await screen.findByRole('dialog')

    const dia20 = obtenerBotonDelDia('2024-06-20')
    expect(dia20).toBeDisabled()

    await user.click(dia20)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('respeta `min`: deshabilita los días anteriores al límite', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CampoFechaConCalendario
        value="2024-06-15"
        onChange={onChange}
        min="2024-06-10"
        triggerAriaLabel="Elegir fecha con calendario"
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /elegir fecha con calendario/i }),
    )
    await screen.findByRole('dialog')

    const dia5 = obtenerBotonDelDia('2024-06-05')
    expect(dia5).toBeDisabled()
  })
})
