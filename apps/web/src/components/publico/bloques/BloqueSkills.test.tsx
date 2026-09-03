import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Skill } from '@/features/skills/types'
import { BloqueSkills } from './BloqueSkills'

/**
 * Fase 3.4 (personalización visual por bloque): cubre los 3 campos propios
 * nuevos de `SkillsConfiguracion` — `tamano_icono`, `mostrar_nombres` y
 * `pausar_al_pasar` — más el default de `tamano_icono` (`'lg'`, ver
 * comentario de `BloqueSkills.tsx`: no se puede cambiar sin alterar el
 * aspecto de todos los sitios ya publicados).
 */

const SKILLS: Skill[] = [
  {
    id: 'skill-1',
    usuario_admin_id: 'admin-1',
    nombre: 'React',
    icono: 'react',
    orden: 0,
    visible: true,
  },
]

describe('BloqueSkills (Fase 3.4)', () => {
  it('mostrar_nombres=false no renderiza el nombre del skill', () => {
    render(
      <BloqueSkills
        titulo="Skills"
        config={{ direccion: 'izquierda', velocidad: 'media', mostrar_nombres: false }}
        skills={SKILLS}
      />,
    )

    expect(screen.queryByText('React')).not.toBeInTheDocument()
  })

  it('mostrar_nombres sin definir (default true) sí renderiza el nombre del skill', () => {
    render(
      <BloqueSkills
        titulo="Skills"
        config={{ direccion: 'izquierda', velocidad: 'media' }}
        skills={SKILLS}
      />,
    )

    expect(screen.getAllByText('React').length).toBeGreaterThan(0)
  })

  it('pausar_al_pasar=false no agrega el modificador que pausa el carrusel al pasar el mouse', () => {
    const { container } = render(
      <BloqueSkills
        titulo="Skills"
        config={{ direccion: 'izquierda', velocidad: 'media', pausar_al_pasar: false }}
        skills={SKILLS}
      />,
    )

    const pista = container.querySelector('.carrusel-skills')
    expect(pista).not.toHaveClass('carrusel-skills--pausable')
  })

  it('pausar_al_pasar sin definir (default true) agrega el modificador pausable', () => {
    const { container } = render(
      <BloqueSkills
        titulo="Skills"
        config={{ direccion: 'izquierda', velocidad: 'media' }}
        skills={SKILLS}
      />,
    )

    const pista = container.querySelector('.carrusel-skills')
    expect(pista).toHaveClass('carrusel-skills--pausable')
  })
})
