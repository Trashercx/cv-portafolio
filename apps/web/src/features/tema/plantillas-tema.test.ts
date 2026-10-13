import { describe, expect, it } from 'vitest'
import { ratioContraste } from '@/lib/contraste'
import { obtenerFuente } from './fuentes'
import { PLANTILLAS_TEMA } from './plantillas-tema'
import { temaSchema } from './tema-schema'

describe('PLANTILLAS_TEMA (Fase 7, UC-08)', () => {
  it('ofrece 12 plantillas con ids y nombres únicos', () => {
    expect(PLANTILLAS_TEMA).toHaveLength(12)
    expect(new Set(PLANTILLAS_TEMA.map((p) => p.id)).size).toBe(12)
    expect(new Set(PLANTILLAS_TEMA.map((p) => p.nombre)).size).toBe(12)
  })

  it('conserva las 6 originales y suma Grafito, Lavanda, Menta, Ámbar, Carbón y Cielo', () => {
    const nombres = PLANTILLAS_TEMA.map((p) => p.nombre)
    for (const esperado of [
      'Océano',
      'Atardecer',
      'Bosque',
      'Arena',
      'Monocromo',
      'Medianoche',
      'Grafito',
      'Lavanda',
      'Menta',
      'Ámbar',
      'Carbón',
      'Cielo',
    ]) {
      expect(nombres).toContain(esperado)
    }
  })

  it.each(PLANTILLAS_TEMA.map((p) => [p.nombre, p] as const))(
    '%s: texto sobre fondo >= 7:1 (WCAG AAA)',
    (_nombre, plantilla) => {
      expect(
        ratioContraste(plantilla.color_texto, plantilla.color_fondo),
      ).toBeGreaterThanOrEqual(7)
    },
  )

  it.each(PLANTILLAS_TEMA.map((p) => [p.nombre, p] as const))(
    '%s: es válida para el esquema del formulario y usa una fuente del catálogo',
    (_nombre, plantilla) => {
      const { id: _id, ...valores } = plantilla
      expect(temaSchema.safeParse(valores).success).toBe(true)
      expect(obtenerFuente(plantilla.fuente_principal)).toBeDefined()
    },
  )

  it('el modo declarado coincide con la luminosidad del fondo', () => {
    for (const plantilla of PLANTILLAS_TEMA) {
      const fondoVsBlanco = ratioContraste(plantilla.color_fondo, '#ffffff')
      if (plantilla.modo === 'oscuro') expect(fondoVsBlanco).toBeGreaterThan(8)
      else expect(fondoVsBlanco).toBeLessThan(1.3)
    }
  })
})
