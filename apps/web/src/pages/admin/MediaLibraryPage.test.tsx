import { ACCEPT_IMAGENES_Y_PDF } from '@/features/media/formatos-imagen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import type { Media, ResultadoEliminarLote, UsosPorMedia } from '@/features/media/types'
import { XhrFalso } from '@/test/xhr-falso'
import { MediaLibraryPage } from './MediaLibraryPage'

const IMAGEN: Media = {
  id: 'media-imagen-1',
  url: 'https://cdn.example.com/imagen.png',
  s3_key: 'perfil/imagen.png',
  tipo: 'imagen',
  ancho: 800,
  alto: 600,
  alt_text: 'Foto de perfil',
  created_at: '2024-01-01T00:00:00.000Z',
  variantes: [
    { formato: 'webp', ancho: 400, alto: 300, url: 'https://cdn.example.com/imagen-400.webp' },
    { formato: 'avif', ancho: 400, alto: 300, url: 'https://cdn.example.com/imagen-400.avif' },
  ],
}

const PDF: Media = {
  id: 'media-pdf-1',
  url: 'https://cdn.example.com/cv.pdf',
  s3_key: 'perfil/cv.pdf',
  tipo: 'pdf',
  ancho: null,
  alto: null,
  alt_text: null,
  created_at: '2024-01-02T00:00:00.000Z',
}

const useMediaListMock = vi.fn()
const useMediaUsosMock = vi.fn()
const eliminarMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const regenerarMutateMock = vi.fn()
const eliminarState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('@/features/media/useMediaLibrary', () => ({
  MEDIA_QUERY_KEY: ['media'],
  useMediaList: (filtros: unknown) => useMediaListMock(filtros),
  useMediaUsos: () => useMediaUsosMock(),
  useActualizarMedia: () => ({
    mutate: actualizarMutateMock,
    isPending: false,
    error: null,
  }),
  useEliminarMedia: () => ({
    mutate: vi.fn(),
    isPending: eliminarState.isPending,
    error: eliminarState.error,
  }),
  useEliminarMediaLote: () => ({ mutate: eliminarMutateMock, isPending: false }),
  useReemplazarMedia: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useRegenerarVariantes: () => ({ mutate: regenerarMutateMock, isPending: false }),
}))

// Fase 7e (UC-09): carpetas de la biblioteca (hooks simulados).
const CARPETAS = [
  { id: 'carpeta-1', nombre: 'Certificados', orden: 0, total: 3 },
  { id: 'carpeta-2', nombre: 'Imágenes', orden: 1, total: 7 },
]
const moverMutateMock = vi.fn()
vi.mock('@/features/media/useCarpetasMedia', () => ({
  useCarpetasMedia: () => ({ data: CARPETAS }),
  useMoverMedia: () => ({ mutate: moverMutateMock, isPending: false }),
  useCrearCarpeta: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRenombrarCarpeta: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReordenarCarpetas: () => ({ mutate: vi.fn(), isPending: false }),
  useEliminarCarpeta: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

function SondaUrl() {
  const { search } = useLocation()
  return <output data-testid="url">{search}</output>
}

function renderPagina(ruta = '/admin/media') {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <MediaLibraryPage />
        <SondaUrl />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function archivo(nombre: string, tipo = 'image/png') {
  return new File(['x'], nombre, { type: tipo })
}

describe('MediaLibraryPage (UC-09, Fase 7d)', () => {
  const xhrOriginal = globalThis.XMLHttpRequest

  beforeEach(() => {
    XhrFalso.instalar()
    localStorage.clear()
    eliminarState.isPending = false
    eliminarState.error = null
    useMediaListMock.mockImplementation(() => ({
      data: [IMAGEN, PDF],
      isLoading: false,
      error: null,
    }))
    const usos: UsosPorMedia = {
      [IMAGEN.id]: [
        { tipo: 'proyecto', id: 'p1', nombre: 'Mi proyecto' },
        { tipo: 'perfil', id: 'u1', nombre: 'Perfil' },
      ],
    }
    useMediaUsosMock.mockReturnValue({ data: usos })
  })

  afterEach(() => {
    ;(globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = xhrOriginal
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('muestra nombre de archivo, dimensiones, variantes y el distintivo "En uso (n)" con su detalle', async () => {
    const user = userEvent.setup()
    renderPagina()

    expect(screen.getByText('imagen.png')).toBeInTheDocument()
    expect(screen.getByText(/800×600 px · 2 variantes/)).toBeInTheDocument()
    expect(screen.getByText('cv.pdf')).toBeInTheDocument()
    expect(screen.getByText('(sin texto alternativo)')).toBeInTheDocument()

    const distintivo = screen.getByText('En uso (2)')
    await user.hover(distintivo)
    expect((await screen.findAllByText('proyecto: Mi proyecto')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('perfil: Perfil').length).toBeGreaterThan(0)
    expect(screen.queryByText(/En uso \(0\)/)).not.toBeInTheDocument()
  })

  it('pasa los filtros al hook y los sincroniza con la URL (tipo, orden y q con debounce)', async () => {
    const user = userEvent.setup()
    renderPagina('/admin/media?tipo=pdf&orden=nombre&q=cv')

    expect(useMediaListMock).toHaveBeenLastCalledWith({
      tipo: 'pdf',
      q: 'cv',
      orden: 'nombre',
    })
    expect(screen.getByLabelText('Buscar archivos')).toHaveValue('cv')

    await user.click(screen.getByRole('combobox', { name: 'Filtrar por tipo' }))
    await user.click(await screen.findByRole('option', { name: 'Imágenes' }))
    await waitFor(() =>
      expect(screen.getByTestId('url').textContent).toContain('tipo=imagen'),
    )

    await user.click(screen.getByRole('combobox', { name: 'Ordenar por' }))
    await user.click(await screen.findByRole('option', { name: 'Más recientes' }))
    await waitFor(() =>
      expect(screen.getByTestId('url').textContent).not.toContain('orden='),
    )

    const buscador = screen.getByLabelText('Buscar archivos')
    await user.clear(buscador)
    await user.type(buscador, 'logo')
    // Antes del debounce la URL aún conserva el valor anterior.
    expect(screen.getByTestId('url').textContent).toContain('q=cv')
    await waitFor(() => expect(screen.getByTestId('url').textContent).toContain('q=logo'))
  })

  it('persiste la vista en localStorage', async () => {
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Vista de lista' }))

    expect(localStorage.getItem('biblioteca-vista')).toBe('lista')
    expect(screen.getByRole('button', { name: 'Vista de lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('al soltar 2 archivos crea 2 entradas en la cola y muestra el overlay mientras se arrastra', async () => {
    renderPagina()
    const archivos = [archivo('a.png'), archivo('b.png')]
    const dataTransfer = { types: ['Files'], files: archivos }

    fireEvent.dragEnter(document.body, { dataTransfer })
    fireEvent.dragEnter(screen.getByText('Biblioteca de medios'), { dataTransfer })
    expect(screen.getByText('Suelta para subir')).toBeInTheDocument()

    // Contado: salir de un hijo no apaga el overlay mientras queda otro dentro.
    fireEvent.dragLeave(screen.getByText('Biblioteca de medios'), { dataTransfer })
    expect(screen.getByText('Suelta para subir')).toBeInTheDocument()

    fireEvent.drop(document.body, { dataTransfer })

    expect(screen.queryByText('Suelta para subir')).not.toBeInTheDocument()
    const cola = await screen.findByRole('region', { name: 'Cola de subida' })
    expect(within(cola).getByText('a.png')).toBeInTheDocument()
    expect(within(cola).getByText('b.png')).toBeInTheDocument()
    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(2))

    act(() => XhrFalso.instancias[0].progreso(50, 100))
    expect(within(cola).getByText(/Subiendo 50%/)).toBeInTheDocument()
    act(() => XhrFalso.instancias[0].responder(201, { id: 'm1' }))
    await waitFor(() => expect(within(cola).getByText('1 de 2 archivos subidos')).toBeInTheDocument())
  })

  it('ignora arrastres que no traen archivos', () => {
    renderPagina()
    fireEvent.dragEnter(document.body, { dataTransfer: { types: ['text/plain'], files: [] } })
    expect(screen.queryByText('Suelta para subir')).not.toBeInTheDocument()
  })

  it('el botón "Subir archivos" admite varios archivos y los encola', async () => {
    const user = userEvent.setup()
    renderPagina()

    const input = screen.getByLabelText('Seleccionar archivos para subir')
    expect(input).toHaveAttribute('multiple')
    expect(input).toHaveAttribute('accept', ACCEPT_IMAGENES_Y_PDF)

    await user.upload(input, [archivo('uno.png'), archivo('dos.pdf', 'application/pdf')])

    const cola = await screen.findByRole('region', { name: 'Cola de subida' })
    expect(within(cola).getByText('uno.png')).toBeInTheDocument()
    expect(within(cola).getByText('dos.pdf')).toBeInTheDocument()
  })

  it('selección: "Seleccionar todo lo visible", contador y lote con archivos omitidos', async () => {
    const user = userEvent.setup()
    const resultado: ResultadoEliminarLote = {
      eliminados: [PDF.id],
      omitidos: [{ id: IMAGEN.id, motivo: 'El archivo está en uso' }],
    }
    eliminarMutateMock.mockImplementation((_ids, opciones) => opciones.onSuccess(resultado))
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Seleccionar' }))
    await user.click(screen.getByRole('button', { name: 'Seleccionar todo lo visible' }))
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar seleccionados' }))
    expect(await screen.findByText('¿Eliminar 2 archivos?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(eliminarMutateMock).toHaveBeenCalledWith(
      [IMAGEN.id, PDF.id],
      expect.any(Object),
    )
    expect(await screen.findByText('Resultado de la eliminación')).toBeInTheDocument()
    const omitidos = screen.getByRole('list', { name: 'Archivos omitidos' })
    expect(within(omitidos).getByText('imagen.png')).toBeInTheDocument()
    expect(within(omitidos).getByText('El archivo está en uso')).toBeInTheDocument()
  })

  it('Supr con selección abre el diálogo y Esc sale del modo selección', async () => {
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Seleccionar' }))
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar cv.pdf' }))
    await user.keyboard('{Delete}')
    expect(await screen.findByText('¿Eliminar 1 archivo?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText('¿Eliminar 1 archivo?')).not.toBeInTheDocument())

    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('"Copiar URL" escribe en el portapapeles y avisa con un toast', async () => {
    const user = userEvent.setup()
    renderPagina()
    // `userEvent.setup()` instala su propio portapapeles; se espía después.
    const escribir = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()

    await user.click(screen.getByRole('button', { name: 'Copiar URL de imagen.png' }))

    expect(escribir).toHaveBeenCalledWith(IMAGEN.url)
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('URL copiada al portapapeles.'))
  })

  it('edición en línea del texto alternativo: Enter guarda, Esc cancela', async () => {
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Editar texto alternativo de imagen.png' }))
    const campo = screen.getByRole('textbox', { name: 'Texto alternativo de imagen.png' })
    await user.clear(campo)
    await user.type(campo, 'Nuevo texto{Enter}')
    expect(actualizarMutateMock).toHaveBeenCalledWith({
      id: IMAGEN.id,
      alt_text: 'Nuevo texto',
    })

    actualizarMutateMock.mockClear()
    await user.click(screen.getByRole('button', { name: 'Editar texto alternativo de imagen.png' }))
    await user.type(screen.getByRole('textbox', { name: 'Texto alternativo de imagen.png' }), 'xyz{Escape}')
    expect(actualizarMutateMock).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('textbox', { name: 'Texto alternativo de imagen.png' }),
    ).not.toBeInTheDocument()
  })

  it('el detalle muestra los usos y deshabilita "Eliminar" si hay usos', async () => {
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Abrir detalle de imagen.png' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('proyecto: Mi proyecto')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Eliminar' })).toBeDisabled()
  })

  it('el detalle de un archivo sin usos permite eliminar', async () => {
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Abrir detalle de cv.pdf' }))
    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('No se usa en ningún lugar.')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Eliminar' })).toBeEnabled()
  })

  it('"Generar variantes faltantes" dispara la mutación y avisa con procesadas/omitidas/errores (Fase 8, UC-09)', async () => {
    const user = userEvent.setup()
    regenerarMutateMock.mockImplementation((_v, opciones) =>
      opciones.onSuccess({ procesadas: 3, omitidas: 2, errores: [{ id: 'x', motivo: 'fallo' }] }),
    )
    renderPagina()

    await user.click(screen.getByRole('button', { name: /generar variantes faltantes/i }))

    expect(regenerarMutateMock).toHaveBeenCalledTimes(1)
    const { toast } = await import('sonner')
    expect(toast.warning).toHaveBeenCalledWith(
      'Variantes generadas: 3 procesadas, 2 omitidas, 1 con error.',
    )
  })

  it('muestra el mensaje de error 409 del detalle sin quitar el archivo de la lista', async () => {
    const user = userEvent.setup()
    eliminarState.error = new ApiError(
      'No se puede eliminar: este archivo está en uso (proyecto, certificación o perfil). Reemplázalo en vez de borrarlo.',
      409,
      '/admin/media/media-pdf-1',
    )
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Abrir detalle de cv.pdf' }))

    expect(
      await screen.findByText(/no se puede eliminar: este archivo está en uso/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('cv.pdf').length).toBeGreaterThan(0)
  })

  it('con filtros activos y sin resultados explica que nada coincide', () => {
    useMediaListMock.mockImplementation(() => ({ data: [], isLoading: false, error: null }))
    renderPagina('/admin/media?q=zzz')
    expect(screen.getByText('Ningún archivo coincide con los filtros.')).toBeInTheDocument()
  })

  describe('carpetas (Fase 7e, UC-09)', () => {
    it('lee ?carpeta= de la URL, filtra la lista con carpeta_id y la barra la marca activa', () => {
      renderPagina('/admin/media?carpeta=carpeta-1')
      expect(useMediaListMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ carpeta_id: 'carpeta-1' }),
      )
      expect(screen.getByRole('button', { name: /^Certificados/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('elegir una carpeta o "Sin carpeta" actualiza la URL; "Todos" la quita', async () => {
      const user = userEvent.setup()
      renderPagina()
      expect(useMediaListMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ carpeta_id: undefined }),
      )

      await user.click(screen.getByRole('button', { name: /^Imágenes/ }))
      expect(screen.getByTestId('url')).toHaveTextContent('?carpeta=carpeta-2')

      await user.click(screen.getByRole('button', { name: 'Sin carpeta' }))
      expect(screen.getByTestId('url')).toHaveTextContent('?carpeta=ninguna')
      expect(useMediaListMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ carpeta_id: 'ninguna' }),
      )

      await user.click(screen.getByRole('button', { name: 'Todos' }))
      expect(screen.getByTestId('url')).not.toHaveTextContent('carpeta')
    })

    it('las subidas caen en la carpeta activa y el panel lo indica ("Subiendo a:")', async () => {
      const user = userEvent.setup()
      renderPagina('/admin/media?carpeta=carpeta-1')

      const cola = screen.getByRole('region', { name: 'Cola de subida' })
      expect(within(cola).getByText('Subiendo a:')).toBeInTheDocument()
      expect(within(cola).getByRole('combobox')).toHaveTextContent('Certificados')

      await user.upload(screen.getByLabelText('Seleccionar archivos para subir'), archivo('uno.png'))
      await waitFor(() => expect(XhrFalso.instancias).toHaveLength(1))
      const formData = XhrFalso.instancias[0].body as FormData
      expect(formData.get('carpeta_id')).toBe('carpeta-1')
    })

    it('cambiar el destino en el panel antes de subir sobrescribe la carpeta activa; "Sin carpeta" no envía carpeta_id', async () => {
      const user = userEvent.setup()
      renderPagina('/admin/media?carpeta=carpeta-1')

      await user.click(within(screen.getByRole('region', { name: 'Cola de subida' })).getByRole('combobox'))
      await user.click(screen.getByRole('option', { name: 'Imágenes' }))
      await user.upload(screen.getByLabelText('Seleccionar archivos para subir'), archivo('a.png'))
      await waitFor(() => expect(XhrFalso.instancias).toHaveLength(1))
      expect((XhrFalso.instancias[0].body as FormData).get('carpeta_id')).toBe('carpeta-2')

      await user.click(within(screen.getByRole('region', { name: 'Cola de subida' })).getByRole('combobox'))
      await user.click(screen.getByRole('option', { name: 'Sin carpeta' }))
      await user.upload(screen.getByLabelText('Seleccionar archivos para subir'), archivo('b.png'))
      await waitFor(() => expect(XhrFalso.instancias).toHaveLength(2))
      expect((XhrFalso.instancias[1].body as FormData).has('carpeta_id')).toBe(false)
    })

    it('"Mover a…" en modo selección mueve los ids marcados y limpia la selección', async () => {
      const user = userEvent.setup()
      moverMutateMock.mockImplementation((_payload, opciones) => opciones.onSuccess())
      renderPagina()

      await user.click(screen.getByRole('button', { name: 'Seleccionar' }))
      await user.click(screen.getByRole('checkbox', { name: 'Seleccionar cv.pdf' }))
      await user.click(screen.getByRole('button', { name: /Mover a/ }))
      await user.click(await screen.findByRole('menuitem', { name: 'Imágenes' }))

      expect(moverMutateMock).toHaveBeenCalledWith(
        { ids: [PDF.id], carpeta_id: 'carpeta-2' },
        expect.any(Object),
      )
      // Salió del modo selección.
      expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeInTheDocument()
    })

    it('"Mover a…" con "Sin carpeta" envía carpeta_id null y está deshabilitado sin selección', async () => {
      const user = userEvent.setup()
      renderPagina()
      await user.click(screen.getByRole('button', { name: 'Seleccionar' }))
      expect(screen.getByRole('button', { name: /Mover a/ })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Seleccionar todo lo visible' }))
      await user.click(screen.getByRole('button', { name: /Mover a/ }))
      await user.click(await screen.findByRole('menuitem', { name: 'Sin carpeta' }))
      expect(moverMutateMock).toHaveBeenCalledWith(
        { ids: [IMAGEN.id, PDF.id], carpeta_id: null },
        expect.any(Object),
      )
    })

    it('las tarjetas son arrastrables y llevan su id; si están seleccionadas arrastran toda la selección', async () => {
      const user = userEvent.setup()
      const { container } = renderPagina()
      const tarjetas = container.querySelectorAll('li[draggable="true"]')
      expect(tarjetas).toHaveLength(2)

      const datos: Record<string, string> = {}
      const dataTransfer = {
        types: [] as string[],
        setData: (tipo: string, valor: string) => {
          datos[tipo] = valor
        },
      }
      fireEvent.dragStart(tarjetas[0], { dataTransfer })
      expect(JSON.parse(datos['application/x-media-ids'])).toEqual([IMAGEN.id])

      await user.click(screen.getByRole('button', { name: 'Seleccionar' }))
      await user.click(screen.getByRole('button', { name: 'Seleccionar todo lo visible' }))
      fireEvent.dragStart(tarjetas[1], { dataTransfer })
      expect(JSON.parse(datos['application/x-media-ids'])).toEqual([IMAGEN.id, PDF.id])
    })

    it('arrastrar una tarjeta a una carpeta de la barra la mueve', () => {
      renderPagina()
      const destino = screen.getByRole('button', { name: /^Imágenes/ }).parentElement as HTMLElement
      const dataTransfer = {
        types: ['application/x-media-ids'],
        getData: () => JSON.stringify([IMAGEN.id]),
      }
      fireEvent.dragOver(destino, { dataTransfer })
      fireEvent.drop(destino, { dataTransfer })
      expect(moverMutateMock).toHaveBeenCalledWith(
        { ids: [IMAGEN.id], carpeta_id: 'carpeta-2' },
        expect.any(Object),
      )
    })

    it('la vista lista muestra el nombre de la carpeta de cada archivo', async () => {
      localStorage.setItem('biblioteca-vista', 'lista')
      useMediaListMock.mockImplementation(() => ({
        data: [{ ...IMAGEN, carpeta_id: 'carpeta-1' }, PDF],
        isLoading: false,
        error: null,
      }))
      renderPagina()
      expect(screen.getByText(/Carpeta: Certificados/)).toBeInTheDocument()
      expect(screen.getByText(/Carpeta: Sin carpeta/)).toBeInTheDocument()
    })
  })
})
