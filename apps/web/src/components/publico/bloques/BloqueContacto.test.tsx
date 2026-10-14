import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RedSocial } from '@/features/redes-sociales/types'
import { BloqueContacto } from './BloqueContacto'
import { CLASES_BORDE_BLOQUE } from '@/lib/escalas-bloque'

/**
 * Fase 3.4 (personalización visual por bloque): `estilo_redes` cambia cómo
 * se renderizan las redes sociales dentro de `BloqueContacto` (delegado a
 * `RedesSociales`) — `'iconos'` (default) mantiene la píldora con borde que
 * ya existía, `'botones'` usa un fondo sólido (`--color-primario`) sin
 * borde.
 */

const REDES: RedSocial[] = [
  {
    id: 'red-1',
    usuario_admin_id: 'admin-1',
    plataforma_id: 'plat-1',
    url: 'https://github.com/octocat',
    orden: 0,
    plataforma: { id: 'plat-1', nombre: 'GitHub', icono_defecto: 'github' },
  },
]

describe('BloqueContacto (Fase 3.4)', () => {
  it('estilo_redes="iconos" (o sin definir) renderiza el enlace con borde, sin color de fondo inline', () => {
    render(
      <BloqueContacto
        titulo="Contacto"
        config={{ mostrar_formulario: false }}
        perfil={null}
        redesSociales={REDES}
      />,
    )

    const enlace = screen.getByRole('link', { name: /github/i })
    expect(enlace).toHaveClass(CLASES_BORDE_BLOQUE)
    expect(enlace.style.backgroundColor).toBe('')
  })

  it('estilo_redes="botones" renderiza el enlace con fondo sólido y sin borde', () => {
    render(
      <BloqueContacto
        titulo="Contacto"
        config={{ mostrar_formulario: false, estilo_redes: 'botones' }}
        perfil={null}
        redesSociales={REDES}
      />,
    )

    const enlace = screen.getByRole('link', { name: /github/i })
    expect(enlace).not.toHaveClass(CLASES_BORDE_BLOQUE)
    expect(enlace.style.backgroundColor).toBe('var(--color-primario)')
  })
})
