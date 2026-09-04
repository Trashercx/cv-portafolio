import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Logro } from '@/features/logros/types'
import { DetalleLogroContenido } from './DetalleLogroContenido'

const LOGRO: Logro = {
  id: 'logro-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Certificación AWS',
  descripcion: 'Obtuve la certificación tras un examen de varias horas.',
  fecha: '2025-01-01',
  categoria: 'certificacion',
  url_referencia: 'https://credly.com/badges/ejemplo',
  orden: 0,
}

describe('DetalleLogroContenido (Fase 4.3)', () => {
  it('renderiza título, categoría, descripción completa y el link de referencia', () => {
    render(<DetalleLogroContenido logro={LOGRO} />)

    expect(
      screen.getByRole('heading', { name: 'Certificación AWS', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('certificacion')).toBeInTheDocument()
    expect(
      screen.getByText('Obtuve la certificación tras un examen de varias horas.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver referencia/i })).toHaveAttribute(
      'href',
      'https://credly.com/badges/ejemplo',
    )
  })

  it('no renderiza el link de referencia cuando no existe', () => {
    render(<DetalleLogroContenido logro={{ ...LOGRO, url_referencia: null }} />)

    expect(screen.queryByRole('link', { name: /ver referencia/i })).not.toBeInTheDocument()
  })
})
