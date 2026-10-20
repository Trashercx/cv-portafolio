import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Perfil } from '@/features/perfil/types'
import type { Certificacion } from '@/features/certificaciones/types'
import type { Experiencia } from '@/features/experiencias/types'
import type { Insignia } from '@/features/insignias/types'
import type { Media } from '@/features/media/types'
import { useDatosEditor } from './useDatosEditor'

/**
 * `useDatosEditor` (Fase 3.1) compone 9 hooks admin de TanStack Query. Se
 * mockea cada uno por separado (no vía `QueryClientProvider` + `apiFetch`
 * real) para poder variar `data`/`isLoading` por test sin red — mismo patrón
 * que `PerfilPage.test.tsx`. El foco de este archivo es la lógica de
 * resolución de media que vive DENTRO de `useDatosEditor` (los 3 huecos que
 * los endpoints admin no resuelven), no los hooks en sí.
 */

const MEDIA_PERFIL: Media = {
  id: 'media-perfil',
  url: 'https://cdn.example.com/perfil.jpg',
  s3_key: 'perfil.jpg',
  tipo: 'imagen',
  ancho: 400,
  alto: 400,
  alt_text: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

const MEDIA_CV: Media = {
  id: 'media-cv',
  url: 'https://cdn.example.com/cv.pdf',
  s3_key: 'cv.pdf',
  tipo: 'documento',
  ancho: null,
  alto: null,
  alt_text: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

const MEDIA_LOGO_PDF: Media = {
  id: 'media-logo-pdf',
  url: 'https://cdn.example.com/logo.pdf',
  s3_key: 'logo.pdf',
  tipo: 'documento',
  ancho: null,
  alto: null,
  alt_text: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

const PERFIL: Perfil = {
  id: 'perfil-1',
  usuario_admin_id: 'admin-1',
  nombre_completo: 'Oscar Burga',
  titulo_profesional: 'Desarrollador Full Stack',
  resumen_bio: 'Bio',
  imagen_perfil_id: 'media-perfil',
  cv_media_id: 'media-cv',
  ubicacion: 'Lima, Perú',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const CERTIFICACION_CON_LOGO: Certificacion = {
  id: 'cert-1',
  usuario_admin_id: 'admin-1',
  nombre: 'AWS Certified',
  institucion: 'AWS',
  fecha_emision: '2025-01-01',
  fecha_expiracion: null,
  url_verificacion: 'https://aws.amazon.com/verify',
  credencial_id: null,
  logo_media_id: 'media-logo-pdf',
  orden: 0,
}

const CERTIFICACION_LOGO_ROTO: Certificacion = {
  ...CERTIFICACION_CON_LOGO,
  id: 'cert-2',
  logo_media_id: 'media-inexistente',
}

/**
 * Mutable por test — cada `vi.mock` de abajo lee de este objeto en vez de
 * fixtures fijas para poder variar `data` por caso sin redefinir mocks.
 */
const estado = {
  perfil: null as Perfil | null | undefined,
  certificaciones: [] as Certificacion[],
  media: [] as Media[],
  insignias: [] as Insignia[],
  experiencias: [] as Experiencia[],
}

vi.mock('@/features/perfil/usePerfil', () => ({
  usePerfil: () => ({
    data: estado.perfil,
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/features/certificaciones/useCertificaciones', () => ({
  useCertificaciones: () => ({
    data: estado.certificaciones,
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: () => ({
    data: estado.media,
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/features/insignias/useInsignias', () => ({
  useInsignias: () => ({ data: estado.insignias, isLoading: false, error: null }),
}))

vi.mock('@/features/experiencias/useExperiencias', () => ({
  useExperiencias: () => ({ data: estado.experiencias, isLoading: false, error: null }),
}))

vi.mock('@/features/proyectos/useProyectos', () => ({
  useProyectos: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('@/features/logros/useLogros', () => ({
  useLogros: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('@/features/redes-sociales/useRedesSociales', () => ({
  useRedesSociales: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('@/features/skills/useSkills', () => ({
  useSkills: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('@/features/tema/useTemas', () => ({
  useTemas: () => ({ data: [], isLoading: false, error: null }),
}))

vi.mock('@/features/fondo-sitio/useFondosSitio', () => ({
  useFondosSitio: () => ({ data: [], isLoading: false, error: null }),
}))

describe('useDatosEditor', () => {
  afterEach(() => {
    estado.perfil = null
    estado.certificaciones = []
    estado.media = []
    estado.insignias = []
    estado.experiencias = []
  })

  it('resuelve imagen_perfil y cv_media cuando el id existe en la biblioteca de medios', () => {
    estado.perfil = PERFIL
    estado.media = [MEDIA_PERFIL, MEDIA_CV]

    const { result } = renderHook(() => useDatosEditor())

    expect(result.current.datos?.perfil?.imagen_perfil).toEqual(MEDIA_PERFIL)
    expect(result.current.datos?.perfil?.cv_media).toEqual(MEDIA_CV)
  })

  it('resuelve a null (no revienta) cuando imagen_perfil_id/cv_media_id apunta a un id que ya no está en la biblioteca', () => {
    estado.perfil = {
      ...PERFIL,
      imagen_perfil_id: 'media-borrada',
      cv_media_id: 'media-borrada-tambien',
    }
    estado.media = [MEDIA_PERFIL, MEDIA_CV]

    const { result } = renderHook(() => useDatosEditor())

    expect(result.current.datos?.perfil?.imagen_perfil).toBeNull()
    expect(result.current.datos?.perfil?.cv_media).toBeNull()
  })

  it('deja perfil en null sin intentar resolver media cuando el admin todavía no guardó ningún perfil', () => {
    estado.perfil = null
    estado.media = [MEDIA_PERFIL]

    const { result } = renderHook(() => useDatosEditor())

    expect(result.current.datos?.perfil).toBeNull()
  })

  it('resuelve certificacion.logo aunque la media sea un PDF (no solo imágenes)', () => {
    estado.perfil = PERFIL
    estado.certificaciones = [CERTIFICACION_CON_LOGO]
    estado.media = [MEDIA_PERFIL, MEDIA_CV, MEDIA_LOGO_PDF]

    const { result } = renderHook(() => useDatosEditor())

    const [certificacion] = result.current.datos?.certificaciones ?? []
    expect(certificacion.logo).toEqual(MEDIA_LOGO_PDF)
    expect(certificacion.logo?.tipo).toBe('documento')
  })

  it('resuelve certificacion.logo a null cuando logo_media_id no está en la biblioteca (registro roto)', () => {
    estado.perfil = PERFIL
    estado.certificaciones = [CERTIFICACION_LOGO_ROTO]
    estado.media = [MEDIA_PERFIL, MEDIA_CV]

    const { result } = renderHook(() => useDatosEditor())

    const [certificacion] = result.current.datos?.certificaciones ?? []
    expect(certificacion.logo).toBeNull()
  })

  it('Fase 7d: expone solo las insignias visibles con su imagen resuelta y omite las sin imagen', () => {
    const base = {
      usuario_admin_id: 'admin-1',
      emisor: 'Emisor',
      descripcion: null,
      proveedor: 'manual' as const,
      id_externo: null,
      url_verificacion: null,
      url_origen: null,
      fecha_emision: null,
      fecha_expiracion: null,
      habilidades: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }
    estado.perfil = PERFIL
    estado.media = [MEDIA_PERFIL]
    estado.insignias = [
      { ...base, id: 'i1', nombre: 'Visible', orden: 0, visible: true, imagen_media_id: 'media-perfil' },
      { ...base, id: 'i2', nombre: 'Oculta', orden: 1, visible: false, imagen_media_id: 'media-perfil' },
      { ...base, id: 'i3', nombre: 'Rota', orden: 2, visible: true, imagen_media_id: 'media-borrada' },
    ]

    const { result } = renderHook(() => useDatosEditor())

    expect(result.current.datos?.insignias?.map((i) => i.id)).toEqual(['i1'])
    expect(result.current.datos?.insignias?.[0].imagen).toEqual(MEDIA_PERFIL)
  })

  it('Fase 7l: expone solo las experiencias visibles y resuelve el logo contra la biblioteca', () => {
    const base = {
      usuario_admin_id: 'admin-1',
      empresa: 'Acme',
      cargo: 'Dev',
      descripcion: 'x',
      fecha_inicio: '2024-01-01',
      fecha_fin: null,
      ubicacion: null,
      modalidad: 'remoto' as const,
      url_empresa: null,
      tecnologias: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }
    estado.perfil = PERFIL
    estado.media = [MEDIA_PERFIL]
    estado.experiencias = [
      { ...base, id: 'e1', orden: 0, visible: true, logo_media_id: 'media-perfil', logo: null },
      { ...base, id: 'e2', orden: 1, visible: false, logo_media_id: null, logo: null },
      { ...base, id: 'e3', orden: 2, visible: true, logo_media_id: 'media-borrada', logo: null },
    ]

    const { result } = renderHook(() => useDatosEditor())

    expect(result.current.datos?.experiencias?.map((e) => e.id)).toEqual(['e1', 'e3'])
    expect(result.current.datos?.experiencias?.[0].logo).toEqual(MEDIA_PERFIL)
    // Logo roto: se omite en silencio, como en el snapshot.
    expect(result.current.datos?.experiencias?.[1].logo).toBeNull()
  })
})
