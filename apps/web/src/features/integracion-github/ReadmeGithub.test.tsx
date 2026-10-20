import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import { ReadmeGithub, transformarUrlReadme } from './ReadmeGithub'
import type { IntegracionGithub, ReadmeGithubRespuesta } from './types'

/** Fase 7m (#66), UC-36: tarjeta "README del perfil": estados, PUT, POST y saneado del Markdown. */

const guardarMutate = vi.fn()
const actualizarMutate = vi.fn()
const estado: {
  integracion: IntegracionGithub | null | undefined
  integracionError: unknown
  readme: ReadmeGithubRespuesta | undefined
  cargando: boolean
  actualizar: { data?: ReadmeGithubRespuesta; isPending: boolean }
  guardarError: unknown
} = {
  integracion: null,
  integracionError: null,
  readme: undefined,
  cargando: false,
  actualizar: { isPending: false },
  guardarError: null,
}

vi.mock('./useIntegracionGithub', () => ({
  useIntegracionGithub: () => ({
    data: estado.integracion,
    isLoading: estado.cargando,
    error: estado.integracionError,
  }),
  useReadmeGithub: () => ({ data: estado.readme, isLoading: estado.cargando, error: null }),
  useGuardarIntegracionGithub: () => ({
    mutate: guardarMutate,
    isPending: false,
    error: estado.guardarError,
  }),
  useActualizarReadmeGithub: () => ({ mutate: actualizarMutate, ...estado.actualizar }),
}))

const INTEGRACION: IntegracionGithub = {
  id: 'g1',
  usuario_github: 'octocat',
  activa: true,
  intervalo_horas: 12,
  publicar_automaticamente: true,
  incluir_forks: false,
  incluir_archivados: true,
  destacar_nuevos: false,
  ultima_sincronizacion_en: null,
  ultimo_error: null,
  readme_repositorio: null,
  readme_rama: null,
}

const CONFIGURADA: IntegracionGithub = {
  ...INTEGRACION,
  readme_repositorio: 'octocat/octocat',
  readme_rama: 'main',
}

function readme(parcial: Partial<ReadmeGithubRespuesta>): ReadmeGithubRespuesta {
  return {
    repositorio: 'octocat/octocat',
    rama: 'main',
    markdown: null,
    actualizado_en: null,
    error: null,
    ...parcial,
  }
}

describe('ReadmeGithub (Fase 7m, #66, UC-36)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    estado.integracion = null
    estado.integracionError = null
    estado.readme = undefined
    estado.cargando = false
    estado.actualizar = { isPending: false }
    estado.guardarError = null
  })

  it('muestra el estado de carga', () => {
    estado.cargando = true
    estado.integracion = undefined
    render(<ReadmeGithub />)
    expect(screen.getByText(/cargando readme/i)).toBeInTheDocument()
  })

  it('sin integración pide configurar primero el usuario de GitHub', () => {
    render(<ReadmeGithub />)
    expect(screen.getByText(/configura primero tu usuario de github/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('con integración sin repositorio sugiere <usuario>/<usuario> (editable, nunca fijo)', async () => {
    estado.integracion = INTEGRACION
    const user = userEvent.setup()
    render(<ReadmeGithub />)

    const campo = screen.getByLabelText('Repositorio del README')
    expect(campo).toHaveAttribute('placeholder', 'octocat/octocat')
    expect(campo).toHaveValue('')
    expect(screen.getByText(/sin configurar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizar README' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Usar octocat/octocat' }))
    expect(campo).toHaveValue('octocat/octocat')
    await user.clear(campo)
    await user.type(campo, 'octocat/otro-repo')
    expect(campo).toHaveValue('octocat/otro-repo')
  })

  it('Guardar envía el PUT con los dos campos y reenvía el resto de la configuración', async () => {
    estado.integracion = INTEGRACION
    const user = userEvent.setup()
    render(<ReadmeGithub />)

    await user.type(screen.getByLabelText('Repositorio del README'), 'octocat/octocat')
    await user.type(screen.getByLabelText('Rama'), 'principal')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(guardarMutate).toHaveBeenCalledTimes(1)
    expect(guardarMutate.mock.calls[0][0]).toEqual({
      usuario_github: 'octocat',
      activa: true,
      intervalo_horas: 12,
      publicar_automaticamente: true,
      incluir_forks: false,
      incluir_archivados: true,
      destacar_nuevos: false,
      readme_repositorio: 'octocat/octocat',
      readme_rama: 'principal',
    })
  })

  it('campos vacíos se guardan como null (quitar la configuración)', async () => {
    estado.integracion = CONFIGURADA
    const user = userEvent.setup()
    render(<ReadmeGithub />)

    await user.clear(screen.getByLabelText('Repositorio del README'))
    await user.clear(screen.getByLabelText('Rama'))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(guardarMutate.mock.calls[0][0]).toMatchObject({
      readme_repositorio: null,
      readme_rama: null,
    })
  })

  it('un repositorio con formato inválido no llama al API', async () => {
    estado.integracion = INTEGRACION
    const user = userEvent.setup()
    render(<ReadmeGithub />)

    await user.type(screen.getByLabelText('Repositorio del README'), 'sin-barra')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/formato usuario\/repositorio/i)
    expect(guardarMutate).not.toHaveBeenCalled()
  })

  it('muestra el error guardado del API (404, cuota, etc.)', () => {
    estado.integracion = CONFIGURADA
    estado.readme = readme({ error: 'No existe el README en octocat/octocat@main' })
    render(<ReadmeGithub />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No existe el README en octocat/octocat@main',
    )
  })

  it('configurado y sin descargar muestra el estado vacío', () => {
    estado.integracion = CONFIGURADA
    estado.readme = readme({})
    render(<ReadmeGithub />)
    expect(screen.getByText(/todavía no hay readme descargado/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizar README' })).toBeEnabled()
  })

  it('muestra la última actualización y el Markdown renderizado (GFM)', () => {
    estado.integracion = CONFIGURADA
    estado.readme = readme({
      markdown: '# Hola\n\nTexto con **negrita** y [web](https://example.com).\n\n- a\n- b\n\n| x | y |\n|---|---|\n| 1 | 2 |',
      actualizado_en: '2026-10-19T10:30:00.000Z',
    })
    render(<ReadmeGithub />)

    expect(screen.getByText(/última actualización/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hola' })).toBeInTheDocument()
    expect(screen.getByText('negrita').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('table')).toBeInTheDocument()
    const enlace = screen.getByRole('link', { name: 'web' })
    expect(enlace).toHaveAttribute('href', 'https://example.com')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sanea el Markdown: sin script, sin handlers y sin href javascript', () => {
    estado.integracion = CONFIGURADA
    estado.readme = readme({
      markdown: [
        'Hola',
        '',
        '<script>window.hackeado = true</script>',
        '',
        '<img src="https://example.com/a.png" onerror="alert(1)">',
        '',
        '[x](javascript:alert(1))',
        '',
        '![local](/ruta/relativa.png) ![http](http://example.com/a.png) ![ok](https://example.com/ok.png)',
        '',
        '[mail](mailto:yo@example.com) [ancla](#seccion)',
      ].join('\n'),
    })
    render(<ReadmeGithub />)

    const caja = screen.getByTestId('readme-renderizado')
    expect(caja.querySelector('script')).toBeNull()
    expect(caja.innerHTML).not.toMatch(/onerror/i)
    expect(caja.innerHTML).not.toMatch(/javascript:/i)
    expect(caja.innerHTML).not.toMatch(/hackeado/)
    for (const a of Array.from(caja.querySelectorAll('a'))) {
      expect(a.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
    }
    // El texto del enlace sobrevive, pero sin <a>.
    expect(screen.queryByRole('link', { name: 'x' })).not.toBeInTheDocument()
    expect(screen.getByText('x')).toBeInTheDocument()
    // Solo queda la imagen https.
    const imagenes = Array.from(caja.querySelectorAll('img'))
    expect(imagenes.map((i) => i.getAttribute('src'))).toEqual(['https://example.com/ok.png'])
    expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute('href', 'mailto:yo@example.com')
    expect(screen.getByRole('link', { name: 'ancla' })).toHaveAttribute('href', '#seccion')
  })

  it('Actualizar README dispara el POST y muestra el resultado devuelto', async () => {
    estado.integracion = CONFIGURADA
    estado.readme = readme({ markdown: '# Viejo' })
    const user = userEvent.setup()
    const { rerender } = render(<ReadmeGithub />)

    await user.click(screen.getByRole('button', { name: 'Actualizar README' }))
    expect(actualizarMutate).toHaveBeenCalledTimes(1)

    estado.actualizar = { data: readme({ markdown: '# Nuevo contenido' }), isPending: false }
    rerender(<ReadmeGithub />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Nuevo contenido' })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('heading', { name: 'Viejo' })).not.toBeInTheDocument()
  })

  it('mientras actualiza deshabilita el botón y cambia su texto', () => {
    estado.integracion = CONFIGURADA
    estado.readme = readme({})
    estado.actualizar = { isPending: true }
    render(<ReadmeGithub />)
    expect(screen.getByRole('button', { name: 'Actualizando…' })).toBeDisabled()
  })

  it('con cambios sin guardar no permite actualizar', async () => {
    estado.integracion = CONFIGURADA
    estado.readme = readme({})
    const user = userEvent.setup()
    render(<ReadmeGithub />)

    await user.type(screen.getByLabelText('Rama'), '-2')

    expect(screen.getByRole('button', { name: 'Actualizar README' })).toBeDisabled()
    expect(screen.getByText(/guarda los cambios para actualizar/i)).toBeInTheDocument()
  })

  it('muestra el error del PUT del API', () => {
    estado.integracion = INTEGRACION
    estado.guardarError = new ApiError('Repositorio inválido', 400, '/admin/integraciones/github')
    render(<ReadmeGithub />)
    expect(screen.getByRole('alert')).toHaveTextContent('Repositorio inválido')
  })
})

describe('transformarUrlReadme', () => {
  it('solo deja https, mailto y anclas', () => {
    expect(transformarUrlReadme('https://a.com/x')).toBe('https://a.com/x')
    expect(transformarUrlReadme('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(transformarUrlReadme('#top')).toBe('#top')
    expect(transformarUrlReadme('http://a.com')).toBe('')
    expect(transformarUrlReadme('javascript:alert(1)')).toBe('')
    expect(transformarUrlReadme(' JavaScript:alert(1)')).toBe('')
    expect(transformarUrlReadme('data:text/html;base64,AAAA')).toBe('')
    expect(transformarUrlReadme('/relativa')).toBe('')
  })
})
