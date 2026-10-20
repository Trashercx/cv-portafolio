import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Award } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { EstadoVacio } from './EstadoVacio'

/** Fase 7m (#68): estado vacío común de los listados del panel. */
describe('EstadoVacio', () => {
  it('muestra título, descripción y un botón que dispara la acción', async () => {
    const user = userEvent.setup()
    const onAccion = vi.fn()
    render(
      <EstadoVacio
        icono={Award}
        titulo="Todavía no hay certificaciones"
        descripcion="Agrega la primera."
        etiquetaAccion="Nueva certificación"
        onAccion={onAccion}
      />,
    )

    expect(screen.getByText('Todavía no hay certificaciones')).toBeInTheDocument()
    expect(screen.getByText('Agrega la primera.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nueva certificación' }))
    expect(onAccion).toHaveBeenCalledTimes(1)
  })

  it('sin acción no muestra botón', () => {
    render(<EstadoVacio icono={Award} titulo="Vacío" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
