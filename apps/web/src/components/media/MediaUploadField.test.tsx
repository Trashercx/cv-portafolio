import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCEPT_IMAGENES } from '@/features/media/formatos-imagen'
import { MediaUploadField } from './MediaUploadField'

// jsdom no implementa `URL.createObjectURL`/`revokeObjectURL` de forma real;
// se mockean para poder afirmar CUÁNDO se llama a cada uno (revocación
// prematura vs. limpieza al desmontar).
let contadorBlob = 0


// Fase 7g: la conversión real no corre en jsdom; los .heic se "convierten" a un JPEG simulado.
vi.mock('@/features/media/heic-a-jpeg', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/features/media/heic-a-jpeg')>()
  return {
    ...real,
    prepararArchivoParaSubir: vi.fn(async (file: File) =>
      /\.heic$/i.test(file.name)
        ? {
            file: new File(['jpg'], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' }),
            formato: 'imagen' as const,
          }
        : real.prepararArchivoParaSubir(file),
    ),
  }
})

const uploadMutateMock = vi.fn()
const uploadState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('@/features/media/useUploadMedia', () => ({
  useUploadMedia: () => ({
    mutate: uploadMutateMock,
    isPending: uploadState.isPending,
    error: uploadState.error,
  }),
}))

const onUploadedMock = vi.fn()
const onClearMock = vi.fn()

function crearArchivo(nombre = 'foto.png', tipo = 'image/png') {
  return new File(['contenido'], nombre, { type: tipo })
}

describe('MediaUploadField', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    uploadState.isPending = false
    uploadState.error = null
    contadorBlob = 0
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => `blob:mock-${(contadorBlob += 1)}`)
    revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    vi.clearAllMocks()
  })

  it('al seleccionar un archivo muestra la previsualización pendiente y los botones Subir/Cancelar sin subir todavía', async () => {
    const user = userEvent.setup()
    render(
      <MediaUploadField
        label="Foto de perfil"
        accept="image/*"
        tipo="imagen"
        onUploaded={onUploadedMock}
      />,
    )

    await user.upload(screen.getByLabelText(/foto de perfil/i), crearArchivo())

    expect(screen.getByText(/pendiente de subir/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^subir$/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^cancelar$/i }),
    ).toBeInTheDocument()
    expect(uploadMutateMock).not.toHaveBeenCalled()
  })

  it('click en "Subir" llama a upload.mutate con el archivo correcto y luego a onUploaded', async () => {
    const user = userEvent.setup()
    const archivo = crearArchivo()
    uploadMutateMock.mockImplementation((_vars, options) => {
      options?.onSuccess?.({ id: 'media-1', url: 'blob:fake' })
    })

    render(
      <MediaUploadField
        label="Foto de perfil"
        accept="image/*"
        tipo="imagen"
        onUploaded={onUploadedMock}
      />,
    )

    await user.upload(screen.getByLabelText(/foto de perfil/i), archivo)
    await user.click(screen.getByRole('button', { name: /^subir$/i }))

    expect(uploadMutateMock).toHaveBeenCalledWith(
      { file: archivo, tipo: 'imagen' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    await waitFor(() =>
      expect(onUploadedMock).toHaveBeenCalledWith({
        id: 'media-1',
        url: 'blob:fake',
      }),
    )
    // Tras confirmar, el estado "pendiente" desaparece.
    expect(screen.queryByText(/pendiente de subir/i)).not.toBeInTheDocument()
  })

  it('al seleccionar un PDF (certificación) muestra una previsualización embebida en vez de un <img> roto, y permite subirlo', async () => {
    const user = userEvent.setup()
    render(
      <MediaUploadField
        label="Logo o documento del certificado (imagen o PDF)"
        accept="image/*,application/pdf"
        onUploaded={onUploadedMock}
      />,
    )

    await user.upload(
      screen.getByLabelText(/logo o documento del certificado/i),
      crearArchivo('certificado.pdf', 'application/pdf'),
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    // Al ampliar, se abre el visor (Fase 7m) con el nombre del archivo y el PDF
    // embebido como documento (no como <img> roto) usando
    // `<object data type="application/pdf">` (ver MediaPreview.tsx y VisorPdfDialog.tsx).
    await user.click(screen.getByRole('button', { name: /ver documento/i }))
    expect(screen.getByRole('heading', { name: 'certificado.pdf' })).toBeInTheDocument()
    const objeto = document.querySelector('object[type="application/pdf"]')
    expect(objeto).toHaveAttribute('data', expect.stringMatching(/^blob:mock-/))

    expect(screen.getByText(/pendiente de subir/i)).toBeInTheDocument()
    expect(uploadMutateMock).not.toHaveBeenCalled()
  })

  it('con currentMediaTipo="pdf", el archivo ya confirmado se previsualiza como documento embebido, no como <img>', () => {
    render(
      <MediaUploadField
        label="Logo o documento del certificado (imagen o PDF)"
        accept="image/*,application/pdf"
        currentMediaId="media-existente"
        currentPreviewUrl="https://cdn.example.com/certificado.pdf"
        currentMediaTipo="pdf"
        onUploaded={onUploadedMock}
      />,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('click en "Cancelar" antes de subir no llama a upload.mutate y restaura el archivo ya confirmado, si había uno', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MediaUploadField
        label="Foto de perfil"
        accept="image/*"
        tipo="imagen"
        currentMediaId="media-existente"
        currentPreviewUrl="https://cdn.example.com/actual.png"
        onUploaded={onUploadedMock}
        onClear={onClearMock}
      />,
    )

    // Estado confirmado inicial: se ve la imagen actual.
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/actual.png',
    )

    await user.upload(screen.getByLabelText(/foto de perfil/i), crearArchivo())
    expect(screen.getByText(/pendiente de subir/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))

    expect(uploadMutateMock).not.toHaveBeenCalled()
    expect(screen.queryByText(/pendiente de subir/i)).not.toBeInTheDocument()
    // Vuelve a mostrar el archivo ya confirmado (no lo borra).
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/actual.png',
    )
    expect(onClearMock).not.toHaveBeenCalled()
  })

  it('click en "Quitar" sobre un archivo ya confirmado llama a onClear', async () => {
    const user = userEvent.setup()
    render(
      <MediaUploadField
        label="Foto de perfil"
        accept="image/*"
        tipo="imagen"
        currentMediaId="media-existente"
        currentPreviewUrl="https://cdn.example.com/actual.png"
        onUploaded={onUploadedMock}
        onClear={onClearMock}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^quitar$/i }))

    expect(onClearMock).toHaveBeenCalledTimes(1)
    expect(uploadMutateMock).not.toHaveBeenCalled()
  })

  it('al confirmar una subida no revoca el blob URL que pasa a mostrarse como "confirmado" (no hay revocación prematura)', async () => {
    const user = userEvent.setup()
    uploadMutateMock.mockImplementation((_vars, options) => {
      options?.onSuccess?.({ id: 'media-1', url: 'https://cdn.example.com/nuevo.png' })
    })

    const { container } = render(
      <MediaUploadField
        label="Foto de perfil"
        accept="image/*"
        tipo="imagen"
        onUploaded={onUploadedMock}
      />,
    )

    await user.upload(screen.getByLabelText(/foto de perfil/i), crearArchivo())
    const previewPendienteUrl = container.querySelector('img')?.getAttribute('src')
    expect(previewPendienteUrl).toMatch(/^blob:mock-/)

    await user.click(screen.getByRole('button', { name: /^subir$/i }))

    // El mismo blob URL pasa a ser el preview "confirmado" y debe seguir
    // vigente (no revocado) mientras se muestra en pantalla.
    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        previewPendienteUrl as string,
      ),
    )
    expect(revokeObjectURLSpy).not.toHaveBeenCalledWith(previewPendienteUrl)
  })

  it('al desmontar revoca el blob URL local vigente (pendiente o confirmado) para no filtrar memoria', async () => {
    const user = userEvent.setup()
    uploadMutateMock.mockImplementation((_vars, options) => {
      options?.onSuccess?.({ id: 'media-1', url: 'https://cdn.example.com/nuevo.png' })
    })

    const { container, unmount } = render(
      <MediaUploadField
        label="Foto de perfil"
        accept="image/*"
        tipo="imagen"
        onUploaded={onUploadedMock}
      />,
    )

    await user.upload(screen.getByLabelText(/foto de perfil/i), crearArchivo())
    await user.click(screen.getByRole('button', { name: /^subir$/i }))

    const previewConfirmadoUrl = await waitFor(() => {
      const src = container.querySelector('img')?.getAttribute('src')
      expect(src).toMatch(/^blob:mock-/)
      return src as string
    })

    expect(revokeObjectURLSpy).not.toHaveBeenCalledWith(previewConfirmadoUrl)

    unmount()

    // Antes del fix, el cleanup con deps `[]` solo revocaba `null` (los
    // valores capturados en el primer render), así que este blob quedaba
    // sin revocar para siempre.
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(previewConfirmadoUrl)
  })

  it('Fase 7g: acepta un .heic con type vacío, lo convierte a JPEG y sube ese archivo', async () => {
    const user = userEvent.setup()
    render(
      <MediaUploadField
        label="Foto de perfil"
        accept={ACCEPT_IMAGENES}
        tipo="imagen"
        onUploaded={onUploadedMock}
      />,
    )
    const heic = new File(['cabecera'], 'IMG_0001.HEIC', { type: '' })
    await user.upload(screen.getByLabelText(/foto de perfil/i), heic)

    expect(await screen.findByText(/pendiente de subir/i)).toBeInTheDocument()
    expect(createObjectURLSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'IMG_0001.jpg', type: 'image/jpeg' }),
    )
    await user.click(screen.getByRole('button', { name: /^subir$/i }))
    expect(uploadMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ file: expect.objectContaining({ name: 'IMG_0001.jpg' }) }),
      expect.anything(),
    )
  })

  it('Fase 7g: rechaza un formato desconocido enumerando los admitidos', async () => {
    const user = userEvent.setup()
    render(<MediaUploadField label="Foto de perfil" onUploaded={onUploadedMock} />)
    await user.upload(
      screen.getByLabelText(/foto de perfil/i),
      new File(['PK'], 'datos.zip', { type: 'application/zip' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/JPG, PNG, WebP, AVIF, GIF, SVG, HEIC y PDF/)
    expect(screen.queryByText(/pendiente de subir/i)).not.toBeInTheDocument()
  })
})
