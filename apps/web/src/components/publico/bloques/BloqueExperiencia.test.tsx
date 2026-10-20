import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Experiencia } from '@/features/experiencias/types'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueExperiencia } from './BloqueExperiencia'

/** Fase 7l, UC-19: tres disposiciones, claves ausentes, puesto actual y sin datos. */

const BASE: Experiencia = {
  id: 'e1',
  usuario_admin_id: 'admin-1',
  empresa: 'Acme',
  cargo: 'Desarrollador Senior',
  descripcion: 'Lideré el equipo de plataforma.',
  fecha_inicio: '2022-01-10',
  fecha_fin: '2024-03-20',
  ubicacion: 'Lima, Perú',
  modalidad: 'remoto',
  url_empresa: 'https://acme.example.com',
  logo_media_id: 'm1',
  logo: {
    id: 'm1',
    url: 'https://cdn.example.com/acme.png',
    s3_key: 'acme.png',
    tipo: 'imagen',
    ancho: 100,
    alto: 100,
    alt_text: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  tecnologias: [
    { id: 't1', nombre: 'React' },
    { id: 't2', nombre: 'NestJS' },
  ],
  orden: 0,
  visible: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const ACTUAL: Experiencia = {
  ...BASE,
  id: 'e2',
  cargo: 'Tech Lead',
  empresa: 'Globex',
  fecha_inicio: '2025-09-01',
  fecha_fin: null,
  url_empresa: null,
  logo: null,
  logo_media_id: null,
  tecnologias: [],
}

function pintar(config = {}, experiencias = [BASE, ACTUAL], modo: 'publico' | 'editor' = 'publico') {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo={modo}>
        <BloqueExperiencia titulo="Experiencia" config={config} experiencias={experiencias} />
      </ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('BloqueExperiencia (Fase 7l, UC-19)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('sin configuración usa la línea de tiempo con todo visible', () => {
    const { container } = pintar()
    expect(container.querySelector('[data-disposicion-experiencia="linea_tiempo"]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Experiencia' })).toBeInTheDocument()
    expect(screen.getByText('Desarrollador Senior')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo de Acme' })).toBeInTheDocument()
    expect(screen.getAllByText(/Remoto · Lima, Perú/)).toHaveLength(2)
    // Año a la izquierda (solo desde md) por cada puesto.
    expect(screen.getAllByText(/^20\d\d$/)).toHaveLength(2)
  })

  it('pone primero el puesto actual y calcula la duración', () => {
    pintar()
    const cargos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(cargos).toEqual(['Tech Lead', 'Desarrollador Senior'])
    expect(screen.getByText(/Actual · 1 año 2 meses/)).toBeInTheDocument()
    expect(screen.getByText(/2 años 3 meses/)).toBeInTheDocument()
  })

  it('tarjetas: una tarjeta por puesto con efecto de hover', () => {
    const { container } = pintar({ disposicion: 'tarjetas', efecto_hover: 'ninguno' })
    expect(container.querySelector('[data-disposicion-experiencia="tarjetas"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-efecto-hover="ninguno"]')).toHaveLength(2)
  })

  it('compacta: una línea por puesto sin logos, descripción ni chips', () => {
    const { container } = pintar({ disposicion: 'compacta' })
    expect(container.querySelector('[data-disposicion-experiencia="compacta"]')).not.toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText('React')).toBeNull()
    expect(screen.queryByText('Lideré el equipo de plataforma.')).toBeNull()
    expect(screen.getByText('Desarrollador Senior')).toBeInTheDocument()
  })

  it('los mostrar_* en false ocultan duración, tecnologías, logos y ubicación', () => {
    pintar({
      mostrar_duracion: false,
      mostrar_tecnologias: false,
      mostrar_logos: false,
      mostrar_ubicacion: false,
    })
    expect(screen.queryByText(/años? \d+ meses?|\d+ meses/)).toBeNull()
    expect(screen.queryByText('React')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText(/Lima/)).toBeNull()
  })

  it('limite recorta la lista y subtitulo/titulo propios mandan', () => {
    pintar({ limite: 1, titulo: 'Trayectoria', subtitulo: 'Lo que he hecho' })
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Trayectoria' })).toBeInTheDocument()
    expect(screen.getByText('Lo que he hecho')).toBeInTheDocument()
  })

  it('enlaza la empresa solo con una URL segura', () => {
    pintar({}, [BASE, { ...ACTUAL, url_empresa: 'javascript:alert(1)' }])
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', 'https://acme.example.com')
    expect(screen.queryByRole('link', { name: 'Globex' })).toBeNull()
  })

  it('sin experiencias: el sitio no pinta nada y el editor muestra "Sin experiencias"', () => {
    const publico = pintar({}, [])
    expect(publico.container).toBeEmptyDOMElement()
    publico.unmount()

    pintar({}, [], 'editor')
    expect(screen.getByText('Sin experiencias')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Experiencia' })).toBeInTheDocument()
  })
})
