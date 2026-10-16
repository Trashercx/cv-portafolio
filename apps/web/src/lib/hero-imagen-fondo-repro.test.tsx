import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { puckConfig } from './puck-config'
import type { MetadataEditor } from '@/features/editor/useDatosEditor'
import type { CustomField } from '@puckeditor/core'
import type { Media } from '@/features/media/types'

const MEDIA_FONDO: Media = {
  id: 'media-fondo',
  url: 'https://cdn.example.com/fondo.jpg',
  s3_key: 'fondo.jpg',
  tipo: 'imagen',
  ancho: 1200,
  alto: 800,
  alt_text: 'Fondo de portada',
  created_at: '2026-01-01T00:00:00.000Z',
}

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: () => ({ data: [MEDIA_FONDO], isLoading: false }),
}))

const DATOS: MetadataEditor['datos'] = {
  perfil: null,
  tema: null,
  proyectos: [],
  certificaciones: [],
  logros: [],
  redes_sociales: [],
  skills: [],
  fondo: null,
  mediaPorId: { [MEDIA_FONDO.id]: MEDIA_FONDO },
}

/**
 * Repro dirigida (Fase 4.1, punto 5): monta `<Puck>` REAL end-to-end (drag
 * and drop incluido) en jsdom no es viable — `dnd-kit` (dependencia interna
 * de Puck) usa `DOMMatrixReadOnly`, que jsdom no implementa (confirmado:
 * intentar montar `<Puck>` completo con un solo bloque `hero` explota con
 * `ReferenceError: DOMMatrixReadOnly is not defined` dentro del propio
 * `dnd-kit`, antes de llegar a ejecutarse ningún código nuestro — mismo
 * motivo por el que `EditorSeccionesPage.test.tsx` stubea `Puck` por
 * completo, ver su comentario de cabecera).
 *
 * En cambio, se ejercitan directamente los dos fragmentos de código que
 * intervienen en "asignar una imagen de fondo" sin pasar por el runtime de
 * Puck: (1) el campo custom del sidebar (`puckConfig.components.hero.fields
 * .imagen_fondo_media_id`, que monta el selector real con `useMediaList`) y
 * (2) el `render` del bloque `hero` con `imagen_fondo_media_id` ya resuelto
 * contra `datos.mediaPorId` (lo que produce elegir una opción del selector).
 */
describe('hero: asignar imagen de fondo desde el editor (UC-07/UC-09)', () => {
  it('el campo "Imagen de fondo" del sidebar lista la biblioteca de medios y permite elegir una imagen sin crashear', async () => {
    const field = puckConfig.components.hero.fields
      ?.imagen_fondo_media_id as CustomField<string | undefined>

    function Wrapper() {
      const [value, setValue] = useState<string | undefined>(undefined)
      return field.render({
        field,
        name: 'imagen_fondo_media_id',
        id: 'imagen_fondo_media_id',
        value,
        onChange: setValue,
      })
    }

    render(
      <QueryClientProvider client={new QueryClient()}>
        <Wrapper />
      </QueryClientProvider>,
    )

    // Fase 7k: miniatura + diálogo de la biblioteca en vez de un <select>.
    fireEvent.click(screen.getByRole('button', { name: 'Elegir imagen' }))
    const miniatura = await screen.findByAltText(MEDIA_FONDO.alt_text!)
    fireEvent.click(miniatura.closest('button')!)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Cambiar imagen: fondo.jpg/ })).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Quitar imagen' })).toBeInTheDocument()
  })

  it('el render del bloque hero con una imagen de fondo ya seleccionada no crashea, y aplica el background-image resuelto', () => {
    const heroComponent = puckConfig.components.hero

    const props = {
      id: 'hero-1',
      titulo: 'Hola',
      subtitulo: 'Mundo',
      imagen_fondo_media_id: MEDIA_FONDO.id,
      texto_boton: undefined,
      enlace_boton: undefined,
      mostrar_foto_perfil: false,
      posicion_foto: 'ninguna' as const,
      estilo_foto: 'con_marco' as const,
      altura: 'normal' as const,
      overlay_fondo: 'ninguno' as const,
      tamano_titulo: 'normal' as const,
      espaciado_vertical: 'normal' as const,
      ancho_contenido: 'completo' as const,
      alineacion_texto: 'centro' as const,
      fondo_bloque: 'ninguno' as const,
      separador_inferior: true,
      _visible: true,
      _tituloVisible: 'Portada',
      _seccionId: 'seccion-1',
      // Subconjunto mínimo de `PuckContext` que consume `leerMetadata`
      // (ver su comentario): solo lee `puck.metadata`.
      puck: { metadata: { datos: DATOS } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const { container } = render(heroComponent.render(props))

    expect(screen.getByText('Hola')).toBeInTheDocument()
    const fondo = container.querySelector('[style*="background-image"]')
    expect(fondo).not.toBeNull()
    expect(fondo?.getAttribute('style')).toContain(MEDIA_FONDO.url)
  })
})
