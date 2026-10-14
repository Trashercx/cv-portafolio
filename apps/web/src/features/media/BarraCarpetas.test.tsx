import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BarraCarpetas } from './BarraCarpetas'
import type { CarpetaMedia } from './types'

// Prueba la barra con los hooks reales y `fetch` simulado (Fase 7e, UC-09).
const CARPETAS: CarpetaMedia[] = [
  { id: 'c1', nombre: 'Certificados', orden: 0, total: 3 },
  { id: 'c2', nombre: 'Imágenes', orden: 1, total: 7 },
  { id: 'c3', nombre: 'Logos', orden: 2, total: 0 },
]

const fetchMock = vi.fn()

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function llamadas(metodo: string, ruta: string) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      String(url).endsWith(ruta) && ((init as RequestInit | undefined)?.method ?? 'GET') === metodo,
  )
}

function renderBarra(props: Partial<React.ComponentProps<typeof BarraCarpetas>> = {}) {
  const onSeleccionar = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <BarraCarpetas
        carpetas={CARPETAS}
        activa={undefined}
        onSeleccionar={onSeleccionar}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onSeleccionar }
}

describe('BarraCarpetas (UC-09, Fase 7e)', () => {
  beforeEach(() => {
    fetchMock.mockImplementation(() => respuesta(200, {}))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('lista "Todos", "Sin carpeta" y las carpetas con su total', () => {
    renderBarra()
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sin carpeta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Certificados/ })).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: /^Imágenes/ })).toHaveTextContent('7')
  })

  it('marca la carpeta activa y notifica la selección', async () => {
    const user = userEvent.setup()
    const { onSeleccionar } = renderBarra({ activa: 'c2' })
    expect(screen.getByRole('button', { name: /^Imágenes/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /^Logos/ }))
    expect(onSeleccionar).toHaveBeenCalledWith('c3')
    await user.click(screen.getByRole('button', { name: 'Sin carpeta' }))
    expect(onSeleccionar).toHaveBeenCalledWith('ninguna')
  })

  it('crea una carpeta con POST /admin/media/carpetas', async () => {
    const user = userEvent.setup()
    renderBarra()
    await user.click(screen.getByRole('button', { name: 'Nueva carpeta' }))
    await user.type(screen.getByLabelText('Nombre de la carpeta'), '  Diplomas ')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    await waitFor(() => expect(llamadas('POST', '/admin/media/carpetas')).toHaveLength(1))
    expect(JSON.parse(llamadas('POST', '/admin/media/carpetas')[0][1].body)).toEqual({
      nombre: 'Diplomas',
    })
    await waitFor(() =>
      expect(screen.queryByLabelText('Nombre de la carpeta')).not.toBeInTheDocument(),
    )
  })

  it('un 409 muestra "Ya existe una carpeta con ese nombre" y mantiene el diálogo', async () => {
    fetchMock.mockImplementation(() => respuesta(409, { message: 'Conflicto' }))
    const user = userEvent.setup()
    renderBarra()
    await user.click(screen.getByRole('button', { name: 'Nueva carpeta' }))
    await user.type(screen.getByLabelText('Nombre de la carpeta'), 'Logos')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Ya existe una carpeta con ese nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre de la carpeta')).toBeInTheDocument()
  })

  it('valida el nombre: obligatorio y máximo 60 caracteres', async () => {
    const user = userEvent.setup()
    renderBarra()
    await user.click(screen.getByRole('button', { name: 'Nueva carpeta' }))
    await user.click(screen.getByRole('button', { name: 'Crear' }))
    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nombre de la carpeta'), {
      target: { value: 'x'.repeat(61) },
    })
    await user.click(screen.getByRole('button', { name: 'Crear' }))
    expect(await screen.findByText('Máximo 60 caracteres.')).toBeInTheDocument()
    expect(llamadas('POST', '/admin/media/carpetas')).toHaveLength(0)
  })

  it('renombra con PATCH /admin/media/carpetas/:id', async () => {
    const user = userEvent.setup()
    renderBarra()
    await user.click(screen.getByRole('button', { name: 'Opciones de la carpeta Logos' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Renombrar' }))
    const campo = screen.getByLabelText('Nombre de la carpeta')
    expect(campo).toHaveValue('Logos')
    await user.clear(campo)
    await user.type(campo, 'Marcas')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(llamadas('PATCH', '/admin/media/carpetas/c3')).toHaveLength(1))
    expect(JSON.parse(llamadas('PATCH', '/admin/media/carpetas/c3')[0][1].body)).toEqual({
      nombre: 'Marcas',
    })
  })

  it('"Subir" y "Bajar" reordenan con PATCH /reordenar; los extremos quedan deshabilitados', async () => {
    const user = userEvent.setup()
    renderBarra()

    await user.click(screen.getByRole('button', { name: 'Opciones de la carpeta Certificados' }))
    expect(await screen.findByRole('menuitem', { name: 'Subir' })).toHaveAttribute('data-disabled')
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Opciones de la carpeta Imágenes' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Subir' }))
    await waitFor(() =>
      expect(llamadas('PATCH', '/admin/media/carpetas/reordenar')).toHaveLength(1),
    )
    expect(
      JSON.parse(llamadas('PATCH', '/admin/media/carpetas/reordenar')[0][1].body),
    ).toEqual({ ids: ['c2', 'c1', 'c3'] })

    await user.click(screen.getByRole('button', { name: 'Opciones de la carpeta Certificados' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Bajar' }))
    await waitFor(() =>
      expect(llamadas('PATCH', '/admin/media/carpetas/reordenar')).toHaveLength(2),
    )
    expect(
      JSON.parse(llamadas('PATCH', '/admin/media/carpetas/reordenar')[1][1].body),
    ).toEqual({ ids: ['c2', 'c1', 'c3'] })
  })

  it('eliminar pide confirmación que explica que los archivos quedan sin carpeta', async () => {
    const user = userEvent.setup()
    const { onSeleccionar } = renderBarra({ activa: 'c3' })
    await user.click(screen.getByRole('button', { name: 'Opciones de la carpeta Logos' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))

    expect(await screen.findByText(/quedan sin carpeta/)).toBeInTheDocument()
    expect(llamadas('DELETE', '/admin/media/carpetas/c3')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(llamadas('DELETE', '/admin/media/carpetas/c3')).toHaveLength(1))
    // Si la carpeta eliminada era la activa, vuelve a "Todos".
    await waitFor(() => expect(onSeleccionar).toHaveBeenCalledWith(undefined))
  })

  it('cancelar la confirmación no elimina', async () => {
    const user = userEvent.setup()
    renderBarra()
    await user.click(screen.getByRole('button', { name: 'Opciones de la carpeta Logos' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(llamadas('DELETE', '/admin/media/carpetas/c3')).toHaveLength(0)
  })

  it('soltar ids sobre una carpeta llama a POST /admin/media/mover con esos ids', async () => {
    const onMovidos = vi.fn()
    renderBarra({ onMovidos })
    const destino = screen.getByRole('button', { name: /^Imágenes/ }).parentElement as HTMLElement
    const dataTransfer = {
      types: ['application/x-media-ids'],
      getData: () => JSON.stringify(['m1', 'm2']),
    }

    fireEvent.dragOver(destino, { dataTransfer })
    // Resaltado visual mientras se pasa por encima.
    expect(destino.className).toContain('ring-2')
    fireEvent.drop(destino, { dataTransfer })
    expect(destino.className).not.toContain('ring-2')

    await waitFor(() => expect(llamadas('POST', '/admin/media/mover')).toHaveLength(1))
    expect(JSON.parse(llamadas('POST', '/admin/media/mover')[0][1].body)).toEqual({
      ids: ['m1', 'm2'],
      carpeta_id: 'c2',
    })
    await waitFor(() => expect(onMovidos).toHaveBeenCalled())
  })

  it('soltar sobre "Sin carpeta" envía carpeta_id null', async () => {
    renderBarra()
    const dataTransfer = {
      types: ['application/x-media-ids'],
      getData: () => JSON.stringify(['m1']),
    }
    fireEvent.drop(screen.getByRole('button', { name: 'Sin carpeta' }), { dataTransfer })
    await waitFor(() => expect(llamadas('POST', '/admin/media/mover')).toHaveLength(1))
    expect(JSON.parse(llamadas('POST', '/admin/media/mover')[0][1].body)).toEqual({
      ids: ['m1'],
      carpeta_id: null,
    })
  })

  it('ignora arrastres que no son de la biblioteca (archivos del sistema, JSON inválido)', () => {
    renderBarra()
    const destino = screen.getByRole('button', { name: /^Imágenes/ }).parentElement as HTMLElement
    fireEvent.drop(destino, { dataTransfer: { types: ['Files'], getData: () => '' } })
    fireEvent.drop(destino, {
      dataTransfer: { types: ['application/x-media-ids'], getData: () => 'no-json' },
    })
    expect(llamadas('POST', '/admin/media/mover')).toHaveLength(0)
  })

  it('ignora un arrastre cuyos ids no son todos cadenas no vacías', () => {
    renderBarra()
    const destino = screen.getByRole('button', { name: /^Imágenes/ }).parentElement as HTMLElement
    for (const ids of [[1, 2], ['m1', ''], ['m1', null], [{ id: 'm1' }]]) {
      fireEvent.drop(destino, {
        dataTransfer: { types: ['application/x-media-ids'], getData: () => JSON.stringify(ids) },
      })
    }
    expect(llamadas('POST', '/admin/media/mover')).toHaveLength(0)
  })
})
