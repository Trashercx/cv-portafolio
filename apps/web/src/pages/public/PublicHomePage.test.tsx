import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SnapshotSitio } from '@/features/publico/types'
import { ApiError } from '@/lib/api-client'
import { PublicHomePage } from './PublicHomePage'

const SNAPSHOT: SnapshotSitio = {
  perfil: {
    id: 'perfil-1',
    usuario_admin_id: 'admin-1',
    nombre_completo: 'Ada Lovelace',
    titulo_profesional: 'Ingeniera de software',
    resumen_bio: 'Bio de prueba.',
    imagen_perfil_id: null,
    cv_media_id: null,
    ubicacion: 'Remoto',
    updated_at: '2026-01-01T00:00:00.000Z',
    imagen_perfil: null,
    cv_media: null,
  },
  tema: {
    id: 'tema-1',
    usuario_admin_id: 'admin-1',
    nombre: 'Claro',
    color_primario: '#111111',
    color_secundario: '#222222',
    color_fondo: '#ffffff',
    color_texto: '#000000',
    fuente_principal: 'Inter',
    modo: 'claro',
    activo: true,
  },
  secciones: [
    {
      id: 'seccion-sobre-mi',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'sobre-mi',
      titulo_visible: 'Sobre mí',
      orden: 1,
      visible: true,
      configuracion: { mostrar_foto: false },
    },
    {
      id: 'seccion-hero',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'hero',
      titulo_visible: 'Portada',
      orden: 0,
      visible: true,
      configuracion: { titulo: 'Hola, soy Ada', subtitulo: 'Bienvenido' },
    },
    {
      id: 'seccion-contacto-oculta',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'contacto',
      titulo_visible: 'Contacto (oculto)',
      orden: 2,
      visible: false,
      configuracion: { mostrar_formulario: false },
    },
  ],
  proyectos: [],
  certificaciones: [],
  logros: [],
  redes_sociales: [],
}

const useSitioMock = vi.fn()

vi.mock('@/features/publico/usePublico', () => ({
  useSitio: () => useSitioMock(),
}))

function renderHome() {
  return render(
    <MemoryRouter>
      <PublicHomePage />
    </MemoryRouter>,
  )
}

describe('PublicHomePage (UC-12)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('pinta las secciones visibles en su orden y oculta las no visibles', () => {
    useSitioMock.mockReturnValue({
      data: SNAPSHOT,
      isLoading: false,
      error: null,
    })

    renderHome()

    expect(screen.getByText('Hola, soy Ada')).toBeInTheDocument()
    expect(screen.getByText('Sobre mí')).toBeInTheDocument()
    // La sección con `visible: false` no debe aparecer en absoluto.
    expect(screen.queryByText('Contacto (oculto)')).not.toBeInTheDocument()

    const posicionHero = screen.getByText('Hola, soy Ada').compareDocumentPosition(
      screen.getByText('Sobre mí'),
    )
    // `Node.DOCUMENT_POSITION_FOLLOWING` (4): "Sobre mí" (orden 1) debe venir
    // después del hero (orden 0) en el documento.
    expect(posicionHero & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('muestra un estado vacío razonable cuando el sitio nunca se publicó (404)', () => {
    useSitioMock.mockReturnValue({ data: null, isLoading: false, error: null })

    renderHome()

    expect(
      screen.getByText(/todavía no tiene una versión publicada/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Hola, soy Ada')).not.toBeInTheDocument()
  })

  it('muestra el mensaje de error si la carga falla por algo distinto de un 404', () => {
    useSitioMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError('Error de red', 500, '/sitio'),
    })

    renderHome()

    expect(screen.getByText('Error de red')).toBeInTheDocument()
  })
})
