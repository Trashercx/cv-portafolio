import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Experiencia } from '@/features/experiencias/types'
import { puckConfig } from './puck-config'

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: () => ({ data: [], isLoading: false }),
}))

/** Fase 7l, UC-19: el bloque `experiencia` de Puck refleja el contrato del API. */

type Bloque = {
  defaultProps: Record<string, unknown>
  fields: Record<string, { type: string; label?: string; options?: { value: unknown }[]; max?: number; min?: number }>
  resolveFields?: (
    data: { props: Record<string, unknown> },
    params: { fields: Record<string, unknown> },
  ) => Record<string, unknown>
  render: (props: Record<string, unknown>) => ReactElement
}
const bloque = (puckConfig.components as unknown as Record<string, Bloque>).experiencia

function camposVisibles(props: Record<string, unknown>): string[] {
  return Object.keys(bloque.resolveFields!({ props }, { fields: bloque.fields }))
}

describe('puckConfig — bloque experiencia (Fase 7l, UC-19)', () => {
  it('está registrado en la categoría "Contenido" y se puede anidar en columnas', () => {
    expect(bloque).toBeDefined()
    expect(puckConfig.categories?.contenido?.components).toContain('experiencia')
    for (const nombre of ['columna_1', 'columna_2', 'columna_3']) {
      const campo = (puckConfig.components as unknown as Record<string, Bloque>).columnas.fields[
        nombre
      ] as unknown as { allow: string[] }
      expect(campo.allow).toContain('experiencia')
    }
  })

  it('los defaultProps son los defaults del API y nada más', () => {
    expect(bloque.defaultProps).toMatchObject({
      disposicion: 'linea_tiempo',
      mostrar_duracion: true,
      mostrar_tecnologias: true,
      mostrar_logos: true,
      mostrar_ubicacion: true,
      efecto_hover: 'elevar',
      _tituloVisible: 'Experiencia',
    })
    // `titulo`, `subtitulo` y `limite` son opcionales sin default persistido.
    for (const clave of ['titulo', 'subtitulo', 'limite']) {
      expect(bloque.defaultProps).not.toHaveProperty(clave)
    }
  })

  it('ofrece las tres disposiciones y el efecto con los valores del contrato, en español', () => {
    expect(bloque.fields.disposicion.options?.map((o) => o.value)).toEqual([
      'linea_tiempo',
      'tarjetas',
      'compacta',
    ])
    expect(bloque.fields.efecto_hover.options?.map((o) => o.value)).toEqual([
      'elevar',
      'inclinar',
      'ninguno',
    ])
    expect(bloque.fields.limite).toMatchObject({ type: 'number', min: 1, max: 50 })
    expect(bloque.fields.mostrar_logos.label).toBe('Mostrar logos de las empresas')
  })

  it('resolveFields oculta mostrar_logos en la disposición compacta', () => {
    expect(camposVisibles({ disposicion: 'compacta' })).not.toContain('mostrar_logos')
    for (const props of [{}, { disposicion: 'linea_tiempo' }, { disposicion: 'tarjetas' }]) {
      expect(camposVisibles(props)).toContain('mostrar_logos')
    }
  })

  it('el efecto al pasar el cursor solo aparece en tarjetas', () => {
    expect(camposVisibles({ disposicion: 'tarjetas' })).toContain('efecto_hover')
    expect(camposVisibles({ disposicion: 'linea_tiempo' })).not.toContain('efecto_hover')
    expect(camposVisibles({ disposicion: 'compacta' })).not.toContain('efecto_hover')
  })

  it('render: una metadata sin experiencias no revienta y fuera del lienzo no pinta nada', () => {
    const element = bloque.render({
      ...bloque.defaultProps,
      id: 'b1',
      puck: { metadata: { datos: { mediaPorId: {} } } },
    })
    render(
      <MemoryRouter>
        {element}
      </MemoryRouter>,
    )
    expect(screen.queryByText('Sin experiencias')).toBeNull()
  })

  it('render: pinta los puestos que vienen en datos.experiencias', () => {
    const experiencia: Experiencia = {
      id: 'e1',
      usuario_admin_id: 'admin-1',
      empresa: 'Acme',
      cargo: 'Desarrolladora',
      descripcion: 'x',
      fecha_inicio: '2022-01-01',
      fecha_fin: '2023-01-01',
      ubicacion: null,
      modalidad: 'remoto',
      url_empresa: null,
      logo_media_id: null,
      logo: null,
      tecnologias: [],
      orden: 0,
      visible: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }
    const element = bloque.render({
      ...bloque.defaultProps,
      id: 'b1',
      puck: { metadata: { datos: { mediaPorId: {}, experiencias: [experiencia] } } },
    })
    render(<MemoryRouter>{element}</MemoryRouter>)
    expect(screen.getByText('Desarrolladora')).toBeInTheDocument()
  })
})
