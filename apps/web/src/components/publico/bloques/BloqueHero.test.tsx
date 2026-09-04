import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { PerfilPublico } from '@/features/publico/types'
import type { HeroConfiguracion } from '@/features/secciones/types'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueHero } from './BloqueHero'

/**
 * Regresión: el fallback defensivo de `width`/`height`/`position` inline
 * para la condición de carrera del iframe de Puck (`AutoFrame couldn't load
 * a stylesheet`) debe aplicar SOLO en modo `'editor'`. En modo `'publico'`
 * un `style` inline con ese shorthand pisaría las clases Tailwind
 * (`size-24`/`size-16 sm:size-20`) que controlan el tamaño real/responsive
 * de la foto del hero en producción.
 */

const PERFIL: PerfilPublico = {
  id: 'perfil-1',
  usuario_admin_id: 'admin-1',
  nombre_completo: 'Ada Lovelace',
  titulo_profesional: 'Ingeniera',
  resumen_bio: 'Bio',
  imagen_perfil_id: 'media-1',
  cv_media_id: null,
  ubicacion: 'Remoto',
  updated_at: '2026-01-01T00:00:00.000Z',
  imagen_perfil: {
    id: 'media-1',
    url: 'https://cdn.example.com/foto.jpg',
    s3_key: 'perfil/foto.jpg',
    tipo: 'imagen',
    ancho: null,
    alto: null,
    alt_text: 'Foto de Ada',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  cv_media: null,
}

const CONFIG_CENTRADA: HeroConfiguracion = {
  titulo: 'Hola',
  subtitulo: 'Subtítulo',
  mostrar_foto_perfil: true,
  posicion_foto: 'centrada',
  estilo_foto: 'con_marco',
}

function renderConModo(modo: 'publico' | 'editor') {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo={modo}>
        <BloqueHero config={CONFIG_CENTRADA} perfil={PERFIL} />
      </ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('BloqueHero — fallback defensivo de estilo inline de la foto (Puck)', () => {
  it('en modo "publico" no fuerza width/height/position inline (deja el tamaño a las clases Tailwind)', () => {
    renderConModo('publico')

    const foto = screen.getByAltText('Foto de Ada')
    expect(foto.style.width).toBe('')
    expect(foto.style.height).toBe('')
    expect(foto.style.position).toBe('')
    expect(foto).toHaveClass('size-24')
  })

  it('sin ProveedorModoRenderizado (default "publico") tampoco fuerza width/height inline', () => {
    render(
      <MemoryRouter>
        <BloqueHero config={CONFIG_CENTRADA} perfil={PERFIL} />
      </MemoryRouter>,
    )

    const foto = screen.getByAltText('Foto de Ada')
    expect(foto.style.width).toBe('')
    expect(foto.style.height).toBe('')
  })

  it('en modo "editor" sí aplica el fallback con width/height fijos (96px para posición centrada)', () => {
    renderConModo('editor')

    const foto = screen.getByAltText('Foto de Ada')
    expect(foto.style.width).toBe('96px')
    expect(foto.style.height).toBe('96px')
  })
})
