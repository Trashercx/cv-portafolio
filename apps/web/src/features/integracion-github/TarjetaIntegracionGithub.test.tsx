import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import { TarjetaIntegracionGithub } from './TarjetaIntegracionGithub'
import type { IntegracionGithub } from './types'

/** Fase 7l, UC-36: formulario de la integración, PUT, sincronización manual y su resumen. */

const guardarMutate = vi.fn()
const sincronizarMutate = vi.fn()
const estado: {
  integracion: IntegracionGithub | null | undefined
  sincronizar: { data?: unknown; error?: unknown; isPending: boolean }
} = { integracion: null, sincronizar: { isPending: false } }

vi.mock('./useIntegracionGithub', () => ({
  useIntegracionGithub: () => ({ data: estado.integracion, isLoading: false, error: null }),
  useGuardarIntegracionGithub: () => ({ mutate: guardarMutate, isPending: false, error: null }),
  useSincronizarGithub: () => ({ mutate: sincronizarMutate, ...estado.sincronizar }),
}))

const INTEGRACION: IntegracionGithub = {
  id: 'g1',
  usuario_github: 'octocat',
  activa: true,
  intervalo_horas: 6,
  publicar_automaticamente: false,
  incluir_forks: false,
  incluir_archivados: false,
  destacar_nuevos: false,
  ultima_sincronizacion_en: '2026-10-19T10:30:00.000Z',
  ultimo_error: null,
}

describe('TarjetaIntegracionGithub (Fase 7l, UC-36)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    estado.integracion = null
    estado.sincronizar = { isPending: false }
  })

  it('explica que solo se importan repos públicos y cuándo aparecen en el sitio', () => {
    render(<TarjetaIntegracionGithub />)
    expect(screen.getByText(/repositorios privados nunca se importan/i)).toBeInTheDocument()
    expect(screen.getByText(/al publicar una versión/i)).toBeInTheDocument()
  })

  it('sin integración no se puede sincronizar y el PUT lleva los valores por defecto', async () => {
    const user = userEvent.setup()
    render(<TarjetaIntegracionGithub />)
    expect(screen.getByRole('button', { name: 'Sincronizar ahora' })).toBeDisabled()

    await user.type(screen.getByLabelText('Usuario de GitHub'), 'octocat')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(guardarMutate).toHaveBeenCalledTimes(1))
    expect(guardarMutate.mock.calls[0][0]).toEqual({
      usuario_github: 'octocat',
      activa: true,
      intervalo_horas: 6,
      publicar_automaticamente: false,
      incluir_forks: false,
      incluir_archivados: false,
      destacar_nuevos: false,
    })
  })

  it('valida el usuario y el intervalo', async () => {
    const user = userEvent.setup()
    render(<TarjetaIntegracionGithub />)
    await user.type(screen.getByLabelText('Usuario de GitHub'), '-malo-')
    await user.clear(screen.getByLabelText(/Intervalo/))
    await user.type(screen.getByLabelText(/Intervalo/), '500')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Usuario de GitHub inválido')).toBeInTheDocument()
    expect(screen.getByText(/Máximo 168 horas/)).toBeInTheDocument()
    expect(guardarMutate).not.toHaveBeenCalled()
  })

  it('con integración precarga el formulario, guarda un cambio de opción y muestra la última sincronización', async () => {
    const user = userEvent.setup()
    estado.integracion = INTEGRACION
    render(<TarjetaIntegracionGithub />)
    expect(screen.getByLabelText('Usuario de GitHub')).toHaveValue('octocat')
    expect(screen.getByText(/Última sincronización:/)).not.toHaveTextContent('nunca')

    await user.click(screen.getByRole('switch', { name: 'Incluir forks' }))
    // Con cambios sin guardar no se sincroniza: usaría lo viejo.
    expect(screen.getByRole('button', { name: 'Sincronizar ahora' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(guardarMutate).toHaveBeenCalled())
    expect(guardarMutate.mock.calls[0][0]).toMatchObject({ incluir_forks: true })
  })

  it('"Sincronizar ahora" dispara la sincronización', async () => {
    const user = userEvent.setup()
    estado.integracion = INTEGRACION
    render(<TarjetaIntegracionGithub />)
    await user.click(screen.getByRole('button', { name: 'Sincronizar ahora' }))
    expect(sincronizarMutate).toHaveBeenCalledTimes(1)
  })

  it('muestra el resumen del resultado, los errores y si se publicó', () => {
    estado.integracion = INTEGRACION
    estado.sincronizar = {
      isPending: false,
      data: {
        creados: 2,
        actualizados: 1,
        omitidos: 4,
        errores: ['repo-x: respuesta inválida'],
        publicado: true,
        sincronizado_en: '2026-10-20T10:00:00.000Z',
      },
    }
    render(<TarjetaIntegracionGithub />)
    expect(screen.getByRole('status')).toHaveTextContent('2 creados, 1 actualizados, 4 omitidos')
    expect(screen.getByText('Se publicó una versión nueva del sitio.')).toBeInTheDocument()
    expect(screen.getByText('repo-x: respuesta inválida')).toBeInTheDocument()
  })

  it('muestra el error de la sincronización y el último error guardado', () => {
    estado.integracion = { ...INTEGRACION, ultimo_error: 'GitHub respondió 403' }
    estado.sincronizar = {
      isPending: false,
      error: new ApiError('Límite de GitHub alcanzado', 429),
    }
    render(<TarjetaIntegracionGithub />)
    expect(screen.getByText(/Último error: GitHub respondió 403/)).toBeInTheDocument()
    expect(screen.getByText('Límite de GitHub alcanzado')).toBeInTheDocument()
  })
})
