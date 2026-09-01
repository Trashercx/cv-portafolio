import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import type { Media } from '@/features/media/types'
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
const eliminarMutateMock = vi.fn()
const eliminarState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: (tipo?: string) => useMediaListMock(tipo),
  useActualizarMedia: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useEliminarMedia: () => ({
    mutate: eliminarMutateMock,
    isPending: eliminarState.isPending,
    error: eliminarState.error,
  }),
  useReemplazarMedia: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

function renderMediaLibraryPage() {
  return render(<MediaLibraryPage />)
}

describe('MediaLibraryPage (UC-09)', () => {
  beforeEach(() => {
    eliminarState.isPending = false
    eliminarState.error = null
    useMediaListMock.mockImplementation((tipo?: string) => ({
      data: tipo ? [IMAGEN].filter((m) => m.tipo === tipo) : [IMAGEN, PDF],
      isLoading: false,
      error: null,
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('lista todos los archivos y vuelve a pedirlos filtrados por tipo al cambiar el select', async () => {
    const user = userEvent.setup()
    renderMediaLibraryPage()

    expect(screen.getByText('Foto de perfil')).toBeInTheDocument()
    expect(screen.getByText('(sin texto alternativo)')).toBeInTheDocument()
    expect(useMediaListMock).toHaveBeenCalledWith(undefined)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Imágenes' }))

    await waitFor(() =>
      expect(useMediaListMock).toHaveBeenCalledWith('imagen'),
    )
  })

  it('muestra el mensaje de error 409 sin quitar el archivo de la lista', async () => {
    // Simula que un intento de borrado anterior ya respondió 409: el
    // criterio de UC-09 es que ese mensaje se muestre tal cual y el
    // archivo NO desaparezca de la galería (a diferencia de un borrado
    // exitoso, que sí invalidaría la lista).
    const user = userEvent.setup()
    eliminarState.error = new ApiError(
      'No se puede eliminar: este archivo está en uso (proyecto, certificación o perfil). Reemplázalo en vez de borrarlo.',
      409,
      '/admin/media/media-imagen-1',
    )

    renderMediaLibraryPage()

    await user.click(screen.getByText('Foto de perfil'))

    expect(
      await screen.findByText(/no se puede eliminar: este archivo está en uso/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Foto de perfil')).toBeInTheDocument()
  })
})
