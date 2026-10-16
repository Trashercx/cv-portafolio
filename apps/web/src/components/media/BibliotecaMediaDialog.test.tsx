import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Media } from '@/features/media/types'
import { useMediaList } from '@/features/media/useMediaLibrary'
import { subirMedia } from '@/features/media/useUploadMedia'
import { CampoImagenPuck } from '@/features/editor/CampoImagenPuck'
import { BibliotecaMediaDialog } from './BibliotecaMediaDialog'

/** Fase 7k (UC-09/UC-18): biblioteca con miniaturas para el editor visual y los formularios. */

function media(id: string, s3_key: string, alt: string | null = null): Media {
  return {
    id,
    url: `https://cdn.test/${s3_key}`,
    s3_key,
    tipo: 'imagen',
    ancho: 800,
    alto: 600,
    alt_text: alt,
    created_at: '2026-01-01T00:00:00.000Z',
  } as Media
}

const PLAYA = media('m1', 'galeria/abc123def456/Playa-al-atardecer.jpg', 'Playa')
const LEGADO = media('m2', 'perfil/3f2504e0-4f89-41d3-9a0c-0305e82c3301.png', 'Foto de perfil')
const SIN_ALT = media('m3', 'galeria/abc123def457/Montana.png')

vi.mock('@/features/media/useMediaLibrary', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('@/features/media/useMediaLibrary')>()),
  useMediaList: vi.fn(),
}))
vi.mock('@/features/media/useCarpetasMedia', () => ({
  useCarpetasMedia: () => ({ data: [{ id: 'c1', nombre: 'Eventos', orden: 0, total: 1 }] }),
}))
vi.mock('@/features/media/useUploadMedia', () => ({ subirMedia: vi.fn() }))

function conCliente(nodo: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{nodo}</QueryClientProvider>
}

describe('BibliotecaMediaDialog (Fase 7k)', () => {
  beforeEach(() => {
    vi.mocked(useMediaList).mockReset()
    vi.mocked(useMediaList).mockReturnValue({ data: [PLAYA, LEGADO, SIN_ALT], isLoading: false } as never)
    vi.mocked(subirMedia).mockReset()
  })

  it('muestra miniaturas con el nombre legible y resalta la elegida', () => {
    render(
      conCliente(
        <BibliotecaMediaDialog open onOpenChange={() => {}} onSeleccionar={() => {}} seleccionadoId="m1" />,
      ),
    )
    expect(screen.getByText('Playa-al-atardecer.jpg')).toBeInTheDocument()
    // Clave antigua con uuid: se ve el texto alternativo, no el uuid.
    expect(screen.getByText('Foto de perfil')).toBeInTheDocument()
    expect(screen.getByText('Montana.png')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Playa/, pressed: true })).toBeInTheDocument()
    expect(document.body.querySelectorAll('ul img')).toHaveLength(3)
  })

  it('elegir una miniatura la devuelve y cierra el diálogo', () => {
    const onSeleccionar = vi.fn()
    const onOpenChange = vi.fn()
    render(
      conCliente(<BibliotecaMediaDialog open onOpenChange={onOpenChange} onSeleccionar={onSeleccionar} />),
    )
    fireEvent.click(screen.getByTitle('Montana.png'))
    expect(onSeleccionar).toHaveBeenCalledWith(SIN_ALT)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('la búsqueda llega al API con debounce', async () => {
    vi.useFakeTimers()
    render(conCliente(<BibliotecaMediaDialog open onOpenChange={() => {}} onSeleccionar={() => {}} />))
    expect(useMediaList).toHaveBeenLastCalledWith('imagen')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar en la biblioteca' }), {
      target: { value: 'playa' },
    })
    await act(async () => {
      vi.advanceTimersByTime(350)
    })
    expect(useMediaList).toHaveBeenLastCalledWith({ tipo: 'imagen', q: 'playa' })
    vi.useRealTimers()
  })

  it('subir una imagen desde el diálogo la deja elegida', async () => {
    const nueva = media('m9', 'biblioteca/aaa/Nueva.png')
    vi.mocked(subirMedia).mockResolvedValue(nueva)
    const onSeleccionar = vi.fn()
    const { container } = render(
      conCliente(<BibliotecaMediaDialog open onOpenChange={() => {}} onSeleccionar={onSeleccionar} />),
    )
    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement
    expect(container).toBeDefined()
    fireEvent.change(input, { target: { files: [new File(['x'], 'Nueva.png', { type: 'image/png' })] } })
    await waitFor(() => expect(onSeleccionar).toHaveBeenCalledWith(nueva))
    expect(subirMedia).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'imagen' }))
  })

  it('si el diálogo se cierra con la subida en vuelo, la imagen no se elige', async () => {
    let terminar: (m: Media) => void = () => {}
    vi.mocked(subirMedia).mockImplementation(() => new Promise((resolver) => (terminar = resolver)))
    const onSeleccionar = vi.fn()
    const { rerender } = render(
      conCliente(<BibliotecaMediaDialog open onOpenChange={() => {}} onSeleccionar={onSeleccionar} />),
    )
    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'Lenta.png', { type: 'image/png' })] } })
    await waitFor(() => expect(subirMedia).toHaveBeenCalled())

    rerender(conCliente(<BibliotecaMediaDialog open={false} onOpenChange={() => {}} onSeleccionar={onSeleccionar} />))
    await act(async () => {
      terminar(media('m10', 'biblioteca/bbb/Lenta.png'))
    })
    expect(onSeleccionar).not.toHaveBeenCalled()
  })

  it('un error de subida se muestra bajo los controles', async () => {
    vi.mocked(subirMedia).mockRejectedValue(new Error('red'))
    render(conCliente(<BibliotecaMediaDialog open onOpenChange={() => {}} onSeleccionar={() => {}} />))
    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'Mala.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo subir la imagen.')
  })

  it('sin permitirSubir no ofrece subir', () => {
    render(
      conCliente(
        <BibliotecaMediaDialog open onOpenChange={() => {}} onSeleccionar={() => {}} permitirSubir={false} />,
      ),
    )
    expect(screen.queryByRole('button', { name: 'Subir imagen' })).not.toBeInTheDocument()
  })
})

describe('CampoImagenPuck (Fase 7k)', () => {
  beforeEach(() => {
    vi.mocked(useMediaList).mockReturnValue({ data: [PLAYA, SIN_ALT], isLoading: false } as never)
  })

  it('sin imagen ofrece elegir; con imagen muestra miniatura, nombre y cambiar', () => {
    const { rerender } = render(conCliente(<CampoImagenPuck value={undefined} onChange={() => {}} />))
    expect(screen.getByText('Sin imagen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elegir imagen' })).toBeInTheDocument()

    rerender(conCliente(<CampoImagenPuck value="m1" onChange={() => {}} />))
    expect(screen.getByText('Playa-al-atardecer.jpg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar imagen: Playa-al-atardecer.jpg' })).toBeInTheDocument()
    // Obligatoria (galería): no se puede quitar.
    expect(screen.queryByRole('button', { name: 'Quitar imagen' })).not.toBeInTheDocument()
  })

  it('opcional permite quitar; elegir en el diálogo llama a onChange con el id', () => {
    const onChange = vi.fn()
    render(conCliente(<CampoImagenPuck value="m1" opcional onChange={onChange} />))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }))
    expect(onChange).toHaveBeenLastCalledWith(undefined)

    fireEvent.click(screen.getByRole('button', { name: /Cambiar imagen/ }))
    fireEvent.click(screen.getByTitle('Montana.png'))
    expect(onChange).toHaveBeenLastCalledWith('m3')
  })
})
