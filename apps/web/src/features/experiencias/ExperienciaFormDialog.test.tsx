import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExperienciaFormDialog } from './ExperienciaFormDialog'
import type { Experiencia } from './types'

const crearMutate = vi.fn()
const actualizarMutate = vi.fn()

vi.mock('./useExperiencias', () => ({
  useCrearExperiencia: () => ({ mutate: crearMutate, isPending: false, error: null }),
  useActualizarExperiencia: () => ({ mutate: actualizarMutate, isPending: false, error: null }),
}))

vi.mock('@/features/tecnologias/useTecnologias', () => ({
  useTecnologias: () => ({ data: [{ id: 't1', nombre: 'React' }] }),
}))

vi.mock('@/components/media/MediaField', () => ({
  MediaField: ({ onUploaded, onClear }: { onUploaded: (m: { id: string; url: string }) => void; onClear?: () => void }) => (
    <div>
      <button type="button" onClick={() => onUploaded({ id: 'media-9', url: 'https://cdn.example.com/l.png' })}>
        Elegir logo
      </button>
      <button type="button" onClick={onClear}>
        Quitar logo
      </button>
    </div>
  ),
}))

const EXISTENTE: Experiencia = {
  id: 'e1',
  usuario_admin_id: 'admin-1',
  empresa: 'Acme',
  cargo: 'Dev',
  descripcion: 'Hice cosas',
  fecha_inicio: '2022-01-10',
  fecha_fin: null,
  ubicacion: null,
  modalidad: 'hibrido',
  url_empresa: null,
  logo_media_id: null,
  logo: null,
  tecnologias: [{ id: 't1', nombre: 'React' }],
  orden: 2,
  visible: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function abrir(experiencia: Experiencia | null = null, onOpenChange = vi.fn()) {
  return render(
    <ExperienciaFormDialog experiencia={experiencia} open onOpenChange={onOpenChange} ordenSiguiente={5} />,
  )
}

describe('ExperienciaFormDialog (Fase 7l, UC-19)', () => {
  afterEach(() => vi.clearAllMocks())

  it('valida los obligatorios y no llama a la mutación', async () => {
    const user = userEvent.setup()
    abrir()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('La empresa es obligatoria')).toBeInTheDocument()
    expect(screen.getByText('El cargo es obligatorio')).toBeInTheDocument()
    expect(crearMutate).not.toHaveBeenCalled()
  })

  it('"Actual" deshabilita la fecha de fin, la limpia y envía fecha_fin null', async () => {
    const user = userEvent.setup()
    const { container } = abrir()
    await user.type(screen.getByLabelText('Empresa'), 'Globex')
    await user.type(screen.getByLabelText('Cargo'), 'Tech Lead')
    await user.type(screen.getByLabelText(/^Descripción/), 'Lidero equipos')
    const [inicio, fin] = Array.from(container.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    await user.type(inicio, '2025-09-01')
    await user.type(fin, '2026-01-01')
    expect(fin).toHaveValue('2026-01-01')

    await user.click(screen.getByRole('checkbox', { name: /actual/i }))
    expect(fin).toBeDisabled()
    expect(fin).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(crearMutate).toHaveBeenCalledTimes(1))
    expect(crearMutate.mock.calls[0][0]).toEqual({
      empresa: 'Globex',
      cargo: 'Tech Lead',
      descripcion: 'Lidero equipos',
      fecha_inicio: '2025-09-01',
      fecha_fin: null,
      ubicacion: null,
      modalidad: 'presencial',
      url_empresa: null,
      logo_media_id: null,
      tecnologias: [],
      visible: true,
      orden: 5,
    })
  })

  it('sin "Actual" exige la fecha de fin y no permite una anterior al inicio', async () => {
    const user = userEvent.setup()
    const { container } = abrir()
    await user.type(screen.getByLabelText('Empresa'), 'Globex')
    await user.type(screen.getByLabelText('Cargo'), 'Dev')
    await user.type(screen.getByLabelText(/^Descripción/), 'x')
    const [inicio, fin] = Array.from(container.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    await user.type(inicio, '2025-09-01')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/Indica la fecha de fin o marca/)).toBeInTheDocument()

    await user.type(fin, '2024-01-01')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/no puede ser anterior/)).toBeInTheDocument()
    expect(crearMutate).not.toHaveBeenCalled()
  })

  it('al editar precarga el puesto actual y envía el PATCH con las tecnologías por nombre', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    abrir(EXISTENTE, onOpenChange)
    expect(screen.getByLabelText('Empresa')).toHaveValue('Acme')
    expect(screen.getByRole('checkbox', { name: /actual/i })).toBeChecked()
    expect(screen.getByText('React')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nueva tecnología'), 'Docker{Enter}')
    await user.click(screen.getByRole('button', { name: 'Elegir logo' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(actualizarMutate).toHaveBeenCalledTimes(1))
    const { id, payload } = actualizarMutate.mock.calls[0][0]
    expect(id).toBe('e1')
    expect(payload).toMatchObject({
      fecha_fin: null,
      modalidad: 'hibrido',
      tecnologias: ['React', 'Docker'],
      logo_media_id: 'media-9',
    })
    // El orden de un puesto existente no se toca.
    expect(payload).not.toHaveProperty('orden')
  })
})
