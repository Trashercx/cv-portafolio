import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PerfilPublico } from '@/features/publico/types'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueSobreMi } from './BloqueSobreMi'

/**
 * Fase 7 (7.3, UC-12): `estadisticas` (hasta 4 tarjetas con contador) y
 * `estilo_foto` del bloque `sobre-mi`.
 */

const PERFIL: PerfilPublico = {
  id: 'perfil-1',
  usuario_admin_id: 'admin-1',
  nombre_completo: 'Ada Lovelace',
  titulo_profesional: 'Ingeniera',
  resumen_bio: 'Mi biografía',
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

// En modo editor los contadores no animan: se ve el valor final.
function renderSobreMi(config: Parameters<typeof BloqueSobreMi>[0]['config']) {
  return render(
    <ProveedorModoRenderizado modo="editor">
      <BloqueSobreMi titulo="Sobre mí" config={config} perfil={PERFIL} />
    </ProveedorModoRenderizado>,
  )
}

describe('BloqueSobreMi — estadísticas (Fase 7)', () => {
  it('sin estadísticas no pinta la lista', () => {
    const { container } = renderSobreMi({ mostrar_foto: false })
    expect(container.querySelector('[data-estadisticas]')).not.toBeInTheDocument()
  })

  it('pinta una tarjeta por estadística con valor y etiqueta', () => {
    const { container } = renderSobreMi({
      mostrar_foto: false,
      estadisticas: [
        { etiqueta: 'Años de experiencia', valor: '5+' },
        { etiqueta: 'Proyectos', valor: '40' },
      ],
    })
    expect(container.querySelectorAll('[data-estadisticas="true"] > li')).toHaveLength(2)
    expect(screen.getByText('Años de experiencia')).toBeInTheDocument()
    expect(screen.getByText('5+', { selector: '.sr-only' })).toBeInTheDocument()
    expect(screen.getByText('Proyectos')).toBeInTheDocument()
  })

  it('muestra como máximo 4 estadísticas', () => {
    const { container } = renderSobreMi({
      mostrar_foto: false,
      estadisticas: Array.from({ length: 6 }, (_, i) => ({ etiqueta: `E${i}`, valor: `${i}` })),
    })
    expect(container.querySelectorAll('[data-estadisticas="true"] > li')).toHaveLength(4)
  })

  it('la fila es una cuadrícula de 2 columnas en móvil y 4 desde sm', () => {
    const { container } = renderSobreMi({
      mostrar_foto: false,
      estadisticas: [{ etiqueta: 'A', valor: '1' }],
    })
    expect(container.querySelector('[data-estadisticas="true"]')).toHaveClass(
      'grid-cols-2',
      'sm:grid-cols-4',
    )
  })
})

describe('BloqueSobreMi — estilo_foto (Fase 7)', () => {
  it.each([
    ['simple', []],
    ['marco_degradado', ['p-1', 'bg-linear-to-br', 'from-[var(--color-primario)]', 'to-[var(--color-secundario)]']],
    ['flotante', ['shadow-2xl', 'foto-flotante']],
  ] as const)('%s aplica sus clases a la envoltura de la foto', (estilo, clases) => {
    const { container } = renderSobreMi({
      mostrar_foto: true,
      estilo_foto: estilo,
    })
    const envoltura = container.querySelector(`[data-estilo-foto="${estilo}"]`) as HTMLElement
    expect(envoltura).toBeInTheDocument()
    for (const clase of clases) expect(envoltura).toHaveClass(clase)
    expect(screen.getByAltText('Foto de Ada')).toBeInTheDocument()
  })

  it('sin estilo_foto usa "simple"', () => {
    const { container } = renderSobreMi({ mostrar_foto: true })
    expect(container.querySelector('[data-estilo-foto="simple"]')).toBeInTheDocument()
  })
})
