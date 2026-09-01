import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SnapshotSitio } from '@/features/publico/types'
import type { VersionSitio } from '@/features/publicacion/types'
import { PublicacionPage } from './PublicacionPage'

const SNAPSHOT_VACIO: SnapshotSitio = {
  perfil: null,
  tema: null,
  secciones: [
    {
      id: 'seccion-hero',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'hero',
      titulo_visible: 'Portada',
      orden: 0,
      visible: true,
      configuracion: { titulo: 'Hola', subtitulo: 'Mundo' },
    },
    {
      id: 'seccion-contacto',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'contacto',
      titulo_visible: 'Contacto oculto',
      orden: 1,
      visible: false,
      configuracion: { mostrar_formulario: false },
    },
  ],
  proyectos: [],
  certificaciones: [],
  logros: [],
  redes_sociales: [],
}

const VERSION_PREVIEW: VersionSitio = {
  id: 'preview-1',
  usuario_admin_id: 'admin-1',
  estado: 'borrador',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: null,
}

const VERSION_ACTUAL: VersionSitio = {
  id: 'v3',
  usuario_admin_id: 'admin-1',
  estado: 'publicado',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: '2026-02-01T00:00:00.000Z',
}

const VERSION_ANTERIOR: VersionSitio = {
  id: 'v2',
  usuario_admin_id: 'admin-1',
  estado: 'publicado',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: '2026-01-01T00:00:00.000Z',
}

const VERSION_BORRADOR: VersionSitio = {
  id: 'v1',
  usuario_admin_id: 'admin-1',
  estado: 'borrador',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: null,
}

/**
 * Publicada más vieja que `VERSION_ANTERIOR`: en el historial
 * V0 < V2 < V3(actual), NO debe ofrecer "Deshacer última publicación" — solo
 * V2 (la inmediatamente anterior a la actual) puede.
 */
const VERSION_MAS_ANTIGUA_PUBLICADA: VersionSitio = {
  id: 'v0',
  usuario_admin_id: 'admin-1',
  estado: 'publicado',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: '2025-12-01T00:00:00.000Z',
}

const previewMutateMock = vi.fn()
const publicarMutateMock = vi.fn()
const revertirMutateMock = vi.fn()

const estadoMocks: {
  versiones: VersionSitio[]
  previewPending: boolean
  previewError: unknown
  publicarPending: boolean
  publicarError: unknown
  revertirPending: boolean
  revertirError: unknown
} = {
  versiones: [VERSION_ACTUAL, VERSION_ANTERIOR, VERSION_BORRADOR],
  previewPending: false,
  previewError: null,
  publicarPending: false,
  publicarError: null,
  revertirPending: false,
  revertirError: null,
}

vi.mock('@/features/publicacion/usePublicacion', () => ({
  useVersiones: () => ({
    data: estadoMocks.versiones,
    isLoading: false,
    error: null,
  }),
  usePreviewVersion: () => ({
    mutate: previewMutateMock,
    isPending: estadoMocks.previewPending,
    error: estadoMocks.previewError,
  }),
  usePublicarVersion: () => ({
    mutate: publicarMutateMock,
    isPending: estadoMocks.publicarPending,
    error: estadoMocks.publicarError,
    isSuccess: false,
  }),
  useRevertirVersion: () => ({
    mutate: revertirMutateMock,
    isPending: estadoMocks.revertirPending,
    error: estadoMocks.revertirError,
    isSuccess: false,
  }),
}))

describe('PublicacionPage (UC-10, UC-11)', () => {
  beforeEach(() => {
    estadoMocks.versiones = [VERSION_ACTUAL, VERSION_ANTERIOR, VERSION_BORRADOR]
    estadoMocks.previewPending = false
    estadoMocks.previewError = null
    estadoMocks.publicarPending = false
    estadoMocks.publicarError = null
    estadoMocks.revertirPending = false
    estadoMocks.revertirError = null
    previewMutateMock.mockImplementation((_vars, options) => {
      options?.onSuccess?.(VERSION_PREVIEW)
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('"Previsualizar cambios" pide el snapshot y lo pinta con las secciones ocultas atenuadas (no ocultas)', async () => {
    const user = userEvent.setup()
    render(<PublicacionPage />)

    await user.click(
      screen.getByRole('button', { name: /previsualizar cambios/i }),
    )

    expect(previewMutateMock).toHaveBeenCalled()
    // La sección visible se pinta normal, y la oculta se muestra igual pero
    // marcada como "no se publicará" (soloVisibles=false en la preview).
    expect(screen.getByText('Hola')).toBeInTheDocument()
    expect(screen.getByText('Contacto oculto')).toBeInTheDocument()
    expect(screen.getByText('Oculta · no se publicará')).toBeInTheDocument()
  })

  it('"Publicar" pide confirmación antes de llamar a la mutación', async () => {
    const user = userEvent.setup()
    render(<PublicacionPage />)

    await user.click(screen.getByRole('button', { name: /^publicar$/i }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(
      within(dialogo).getByText(/publicar los cambios actuales/i),
    ).toBeInTheDocument()

    expect(publicarMutateMock).not.toHaveBeenCalled()

    await user.click(within(dialogo).getByRole('button', { name: /^publicar$/i }))

    expect(publicarMutateMock).toHaveBeenCalledTimes(1)
  })

  it('muestra "Deshacer última publicación" solo en la publicada inmediatamente anterior a la actual, y confirma antes de revertir', async () => {
    const user = userEvent.setup()
    render(<PublicacionPage />)

    const botonesRevertir = screen.getAllByRole('button', {
      name: /deshacer última publicación/i,
    })
    // Solo la versión "anterior" (v2) puede revertirse: la actual (v3) no
    // tiene "antes de sí misma", y el borrador (v1) no es una publicación.
    expect(botonesRevertir).toHaveLength(1)

    await user.click(botonesRevertir[0])

    const dialogo = await screen.findByRole('alertdialog')
    await user.click(within(dialogo).getByRole('button', { name: /^deshacer$/i }))

    // El backend restaura la publicada INMEDIATAMENTE ANTERIOR al id que
    // recibe, así que para recuperar el contenido de v2 (la fila del botón)
    // hay que llamar a la mutación con el id de la actual (v3), no con 'v2'.
    expect(revertirMutateMock).toHaveBeenCalledWith(
      'v3',
      expect.objectContaining({ onSettled: expect.any(Function) }),
    )
  })

  it('con 3+ versiones publicadas, "Deshacer última publicación" solo aparece en la inmediatamente anterior a la actual, no en publicaciones más antiguas', () => {
    estadoMocks.versiones = [
      VERSION_ACTUAL,
      VERSION_ANTERIOR,
      VERSION_MAS_ANTIGUA_PUBLICADA,
      VERSION_BORRADOR,
    ]
    render(<PublicacionPage />)

    // Historial: v0 < v2 < v3(actual). Solo v2 (inmediatamente anterior a la
    // actual) puede ofrecer "deshacer última publicación" — v0, aunque
    // también publicada, es más vieja y revertir sobre su fila restauraría
    // v0 en vez de mostrar el resultado de "deshacer la última publicación".
    const botonesRevertir = screen.getAllByRole('button', {
      name: /deshacer última publicación/i,
    })
    expect(botonesRevertir).toHaveLength(1)
  })
})
