import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Proyecto } from '@/features/proyectos/types'
import { DetalleProyectoContenido } from './DetalleProyectoContenido'

const PROYECTO: Proyecto = {
  id: 'proyecto-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Portafolio personal',
  descripcion: 'Descripción de prueba.',
  url_demo: 'https://demo.example.com',
  url_repositorio: 'https://github.com/example/repo',
  fecha_inicio: '2024-01-01',
  fecha_fin: null,
  estado: 'en_progreso',
  destacado: true,
  orden: 0,
  tecnologias: [
    {
      proyecto_id: 'proyecto-1',
      tecnologia_id: 'tec-1',
      tecnologia: { id: 'tec-1', nombre: 'React' },
    },
  ],
  imagenes: [],
}

describe('DetalleProyectoContenido (Fase 4.3)', () => {
  it('renderiza título, descripción, tecnologías y los links de demo/repositorio', () => {
    render(<DetalleProyectoContenido proyecto={PROYECTO} />)

    expect(screen.getByRole('heading', { name: 'Portafolio personal', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Descripción de prueba.')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver demo/i })).toHaveAttribute(
      'href',
      'https://demo.example.com',
    )
    expect(screen.getByRole('link', { name: /ver repositorio/i })).toHaveAttribute(
      'href',
      'https://github.com/example/repo',
    )
  })
})
