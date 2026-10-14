import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    await user.upload(screen.getByLabelText(/Archivo PNG o SVG/), archivo)

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
})
