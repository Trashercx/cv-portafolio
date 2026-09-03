import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SkillFormDialog } from './SkillFormDialog'
import type { Skill } from './types'

const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

const skillsExistentesMock: Skill[] = []

vi.mock('./useSkills', () => ({
  useCrearSkill: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
  useActualizarSkill: () => ({
    mutate: actualizarMutateMock,
    isPending: false,
    error: null,
  }),
  useSkills: () => ({ data: skillsExistentesMock, isLoading: false }),
}))

function renderDialog(onOpenChange = vi.fn()) {
  return render(
    <SkillFormDialog skill={null} open onOpenChange={onOpenChange} />,
  )
}

const SKILL_EXISTENTE: Skill = {
  id: 'skill-existente',
  usuario_admin_id: 'admin-1',
  nombre: 'React',
  icono: 'react',
  orden: 2,
  visible: true,
}

/** Wrapper con estado propio de `open`, para poder cerrar/reabrir el diálogo como lo haría la `*ListPage`. */
function WrapperControlado({ skill }: { skill: Skill | null }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button onClick={() => setOpen(true)}>Reabrir</button>
      <SkillFormDialog skill={skill} open={open} onOpenChange={setOpen} />
    </>
  )
}

describe('SkillFormDialog (nuevo)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
    skillsExistentesMock.length = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza un nombre duplicado (case-insensitive/trim) contra el catálogo existente', async () => {
    const user = userEvent.setup()
    skillsExistentesMock.push({ ...SKILL_EXISTENTE, nombre: 'React' })
    renderDialog()

    await user.type(screen.getByLabelText(/^nombre$/i), '  react  ')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/ya existe un skill con ese nombre/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('autocompleta el nombre a partir del ícono elegido si el campo está vacío', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('combobox', { name: /ícono/i }))
    await user.click(await screen.findByRole('option', { name: 'nodejs' }))

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Node.js')
  })

  it('no sobreescribe un nombre ya escrito a mano al elegir un ícono', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/^nombre$/i), 'Mi nombre custom')

    await user.click(screen.getByRole('combobox', { name: /ícono/i }))
    await user.click(await screen.findByRole('option', { name: 'nodejs' }))

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Mi nombre custom')
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderDialog()

    // deja "nombre" e "ícono" vacíos
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/el nombre es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto y cierra el modal al guardar', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

    await user.type(screen.getByLabelText(/^nombre$/i), 'Node.js')

    await user.click(screen.getByRole('combobox', { name: /ícono/i }))
    await user.click(await screen.findByRole('option', { name: 'nodejs' }))

    fireEvent.change(screen.getByLabelText(/^orden$/i), {
      target: { value: '3' },
    })

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Node.js',
        icono: 'nodejs',
        orden: 3,
        visible: true,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )

    const opciones = crearMutateMock.mock.calls[0][1] as {
      onSuccess: () => void
    }
    opciones.onSuccess()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('permite elegir un ícono personalizado fuera del catálogo', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/^nombre$/i), 'Kubernetes')

    await user.click(screen.getByRole('combobox', { name: /ícono/i }))
    await user.click(
      await screen.findByRole('option', { name: /otro \(personalizado\)/i }),
    )

    const inputIcono = screen.getByPlaceholderText(/clave del ícono/i)
    await user.type(inputIcono, 'kubernetes')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Kubernetes',
        icono: 'kubernetes',
        orden: 0,
        visible: true,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('modo edición: precarga el skill existente y llama a actualizar, no a crear', async () => {
    const user = userEvent.setup()
    render(
      <SkillFormDialog
        skill={SKILL_EXISTENTE}
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('React')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(actualizarMutateMock).toHaveBeenCalledTimes(1))
    expect(actualizarMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'React',
        icono: 'react',
        orden: 2,
        visible: true,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('resetea el formulario al reabrir sin guardar (mismo estado "nuevo")', async () => {
    const user = userEvent.setup()
    render(<WrapperControlado skill={null} />)

    await user.type(screen.getByLabelText(/^nombre$/i), 'texto sucio sin guardar')
    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue(
      'texto sucio sin guardar',
    )

    // cierra sin guardar (Escape, como haría el admin)
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument(),
    )

    // reabre en el mismo estado "nuevo"
    await user.click(screen.getByRole('button', { name: /reabrir/i }))

    expect(await screen.findByLabelText(/^nombre$/i)).toHaveValue('')
  })
})
