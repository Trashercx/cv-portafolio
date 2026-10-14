import { describe, expect, it } from 'vitest'
import {
  CATALOGO_FONDOS,
  CONFIGURACION_FONDO_DEFAULT,
  TIPOS_FONDO,
  normalizarTipoFondo,
} from './catalogo-fondos'

describe('catálogo de fondos (Fase 7b, UC-15)', () => {
  it('tiene 9 entradas con tipo único y descripción de una línea', () => {
    expect(CATALOGO_FONDOS).toHaveLength(9)
    expect(new Set(CATALOGO_FONDOS.map((e) => e.tipo)).size).toBe(9)
    expect(CATALOGO_FONDOS.map((e) => e.tipo)).toEqual([...TIPOS_FONDO])
    for (const entrada of CATALOGO_FONDOS) {
      expect(entrada.nombre.length).toBeGreaterThan(0)
      expect(entrada.descripcion).not.toContain('\n')
    }
  })

  it('marca como no interactivos solo sólido y degradado con grano', () => {
    expect(
      CATALOGO_FONDOS.filter((e) => !e.interactivo).map((e) => e.tipo),
    ).toEqual(['solido', 'degradado_grano'])
  })

  it('los valores por defecto coinciden con el contrato', () => {
    expect(CONFIGURACION_FONDO_DEFAULT).toEqual({
      velocidad: 'media',
      opacidad: 0.5,
      intensidad: 'media',
      interactivo: true,
    })
  })
})

describe('normalizarTipoFondo', () => {
  it.each([
    ['degradado_animado', 'degradado_grano'],
    ['aurora_animada', 'aurora_mesh'],
    ['particulas', 'particulas_red'],
    ['cuadricula_animada', 'malla_puntos'],
    ['ondas', 'ondas_fluidas'],
    ['malla_difusa', 'aurora_mesh'],
    ['lineas_diagonales', 'haces_luz'],
  ])('mapea el tipo antiguo %s a %s', (antiguo, nuevo) => {
    expect(normalizarTipoFondo(antiguo)).toBe(nuevo)
  })

  it('deja intactos los 9 tipos vigentes', () => {
    for (const tipo of TIPOS_FONDO) expect(normalizarTipoFondo(tipo)).toBe(tipo)
  })

  it('un tipo desconocido cae a sólido', () => {
    expect(normalizarTipoFondo('inventado')).toBe('solido')
    expect(normalizarTipoFondo('')).toBe('solido')
  })
})
