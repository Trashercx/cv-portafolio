import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calcularNuevoOrdenIds, ListaInsignias } from './ListaInsignias'
import type { Insignia } from './types'

/** Fase 7d, UC-35: reordenar envía `{ ids }`, ocultar/mostrar y borrado confirmado. */

const reordenarMutate = vi.fn()
const actualizarMutate = vi.fn()
const eliminarMutate = vi.fn()

vi.mock('./useInsignias', () => ({
  useReordenarInsignias: () => ({ mutate: reordenarMutate, isPending: false }),
  useActualizarInsignia: () => ({ mutate: actualizarMutate, isPending: false }),
  useEliminarInsignia: () => ({ mutate: eliminarMutate, isPending: false }),
}))

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: () => ({ data: [{ id: 'm2', url: 'https://cdn.example.com/m2.png' }] }),
}))

function crear(n: number, extra: Partial<Insignia> = {}): Insignia {
  return {
    id: `i${n}`,
    usuario_admin_id: 'admin-1',
    nombre: `Insignia ${n}`,
    emisor: `Emisor ${n}`,
    descripcion: null,
    proveedor: 'manual',
    id_externo: null,
    url_verificacion: null,
    url_origen: null,
    imagen_media_id: `m${n}`,
    fecha_emision: null,
    fecha_expiracion: null,
    habilidades: [],
    orden: n,
    visible: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    imagen: n === 1 ? { id: 'm1', url: 'https://cdn.example.com/m1.png' } as Insignia['imagen'] : undefined,
    ...extra,
  }
}

function fila(nombre: string) {
  return screen.getByRole('row', { name: new RegExp(nombre) })
}

describe('ListaInsignias (Fase 7d, UC-35)', () => {
  beforeEach(() => {
    reordenarMutate.mockReset()
    actualizarMutate.mockReset()
    eliminarMutate.mockReset()
  })

  it('calcularNuevoOrdenIds intercambia con el vecino y devuelve null en los extremos', () => {
    expect(calcularNuevoOrdenIds(['a', 'b', 'c'], 'b', 'subir')).toEqual(['b', 'a', 'c'])
    expect(calcularNuevoOrdenIds(['a', 'b', 'c'], 'b', 'bajar')).toEqual(['a', 'c', 'b'])
    expect(calcularNuevoOrdenIds(['a', 'b'], 'a', 'subir')).toBeNull()
    expect(calcularNuevoOrdenIds(['a', 'b'], 'b', 'bajar')).toBeNull()
  })

  it('lista por orden y reordena enviando { ids } (array de ids)', async () => {
    const user = userEvent.setup()
    render(<ListaInsignias insignias={[crear(3), crear(1), crear(2)]} onEditar={vi.fn()} />)

    const nombres = screen.getAllByRole('row').slice(1).map((f) => within(f).getAllByRole('cell')[2].textContent)
    expect(nombres).toEqual(['Insignia 1', 'Insignia 2', 'Insignia 3'])

    await user.click(within(fila('Insignia 2')).getByRole('button', { name: 'Subir' }))

    expect(reordenarMutate).toHaveBeenCalledWith(['i2', 'i1', 'i3'])
  })

  it('los extremos no pueden subir/bajar', () => {
    render(<ListaInsignias insignias={[crear(1), crear(2)]} onEditar={vi.fn()} />)

    expect(within(fila('Insignia 1')).getByRole('button', { name: 'Subir' })).toBeDisabled()
    expect(within(fila('Insignia 2')).getByRole('button', { name: 'Bajar' })).toBeDisabled()
  })

  it('ocultar/mostrar usa el Switch y manda { visible }', async () => {
    const user = userEvent.setup()
    render(<ListaInsignias insignias={[crear(1), crear(2, { visible: false })]} onEditar={vi.fn()} />)

    await user.click(screen.getByRole('switch', { name: 'Ocultar Insignia 1' }))
    expect(actualizarMutate).toHaveBeenCalledWith({ id: 'i1', payload: { visible: false } })

    await user.click(screen.getByRole('switch', { name: 'Mostrar Insignia 2' }))
    expect(actualizarMutate).toHaveBeenCalledWith({ id: 'i2', payload: { visible: true } })
  })

  it('eliminar pide confirmación antes de llamar al servicio', async () => {
    const user = userEvent.setup()
    render(<ListaInsignias insignias={[crear(1)]} onEditar={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(eliminarMutate).not.toHaveBeenCalled()

    const dialogo = await screen.findByRole('alertdialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    expect(eliminarMutate).toHaveBeenCalledWith('i1')
  })

  it('"Editar" notifica la insignia y la miniatura cae a la biblioteca si no viene resuelta', async () => {
    const user = userEvent.setup()
    const onEditar = vi.fn()
    const { container } = render(<ListaInsignias insignias={[crear(1), crear(2)]} onEditar={onEditar} />)

    const imagenes = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(imagenes).toEqual(['https://cdn.example.com/m1.png', 'https://cdn.example.com/m2.png'])

    await user.click(within(fila('Insignia 2')).getByRole('button', { name: 'Editar' }))
    expect(onEditar).toHaveBeenCalledWith(expect.objectContaining({ id: 'i2' }))
  })
})
