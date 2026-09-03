import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Logro } from '@/features/logros/types'
import { BloqueLogros } from './BloqueLogros'

/**
 * Fase 3.4 (personalización visual por bloque): `estilo_lista` alterna entre
 * el layout de tarjetas que ya existía (default) y una variante de línea de
 * tiempo (`border-l-2` + marcador circular por ítem).
 */

const LOGRO: Logro = {
  id: 'logro-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Certificación AWS',
  descripcion: 'Obtuve la certificación',
  fecha: '2025-01-01',
  categoria: 'certificacion',
  url_referencia: null,
  orden: 0,
}

describe('BloqueLogros (Fase 3.4)', () => {
  it('estilo_lista="tarjetas" (o sin definir) usa tarjetas con borde por ítem', () => {
    const { container } = render(
      <BloqueLogros titulo="Logros" config={{}} logros={[LOGRO]} />,
    )

    expect(screen.getByText('Certificación AWS')).toBeInTheDocument()
    const lista = container.querySelector('ul')
    expect(lista).not.toHaveClass('border-l-2')
    expect(container.querySelector('li')).toHaveClass('border')
  })

  it('estilo_lista="linea_tiempo" usa la línea vertical con marcador por ítem', () => {
    const { container } = render(
      <BloqueLogros
        titulo="Logros"
        config={{ estilo_lista: 'linea_tiempo' }}
        logros={[LOGRO]}
      />,
    )

    expect(screen.getByText('Certificación AWS')).toBeInTheDocument()
    const lista = container.querySelector('ul')
    expect(lista).toHaveClass('border-l-2')
  })
})
