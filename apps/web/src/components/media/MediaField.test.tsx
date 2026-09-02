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

const useMediaListMock = vi.fn()

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: (tipo?: string) => useMediaListMock(tipo),
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
})
