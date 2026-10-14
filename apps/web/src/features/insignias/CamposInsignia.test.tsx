import { describe, expect, it } from 'vitest'
import { construirPayloadInsignia } from './CamposInsignia'
import { INSIGNIA_VALORES_VACIOS, insigniaSchema, type InsigniaFormValues } from './schemas'

/** Fase 7e, UC-35: casilla "No expira" → `null` en PATCH, omitido en POST, fecha obligatoria si se desmarca. */

const BASE: InsigniaFormValues = {
  ...INSIGNIA_VALORES_VACIOS,
  nombre: 'Insignia',
  emisor: 'Emisor',
  fecha_emision: '2025-01-01',
  imagen_media_id: 'media-1',
}

describe('construirPayloadInsignia (Fase 7e)', () => {
  it('"No expira" omite la fecha al crear', () => {
    const payload = construirPayloadInsignia({ ...BASE, no_expira: true, fecha_expiracion: '' })
    expect('fecha_expiracion' in payload && payload.fecha_expiracion !== undefined).toBe(false)
  })

  it('"No expira" envía null al editar (PATCH)', () => {
    const payload = construirPayloadInsignia(
      { ...BASE, no_expira: true, fecha_expiracion: '' },
      {},
      { edicion: true },
    )
    expect(payload.fecha_expiracion).toBeNull()
    expect(JSON.parse(JSON.stringify(payload))).toHaveProperty('fecha_expiracion', null)
  })

  it('desmarcada envía la fecha', () => {
    const payload = construirPayloadInsignia(
      { ...BASE, no_expira: false, fecha_expiracion: '2027-01-01' },
      {},
      { edicion: true },
    )
    expect(payload.fecha_expiracion).toBe('2027-01-01')
  })
})

describe('insigniaSchema (Fase 7e)', () => {
  it('desmarcada exige la fecha de expiración', () => {
    const resultado = insigniaSchema.safeParse({ ...BASE, no_expira: false, fecha_expiracion: '' })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0].message).toBe('La fecha de expiración es obligatoria.')
  })

  it('desmarcada exige que sea posterior a la emisión', () => {
    const resultado = insigniaSchema.safeParse({ ...BASE, no_expira: false, fecha_expiracion: '2024-01-01' })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0].message).toBe('La expiración debe ser posterior a la emisión.')
  })

  it('marcada ignora la fecha de expiración', () => {
    expect(insigniaSchema.safeParse({ ...BASE, no_expira: true, fecha_expiracion: '' }).success).toBe(true)
  })
})
