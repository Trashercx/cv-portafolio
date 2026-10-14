import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCEPT_INSIGNIAS } from '@/features/media/formatos-imagen'
import { ImportarInsigniaDialog } from './ImportarInsigniaDialog'
import type { VistaPreviaInsignia } from './types'

/** Fase 7d, UC-35: importar (enlace/archivo) → vista previa editable → guardar; alta manual. */

const importarMutate = vi.fn()
const archivoMutate = vi.fn()
const crearMutate = vi.fn()

vi.mock('./useInsignias', () => ({
  useImportarInsignia: () => ({ mutate: importarMutate, isPending: false, error: null, reset: vi.fn() }),
  useImportarArchivoInsignia: () => ({ mutate: archivoMutate, isPending: false, error: null, reset: vi.fn() }),
  useCrearInsignia: () => ({ mutate: crearMutate, isPending: false, error: null, reset: vi.fn() }),
}))

// Fase 7e: proveedores reconocidos, subida del PDF original y conversión PDF → PNG.
const subirMutate = vi.fn()
let carpetasMock: { id: string; nombre: string }[] = []
const pdfAImagenPngMock = vi.fn()

vi.mock('./useProveedoresInsignia', () => ({
  useProveedoresInsignia: () => ({
    data: [
      { clave: 'credly', nombre: 'Credly', modo: 'automatico', ayuda: 'Pega el enlace de la insignia.' },
      { clave: 'datacamp', nombre: 'DataCamp', modo: 'archivo', ayuda: 'Sube el PDF del certificado.' },
    ],
  }),
}))

vi.mock('@/features/media/useUploadMedia', () => ({
  useUploadMedia: () => ({ mutateAsync: subirMutate, reset: vi.fn(), isPending: false, error: null }),
}))

vi.mock('@/features/media/useCarpetasMedia', () => ({
  useCarpetasMedia: () => ({ data: carpetasMock }),
}))

vi.mock('./pdf-a-imagen', () => ({
  pdfAImagenPng: (...args: unknown[]) => pdfAImagenPngMock(...args),
}))

// `MediaField` real arrastra la biblioteca de medios: un doble mínimo basta.
vi.mock('@/components/media/MediaField', () => ({
  MediaField: ({ onUploaded }: { onUploaded: (media: { id: string; url: string }) => void }) => (
    <button
      type="button"
      onClick={() => onUploaded({ id: 'media-manual', url: 'https://cdn.example.com/manual.png' })}
    >
      Elegir imagen
    </button>
  ),
}))

const VISTA_CREDLY: VistaPreviaInsignia = {
  proveedor: 'credly',
  nombre: 'AWS Cloud Practitioner',
  emisor: 'Amazon Web Services',
  descripcion: 'Conocimientos básicos de AWS',
  fecha_emision: '2025-03-10',
  fecha_expiracion: '2028-03-10',
  habilidades: ['AWS', 'Cloud'],
  url_verificacion: 'https://www.credly.com/badges/abc',
  id_externo: 'abc',
  url_origen: 'https://www.credly.com/badges/abc',
  imagen: { url: 'https://images.credly.com/abc/image.png', ancho: 680, alto: 680, formato: 'png' },
  avisos: ['Datos obtenidos del perfil público de Credly.'],
}

function renderDialog(onOpenChange = vi.fn()) {
  render(<ImportarInsigniaDialog open onOpenChange={onOpenChange} />)
  return { onOpenChange, user: userEvent.setup() }
}

describe('ImportarInsigniaDialog (Fase 7d, UC-35)', () => {
  beforeEach(() => {
    importarMutate.mockReset()
    archivoMutate.mockReset()
    crearMutate.mockReset()
    subirMutate.mockReset()
    carpetasMock = []
    pdfAImagenPngMock.mockReset()
  })

  it('muestra las tres pestañas y "Analizar" deshabilitado sin entrada', () => {
    renderDialog()

    expect(screen.getByRole('tab', { name: 'Enlace o código' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Subir archivo' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Manual' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analizar' })).toBeDisabled()
  })

  it('analizar → vista previa editable con avisos → guardar envía imagen_url_remota', async () => {
    importarMutate.mockImplementation((_entrada: string, opciones: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      opciones.onSuccess(VISTA_CREDLY),
    )
    const { user } = renderDialog()

    await user.type(
      screen.getByLabelText(/Enlace, código de embed/),
      'https://www.credly.com/badges/abc',
    )
    await user.click(screen.getByRole('button', { name: 'Analizar' }))

    expect(importarMutate).toHaveBeenCalledWith('https://www.credly.com/badges/abc', expect.any(Object))
    expect(await screen.findByDisplayValue('AWS Cloud Practitioner')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Amazon Web Services')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Avisos de la importación' })).toHaveTextContent(
      'Datos obtenidos del perfil público de Credly.',
    )
    expect(screen.getByRole('img', { name: 'Vista previa de la insignia' })).toHaveAttribute(
      'src',
      VISTA_CREDLY.imagen!.url,
    )
    expect(screen.getByText('Cloud')).toBeInTheDocument()

    // Edita el nombre y quita una habilidad antes de guardar.
    const nombre = screen.getByDisplayValue('AWS Cloud Practitioner')
    await user.clear(nombre)
    await user.type(nombre, 'AWS CCP')
    await user.click(screen.getByRole('button', { name: 'Quitar Cloud' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crearMutate).toHaveBeenCalledTimes(1))
    const [payload] = crearMutate.mock.calls[0]
    expect(payload).toMatchObject({
      nombre: 'AWS CCP',
      emisor: 'Amazon Web Services',
      proveedor: 'credly',
      id_externo: 'abc',
      url_origen: 'https://www.credly.com/badges/abc',
      url_verificacion: 'https://www.credly.com/badges/abc',
      fecha_emision: '2025-03-10',
      fecha_expiracion: '2028-03-10',
      habilidades: ['AWS'],
      imagen_url_remota: 'https://images.credly.com/abc/image.png',
    })
    expect(payload.imagen_media_id).toBeUndefined()
  })

  it('Fase 7e: muestra "Proveedores reconocidos" con la ayuda en el tooltip', async () => {
    const { user } = renderDialog()

    const seccion = screen.getByRole('region', { name: 'Proveedores reconocidos' })
    expect(within(seccion).getByText('Credly')).toBeInTheDocument()
    await user.hover(within(seccion).getByText('DataCamp'))
    expect((await screen.findAllByText('Sube el PDF del certificado.')).length).toBeGreaterThan(0)
  })

  it('Fase 7e: sin expiración detectada la casilla "No expira" llega marcada y no se envía fecha', async () => {
    importarMutate.mockImplementation((_e: string, o: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      o.onSuccess({ ...VISTA_CREDLY, fecha_expiracion: null }),
    )
    const { user } = renderDialog()
    await user.type(screen.getByLabelText(/Enlace, código de embed/), 'x')
    await user.click(screen.getByRole('button', { name: 'Analizar' }))

    expect(await screen.findByRole('checkbox', { name: /no expira/i })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crearMutate).toHaveBeenCalledTimes(1))
    expect(crearMutate.mock.calls[0][0].fecha_expiracion).toBeUndefined()
  })

  it('Fase 7e: con expiración detectada la casilla queda desmarcada; al desmarcar sin fecha la exige', async () => {
    importarMutate.mockImplementation((_e: string, o: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      o.onSuccess(VISTA_CREDLY),
    )
    const { user } = renderDialog()
    await user.type(screen.getByLabelText(/Enlace, código de embed/), 'x')
    await user.click(screen.getByRole('button', { name: 'Analizar' }))

    const casilla = await screen.findByRole('checkbox', { name: /no expira/i })
    expect(casilla).not.toBeChecked()
    await user.clear(screen.getByLabelText('Fecha de expiración'))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('La fecha de expiración es obligatoria.')).toBeInTheDocument()
    expect(crearMutate).not.toHaveBeenCalled()
  })

  it('Fase 7e: DataCamp (modo archivo) pasa a "Subir archivo" conservando los datos y los avisos', async () => {
    const vistaDataCamp: VistaPreviaInsignia = {
      proveedor: 'datacamp',
      modo_proveedor: 'archivo',
      nombre: '',
      emisor: 'DataCamp',
      descripcion: null,
      fecha_emision: null,
      fecha_expiracion: null,
      habilidades: [],
      url_verificacion: 'https://www.datacamp.com/statement-of-accomplishment/course/abc123',
      id_externo: 'abc123',
      url_origen: null,
      imagen: null,
      avisos: ['DataCamp no permite la lectura automática: sube el PDF o la imagen.'],
    }
    importarMutate.mockImplementation((_e: string, o: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      o.onSuccess(vistaDataCamp),
    )
    archivoMutate.mockImplementation((_f: File, o: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      o.onSuccess({
        ...VISTA_CREDLY,
        proveedor: 'generico',
        nombre: 'Intro a Python',
        emisor: '',
        url_verificacion: null,
        id_externo: null,
        imagen_media_id: 'media-dc',
        avisos: [],
      }),
    )
    const { user } = renderDialog()
    await user.type(screen.getByLabelText(/Enlace, código de embed/), vistaDataCamp.url_verificacion!)
    await user.click(screen.getByRole('button', { name: 'Analizar' }))

    expect(await screen.findByLabelText(/Archivo PNG, JPG/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Subir archivo' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByDisplayValue('DataCamp')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Avisos de la importación' })).toHaveTextContent(
      'DataCamp no permite la lectura automática',
    )

    await user.upload(
      screen.getByLabelText(/Archivo PNG, JPG/),
      new File(['png'], 'cert.png', { type: 'image/png' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crearMutate).toHaveBeenCalledTimes(1))
    expect(crearMutate.mock.calls[0][0]).toMatchObject({
      proveedor: 'datacamp',
      emisor: 'DataCamp',
      id_externo: 'abc123',
      url_verificacion: vistaDataCamp.url_verificacion,
      nombre: 'Intro a Python',
      imagen_media_id: 'media-dc',
    })
  })

  it('Fase 7e: un PDF se convierte a PNG, se envía a importar-archivo y el original va a la biblioteca', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    pdfAImagenPngMock.mockResolvedValue({ blob: new Blob(['png'], { type: 'image/png' }), ancho: 1600, alto: 1130 })
    archivoMutate.mockImplementation((_f: File, o: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      o.onSuccess({ ...VISTA_CREDLY, nombre: '', url_origen: null, imagen_media_id: 'media-pdf', avisos: [] }),
    )
    subirMutate.mockResolvedValue({ url: 'https://cdn.example.com/certificado.pdf' })
    carpetasMock = [{ id: 'c-cert', nombre: 'CERTIFICADOS' }]
    const { user } = renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Subir archivo' }))
    const pdf = new File(['%PDF'], 'Mi Certificado.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText(/Archivo PNG, JPG/), pdf)

    expect(pdfAImagenPngMock).toHaveBeenCalledWith(pdf)
    await waitFor(() => expect(archivoMutate).toHaveBeenCalledTimes(1))
    const enviado = archivoMutate.mock.calls[0][0] as File
    expect(enviado.name).toBe('Mi Certificado.png')
    expect(enviado.type).toBe('image/png')
    // El PDF no se sube al elegirlo, solo al confirmar.
    expect(subirMutate).not.toHaveBeenCalled()

    // Nombre sugerido: el del archivo sin extensión.
    expect(await screen.findByDisplayValue('Mi Certificado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crearMutate).toHaveBeenCalledTimes(1))
    expect(subirMutate).toHaveBeenCalledTimes(1)
    expect(subirMutate.mock.calls[0][0]).toEqual({ file: pdf, carpeta_id: 'c-cert' })
    expect(crearMutate.mock.calls[0][0]).toMatchObject({
      imagen_media_id: 'media-pdf',
      url_origen: 'https://cdn.example.com/certificado.pdf',
    })
  })

  it('Fase 7e: si falla la subida del PDF original muestra el error y no crea la insignia', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
    pdfAImagenPngMock.mockResolvedValue({ blob: new Blob(['png'], { type: 'image/png' }), ancho: 1600, alto: 1130 })
    archivoMutate.mockImplementation((_f: File, o: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      o.onSuccess({ ...VISTA_CREDLY, nombre: '', url_origen: null, imagen_media_id: 'media-pdf', avisos: [] }),
    )
    subirMutate.mockRejectedValue(new Error('fallo'))
    const { user } = renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Subir archivo' }))
    await user.upload(
      screen.getByLabelText(/Archivo PNG, JPG/),
      new File(['%PDF'], 'Mi Certificado.pdf', { type: 'application/pdf' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el PDF original')
    expect(crearMutate).not.toHaveBeenCalled()
  })

  it('Fase 7e: muestra "Convirtiendo…" mientras se renderiza el PDF y avisa si falla', async () => {
    let rechazar: (error: Error) => void = () => {}
    pdfAImagenPngMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rechazar = reject
      }),
    )
    const { user } = renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Subir archivo' }))
    await user.upload(
      screen.getByLabelText(/Archivo PNG, JPG/),
      new File(['%PDF'], 'roto.pdf', { type: 'application/pdf' }),
    )
    expect(await screen.findByText('Convirtiendo…')).toBeInTheDocument()

    rechazar(new Error('pdf inválido'))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo convertir el PDF')
    expect(archivoMutate).not.toHaveBeenCalled()
  })

  it('agrega habilidades con Enter', async () => {
    importarMutate.mockImplementation((_e: string, o: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      o.onSuccess(VISTA_CREDLY),
    )
    const { user } = renderDialog()
    await user.type(screen.getByLabelText(/Enlace, código de embed/), 'x')
    await user.click(screen.getByRole('button', { name: 'Analizar' }))

    await user.type(await screen.findByLabelText('Nueva habilidad'), 'Serverless{Enter}')

    expect(screen.getByText('Serverless')).toBeInTheDocument()
  })

  it('subir archivo → vista previa → guardar envía imagen_media_id (sin imagen_url_remota)', async () => {
    archivoMutate.mockImplementation((_file: File, opciones: { onSuccess: (v: VistaPreviaInsignia) => void }) =>
      opciones.onSuccess({
        ...VISTA_CREDLY,
        proveedor: 'open_badges',
        imagen_media_id: 'media-archivo',
        avisos: [],
      }),
    )
    const { user } = renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Subir archivo' }))
    const archivo = new File(['png'], 'insignia.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/Archivo PNG, JPG/), archivo)

    expect(archivoMutate).toHaveBeenCalledWith(archivo, expect.any(Object))
    expect(await screen.findByDisplayValue('AWS Cloud Practitioner')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crearMutate).toHaveBeenCalledTimes(1))
    const [payload] = crearMutate.mock.calls[0]
    expect(payload.imagen_media_id).toBe('media-archivo')
    expect(payload.imagen_url_remota).toBeUndefined()
    expect(payload.proveedor).toBe('open_badges')
  })

  it('manual: formulario con MediaField, proveedor "manual" y la imagen elegida', async () => {
    const { user } = renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Manual' }))
    await user.click(screen.getByRole('button', { name: 'Elegir imagen' }))
    await user.type(screen.getByLabelText('Nombre'), 'Mi insignia')
    await user.type(screen.getByLabelText('Emisor'), 'Mi escuela')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(crearMutate).toHaveBeenCalledTimes(1))
    const [payload] = crearMutate.mock.calls[0]
    expect(payload).toMatchObject({
      nombre: 'Mi insignia',
      emisor: 'Mi escuela',
      proveedor: 'manual',
      imagen_media_id: 'media-manual',
    })
  })

  it('manual: nombre, emisor e imagen son obligatorios', async () => {
    const { user } = renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Manual' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El emisor es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La imagen es obligatoria.')).toBeInTheDocument()
    expect(crearMutate).not.toHaveBeenCalled()
  })

  it('rechaza una URL de verificación inválida', async () => {
    const { user } = renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Manual' }))
    await user.click(screen.getByRole('button', { name: 'Elegir imagen' }))
    await user.type(screen.getByLabelText('Nombre'), 'A')
    await user.type(screen.getByLabelText('Emisor'), 'B')
    await user.type(screen.getByLabelText('URL de verificación'), 'no-es-url')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('URL inválida')).toBeInTheDocument()
    expect(crearMutate).not.toHaveBeenCalled()
  })

  it('Fase 7g: el input de "Subir archivo" usa ACCEPT_INSIGNIAS (incluye HEIC)', async () => {
    const { user } = renderDialog()
    await user.click(screen.getByRole('tab', { name: 'Subir archivo' }))
    expect(screen.getByLabelText(/Archivo PNG, JPG/)).toHaveAttribute('accept', ACCEPT_INSIGNIAS)
    expect(ACCEPT_INSIGNIAS).toContain('.heic')
  })
})
