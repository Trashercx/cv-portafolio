import { ACCEPT_IMAGENES } from '@/features/media/formatos-imagen'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Media } from '@/features/media/types'
import { MediaField } from './MediaField'

const IMAGEN_A: Media = {
  id: 'media-a',
  url: 'https://cdn.example.com/a.png',
  s3_key: 'a.png',
  tipo: 'imagen',
  ancho: 100,
  alto: 100,
  alt_text: 'Imagen A',
  created_at: '2024-01-01T00:00:00.000Z',
}

const IMAGEN_B: Media = {
  id: 'media-b',
  url: 'https://cdn.example.com/b.png',
  s3_key: 'b.png',
  tipo: 'imagen',
  ancho: 100,
  alto: 100,
  alt_text: 'Imagen B',
  created_at: '2024-01-02T00:00:00.000Z',
}

const DOCUMENTO_PDF: Media = {
  id: 'media-pdf',
  url: 'https://cdn.example.com/certificado.pdf',
  s3_key: 'certificado.pdf',
  tipo: 'pdf',
  ancho: null,
  alto: null,
  alt_text: 'Certificado AWS',
  created_at: '2024-01-03T00:00:00.000Z',
}

const useMediaListMock = vi.fn()

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: (tipo?: unknown) => useMediaListMock(tipo),
}))

const CARPETAS = [
  { id: 'carpeta-1', nombre: 'Certificados', orden: 0, total: 2 },
  { id: 'carpeta-2', nombre: 'Imágenes', orden: 1, total: 5 },
]
vi.mock('@/features/media/useCarpetasMedia', () => ({
  useCarpetasMedia: () => ({ data: CARPETAS }),
}))

vi.mock('@/features/media/useUploadMedia', () => ({
  useUploadMedia: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const onUploadedMock = vi.fn()

describe('MediaField', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('alterna entre "Subir nuevo" y "Elegir de biblioteca"', async () => {
    useMediaListMock.mockReturnValue({ data: [], isLoading: false })
    const user = userEvent.setup()
    render(<MediaField label="Foto de perfil" onUploaded={onUploadedMock} />)

    // Por defecto muestra la pestaña "Subir nuevo" (el input de archivo).
    expect(screen.getByLabelText(/foto de perfil/i)).toBeInTheDocument()

    await user.click(
      screen.getByRole('tab', { name: /elegir de biblioteca/i }),
    )

    expect(
      screen.getByRole('button', { name: /elegir de biblioteca/i }),
    ).toBeInTheDocument()
  })

  it('en "Elegir de biblioteca", clic en una miniatura llama a onUploaded con el media correcto', async () => {
    useMediaListMock.mockReturnValue({
      data: [IMAGEN_A, IMAGEN_B],
      isLoading: false,
    })
    const user = userEvent.setup()
    render(<MediaField label="Foto de perfil" onUploaded={onUploadedMock} />)

    await user.click(
      screen.getByRole('tab', { name: /elegir de biblioteca/i }),
    )
    await user.click(
      screen.getByRole('button', { name: /elegir de biblioteca/i }),
    )

    expect(useMediaListMock).toHaveBeenCalledWith('imagen')

    const miniaturaB = await screen.findByAltText('Imagen B')
    await user.click(miniaturaB)

    expect(onUploadedMock).toHaveBeenCalledWith(IMAGEN_B)
  })

  it('por defecto (sin tiposPermitidos) solo acepta imagen en el input de archivo', () => {
    useMediaListMock.mockReturnValue({ data: [], isLoading: false })
    render(<MediaField label="Foto de perfil" onUploaded={onUploadedMock} />)

    expect(screen.getByLabelText(/foto de perfil/i)).toHaveAttribute(
      'accept',
      ACCEPT_IMAGENES,
    )
  })

  it('con tiposPermitidos=["imagen","pdf"] (certificación), el input acepta ambos y la biblioteca no filtra por tipo en el servidor', async () => {
    useMediaListMock.mockReturnValue({
      data: [IMAGEN_A, DOCUMENTO_PDF],
      isLoading: false,
    })
    const user = userEvent.setup()
    render(
      <MediaField
        label="Logo o documento del certificado (imagen o PDF)"
        tiposPermitidos={['imagen', 'pdf']}
        onUploaded={onUploadedMock}
      />,
    )

    expect(
      screen.getByLabelText(/logo o documento del certificado/i),
    ).toHaveAttribute('accept', `${ACCEPT_IMAGENES},application/pdf`)

    await user.click(
      screen.getByRole('tab', { name: /elegir de biblioteca/i }),
    )
    await user.click(
      screen.getByRole('button', { name: /elegir de biblioteca/i }),
    )

    // Con más de un tipo permitido no hay filtro combinado en el backend
    // (`GET /admin/media?tipo=` acepta un solo valor): se pide todo y se
    // filtra en el cliente.
    expect(useMediaListMock).toHaveBeenCalledWith(undefined)

    // El PDF se ve como ítem seleccionable (miniatura de su primera página, no un <img> roto) y
    // elegirlo llama a onUploaded con ese Media.
    const itemPdf = await screen.findByText('certificado.pdf')
    await user.click(itemPdf)

    expect(onUploadedMock).toHaveBeenCalledWith(DOCUMENTO_PDF)
  })

  it('filtra la biblioteca por carpeta y pasa carpeta_id a useMediaList (Fase 7e, UC-09)', async () => {
    useMediaListMock.mockReturnValue({ data: [IMAGEN_A], isLoading: false })
    const user = userEvent.setup()
    render(<MediaField label="Foto de perfil" onUploaded={onUploadedMock} />)

    await user.click(screen.getByRole('tab', { name: /elegir de biblioteca/i }))
    await user.click(screen.getByRole('button', { name: /elegir de biblioteca/i }))

    // Sin carpeta elegida se conserva el argumento histórico.
    expect(useMediaListMock).toHaveBeenLastCalledWith('imagen')

    await user.click(screen.getByRole('combobox', { name: /filtrar por carpeta/i }))
    expect(screen.getByRole('option', { name: 'Todas las carpetas' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sin carpeta' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Certificados' }))
    expect(useMediaListMock).toHaveBeenLastCalledWith({
      tipo: 'imagen',
      carpeta_id: 'carpeta-1',
    })

    await user.click(screen.getByRole('combobox', { name: /filtrar por carpeta/i }))
    await user.click(screen.getByRole('option', { name: 'Sin carpeta' }))
    expect(useMediaListMock).toHaveBeenLastCalledWith({
      tipo: 'imagen',
      carpeta_id: 'ninguna',
    })
  })
})
