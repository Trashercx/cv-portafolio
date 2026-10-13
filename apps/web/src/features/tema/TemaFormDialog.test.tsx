import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemaFormDialog } from './TemaFormDialog'
import type { Tema } from './types'

// El diálogo re-renderiza dos vistas previas y el contraste en cada pulsación:
// con la máquina cargada (suite completa en paralelo) 5 s se quedan cortos.
vi.setConfig({ testTimeout: 20000 })

const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const idActualizadoMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}
const actualizarState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('./useTemas', () => ({
  useCrearTema: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
  useActualizarTema: (id: string) => {
    idActualizadoMock(id)
    return {
      mutate: actualizarMutateMock,
      isPending: actualizarState.isPending,
      error: actualizarState.error,
    }
  },
}))

// Las fuentes variables son CSS: en el test solo importa que se pidan, no su contenido.
vi.mock('./useFuenteTema', () => ({ useFuenteTema: vi.fn() }))
const cargarFuenteMock = vi.hoisted(() => vi.fn())
vi.mock('./fuentes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./fuentes')>()),
  cargarFuente: cargarFuenteMock,
}))

const TEMA_EXISTENTE: Tema = {
  id: 'tema-7',
  usuario_admin_id: 'admin-1',
  nombre: 'Mi tema',
  color_primario: '#112233',
  color_secundario: '#445566',
  color_fondo: '#ffffff',
  color_texto: '#000000',
  fuente_principal: 'inter',
  modo: 'claro',
  activo: false,
}

describe('TemaFormDialog (creación)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
    actualizarState.isPending = false
    actualizarState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no llama a la mutación cuando falta el nombre', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    expect(
      await screen.findByText(/el nombre es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto (colores por defecto + modo elegido)', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.type(screen.getByLabelText(/^nombre$/i), 'Tema oscuro')

    await user.click(screen.getByRole('combobox', { name: /modo/i }))
    await user.click(await screen.findByRole('option', { name: 'Oscuro' }))

    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Tema oscuro',
        color_primario: '#2563eb',
        color_secundario: '#7c3aed',
        color_fondo: '#ffffff',
        color_texto: '#0f172a',
        fuente_principal: 'manrope',
        modo: 'oscuro',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(actualizarMutateMock).not.toHaveBeenCalled()
  })

  it('precarga el formulario al elegir una plantilla predefinida (editable antes de guardar)', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))

    await user.click(
      screen.getByRole('combobox', { name: /plantilla predefinida/i }),
    )
    await user.click(await screen.findByRole('option', { name: /océano/i }))

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Océano')

    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Océano',
        color_primario: '#0284c7',
        color_secundario: '#0891b2',
        color_fondo: '#f0f9ff',
        color_texto: '#0c4a6e',
        fuente_principal: 'sans_sistema',
        modo: 'claro',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('el selector ofrece las 10 fuentes del catálogo (no las legadas), pide su descarga al abrirse y permite elegir una', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.click(
      screen.getByRole('combobox', { name: /tipografía principal/i }),
    )

    for (const nombre of [
      'Manrope',
      'Inter',
      'Space Grotesk',
      'Sora',
      'DM Sans',
      'Playfair Display',
      'JetBrains Mono',
      'Sans del sistema',
      'Serif del sistema',
      'Monoespaciada del sistema',
    ]) {
      expect(await screen.findByRole('option', { name: nombre })).toBeInTheDocument()
    }
    expect(screen.queryByRole('option', { name: 'Poppins' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Merriweather' })).not.toBeInTheDocument()
    // Muestras "Aa Portafolio" renderizadas en cada fuente (decorativas, aria-hidden).
    expect(
      document.querySelectorAll('[role="option"] [style*="font-family"]'),
    ).toHaveLength(10)
    expect(cargarFuenteMock).toHaveBeenCalledWith('inter')

    await user.click(screen.getByRole('option', { name: 'Serif del sistema' }))
    await user.type(screen.getByLabelText(/^nombre$/i), 'Tema serif')
    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ fuente_principal: 'serif_sistema' }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('el campo hex acompaña al selector de color: editarlo cambia el valor enviado y acepta escribir sin #', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    expect(
      screen.getByLabelText('Color primario (selector)'),
    ).toHaveValue('#2563eb')

    const hex = screen.getByLabelText('Color primario')
    await user.clear(hex)
    await user.type(hex, 'ff0000')
    expect(hex).toHaveValue('#ff0000')
    expect(screen.getByLabelText('Color primario (selector)')).toHaveValue('#ff0000')

    await user.type(screen.getByLabelText(/^nombre$/i), 'Rojo')
    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ color_primario: '#ff0000' }),
      expect.anything(),
    )
  })

  it('un hex incompleto no se envía: muestra "Color inválido"', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    const hex = screen.getByLabelText('Color de fondo')
    await user.clear(hex)
    await user.type(hex, '#12')
    await user.type(screen.getByLabelText(/^nombre$/i), 'X')
    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    expect(await screen.findByText('Color inválido')).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('muestra la vista previa en vivo en claro y oscuro, que reacciona al color editado', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))

    const claro = screen.getByTestId('vista-previa-tema-claro')
    const oscuro = screen.getByTestId('vista-previa-tema-oscuro')
    expect(claro).toHaveClass('forzar-claro')
    expect(oscuro).toHaveClass('dark')
    expect(claro.style.getPropertyValue('--color-primario')).toBe('#2563eb')

    const hex = screen.getByLabelText('Color primario')
    await user.clear(hex)
    await user.type(hex, '#ff0000')

    expect(claro.style.getPropertyValue('--color-primario')).toBe('#ff0000')
    expect(within(claro).getByText('Botón primario')).toBeInTheDocument()
    expect(within(oscuro).getByText('Título de una tarjeta')).toBeInTheDocument()
  })

  it('muestra el contraste con insignia AAA y NO avisa cuando la paleta es buena', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))

    const seccion = screen.getByRole('region', { name: /contraste de la paleta/i })
    expect(within(seccion).getByText('AAA')).toBeInTheDocument()
    expect(within(seccion).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('con contraste menor a 4.5:1 muestra un aviso visible pero NO bloquea el guardado', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    const texto = screen.getByLabelText('Color de texto')
    await user.clear(texto)
    await user.type(texto, '#eeeeee') // casi igual al fondo blanco

    const seccion = screen.getByRole('region', { name: /contraste de la paleta/i })
    expect(within(seccion).getByText('Insuficiente')).toBeInTheDocument()
    expect(within(seccion).getByRole('alert')).toHaveTextContent(/contraste insuficiente/i)

    await user.type(screen.getByLabelText(/^nombre$/i), 'Bajo contraste')
    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ color_texto: '#eeeeee' }),
      expect.anything(),
    )
  })

  it('pide confirmación al intentar cerrar (Esc) con cambios sin guardar, en vez de cerrar de inmediato', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.type(screen.getByLabelText(/^nombre$/i), 'Texto sucio sin guardar')

    await user.keyboard('{Escape}')

    const confirmacion = await screen.findByRole('alertdialog')
    expect(
      within(confirmacion).getByText(/¿descartar cambios\?/i),
    ).toBeInTheDocument()
    // El formulario sigue montado con el valor sucio intacto.
    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue(
      'Texto sucio sin guardar',
    )
  })

  it('"Cancelar" en la confirmación mantiene el modal abierto con los cambios', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.type(screen.getByLabelText(/^nombre$/i), 'Texto sucio sin guardar')

    await user.keyboard('{Escape}')
    const confirmacion = await screen.findByRole('alertdialog')
    await user.click(
      within(confirmacion).getByRole('button', { name: /^cancelar$/i }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue(
      'Texto sucio sin guardar',
    )
  })

  it('"Descartar" en la confirmación cierra el modal y resetea el formulario a los valores por defecto al reabrir', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.type(screen.getByLabelText(/^nombre$/i), 'Texto sucio sin guardar')

    await user.keyboard('{Escape}')
    const confirmacion = await screen.findByRole('alertdialog')
    await user.click(
      within(confirmacion).getByRole('button', { name: /^descartar$/i }),
    )

    await waitFor(() =>
      expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    expect(await screen.findByLabelText(/^nombre$/i)).toHaveValue('')
  })
})

describe('TemaFormDialog (edición, Fase 7)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
    actualizarState.isPending = false
    actualizarState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('con `tema` el disparador es "Editar" y el formulario se abre precargado con sus valores', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog tema={TEMA_EXISTENTE} />)

    expect(
      screen.queryByRole('button', { name: /nuevo tema/i }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^editar$/i }))

    expect(await screen.findByText('Editar tema')).toBeInTheDocument()
    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Mi tema')
    expect(screen.getByLabelText('Color primario')).toHaveValue('#112233')
    expect(screen.getByLabelText('Color secundario')).toHaveValue('#445566')
    expect(
      screen.getByRole('combobox', { name: /tipografía principal/i }),
    ).toHaveTextContent('Inter')
    // La edición no ofrece plantillas (pisarían nombre y colores del tema).
    expect(
      screen.queryByRole('combobox', { name: /plantilla predefinida/i }),
    ).not.toBeInTheDocument()
  })

  it('guarda con la mutación de actualización del tema correcto (PATCH) y NO con la de creación', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog tema={TEMA_EXISTENTE} />)

    await user.click(screen.getByRole('button', { name: /^editar$/i }))
    const nombre = await screen.findByLabelText(/^nombre$/i)
    await user.clear(nombre)
    await user.type(nombre, 'Renombrado')
    await user.click(screen.getByRole('button', { name: /guardar tema/i }))

    await waitFor(() => expect(actualizarMutateMock).toHaveBeenCalledTimes(1))
    expect(actualizarMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Renombrado',
        color_primario: '#112233',
        color_secundario: '#445566',
        color_fondo: '#ffffff',
        color_texto: '#000000',
        fuente_principal: 'inter',
        modo: 'claro',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(crearMutateMock).not.toHaveBeenCalled()
    expect(idActualizadoMock).toHaveBeenCalledWith('tema-7')
  })

  it('un tema con fuente legada (Poppins) se abre con su equivalente del catálogo (DM Sans)', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <TemaFormDialog tema={{ ...TEMA_EXISTENTE, fuente_principal: 'Poppins' }} />,
    )

    await user.click(screen.getByRole('button', { name: /^editar$/i }))

    expect(
      await screen.findByRole('combobox', { name: /tipografía principal/i }),
    ).toHaveTextContent('DM Sans')
  })

  it('muestra el error del servidor al fallar la actualización', async () => {
    actualizarState.error = new Error('boom')
    const user = userEvent.setup({ delay: null })
    render(<TemaFormDialog tema={TEMA_EXISTENTE} />)

    await user.click(screen.getByRole('button', { name: /^editar$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo guardar el tema/i,
    )
  })
})
