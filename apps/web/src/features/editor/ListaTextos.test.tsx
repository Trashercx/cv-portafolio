import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListaTextos } from './ListaTextos'

/** Fase 7 (7.2, UC-12): la lista nunca emite cadenas vacías o solo espacios. */
describe('ListaTextos', () => {
  it('al vaciar un input emite la lista sin esa cadena (no solo en blur)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ListaTextos value={['Dev']} onChange={onChange} />)
    await user.clear(screen.getByLabelText('Título rotativo 1'))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('descarta también los valores solo con espacios, conservando los demás', async () => {
    const onChange = vi.fn()
    render(<ListaTextos value={['Uno', 'x']} onChange={onChange} />)
    const segundo = screen.getByLabelText('Título rotativo 2')
    fireEvent.change(segundo, { target: { value: '   ' } })
    expect(onChange).toHaveBeenLastCalledWith(['Uno'])
  })
})
