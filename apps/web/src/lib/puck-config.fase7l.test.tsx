import { describe, expect, it, vi } from 'vitest'
import { puckConfig } from './puck-config'

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: () => ({ data: [], isLoading: false }),
}))

/**
 * Fase 7l (UC-02, UC-04, UC-35): campos nuevos de proyectos, certificaciones
 * e insignias — opciones del contrato, orden contenido → disposición →
 * efectos → base, `resolveFields` y valores de partida solo al insertar.
 */

type Campo = { type: string; label?: string; options?: { value: unknown }[]; min?: number; max?: number }
type Bloque = {
  defaultProps: Record<string, unknown>
  fields: Record<string, Campo>
  resolveFields?: (
    data: { props: Record<string, unknown> },
    params: { fields: Record<string, unknown> },
  ) => Record<string, unknown>
  resolveData: (
    data: { props: Record<string, unknown> },
    params: { trigger: string },
  ) => { props: Record<string, unknown> }
}
const bloques = puckConfig.components as unknown as Record<string, Bloque>

function visibles(tipo: string, props: Record<string, unknown>): string[] {
  const bloque = bloques[tipo]
  return Object.keys(bloque.resolveFields!({ props }, { fields: bloque.fields }))
}

const valores = (campo: Campo) => campo.options?.map((o) => o.value)

describe('puckConfig — proyectos (Fase 7l, UC-02)', () => {
  it('suma la vitrina y los interruptores nuevos con labels en español', () => {
    const { fields } = bloques.proyectos
    expect(valores(fields.disposicion)).toEqual(['tarjetas', 'bento', 'lista', 'vitrina'])
    expect(fields.mostrar_estado.label).toBe('Mostrar estado (En curso, Finalizado...)')
    expect(fields.mostrar_enlaces.label).toBe('Mostrar botones Demo y Código')
    expect(fields.mostrar_github.label).toBe('Mostrar lenguaje y estrellas (GitHub)')
    expect(fields.mostrar_fechas.label).toBe('Mostrar fechas')
  })

  it('el contenido va antes que la disposición y los efectos al final, antes de los campos base', () => {
    const claves = Object.keys(bloques.proyectos.fields)
    expect(claves.indexOf('mostrar_fechas')).toBeLessThan(claves.indexOf('disposicion'))
    expect(claves.indexOf('disposicion')).toBeLessThan(claves.indexOf('efecto_hover'))
    expect(claves.indexOf('efecto_hover')).toBeLessThan(claves.indexOf('espaciado_vertical'))
  })

  it('columnas solo en tarjetas; la vitrina no las lleva', () => {
    expect(visibles('proyectos', { disposicion: 'tarjetas' })).toContain('columnas')
    expect(visibles('proyectos', {})).toContain('columnas')
    expect(visibles('proyectos', { disposicion: 'vitrina' })).not.toContain('columnas')
  })

  it('defaultProps no trae las claves nuevas; al insertar sí y al cargar no', () => {
    for (const clave of ['mostrar_estado', 'mostrar_enlaces', 'mostrar_github', 'mostrar_fechas']) {
      expect(bloques.proyectos.defaultProps).not.toHaveProperty(clave)
    }
    const insertado = bloques.proyectos.resolveData({ props: {} }, { trigger: 'insert' })
    expect(insertado.props).toMatchObject({
      mostrar_estado: true,
      mostrar_enlaces: true,
      mostrar_github: true,
      mostrar_fechas: false,
    })
    expect(bloques.proyectos.resolveData({ props: {} }, { trigger: 'load' }).props).toEqual({})
  })
})

describe('puckConfig — certificaciones (Fase 7l, UC-04)', () => {
  it('ofrece las tres disposiciones y los interruptores nuevos', () => {
    const { fields } = bloques.certificaciones
    expect(valores(fields.disposicion)).toEqual(['tarjetas', 'linea_tiempo', 'logos'])
    expect(fields.mostrar_emisor.label).toBe('Mostrar emisor')
    expect(fields.mostrar_vigencia.label).toBe('Mostrar vigencia (Vigente, Vencida...)')
    expect(fields.mostrar_enlace.label).toBe('Mostrar "Ver credencial"')
  })

  it('resolveFields oculta lo que no aplica a cada disposición', () => {
    const tarjetas = visibles('certificaciones', {})
    expect(tarjetas).toEqual(expect.arrayContaining(['columnas', 'estilo_tarjeta', 'mostrar_vigencia']))

    const linea = visibles('certificaciones', { disposicion: 'linea_tiempo' })
    expect(linea).not.toContain('columnas')
    expect(linea).toContain('estilo_tarjeta')

    const logos = visibles('certificaciones', { disposicion: 'logos' })
    for (const oculto of [
      'columnas',
      'estilo_tarjeta',
      'mostrar_fecha',
      'mostrar_emisor',
      'mostrar_vigencia',
      'mostrar_enlace',
    ]) {
      expect(logos).not.toContain(oculto)
    }
    expect(logos).toContain('efecto_hover')
  })

  it('valores de partida solo al insertar', () => {
    for (const clave of ['disposicion', 'mostrar_emisor', 'mostrar_vigencia', 'mostrar_enlace']) {
      expect(bloques.certificaciones.defaultProps).not.toHaveProperty(clave)
    }
    expect(bloques.certificaciones.resolveData({ props: {} }, { trigger: 'insert' }).props).toMatchObject({
      disposicion: 'tarjetas',
      mostrar_vigencia: true,
    })
  })
})

describe('puckConfig — insignias (Fase 7l, UC-35)', () => {
  it('ofrece disposición, velocidad de la cinta e intervalo con los límites del contrato', () => {
    const { fields } = bloques.insignias
    expect(valores(fields.disposicion)).toEqual(['rejilla', 'carrusel', 'cinta'])
    expect(valores(fields.velocidad_cinta)).toEqual(['lenta', 'normal', 'rapida'])
    expect(fields.intervalo_segundos).toMatchObject({ type: 'number', min: 2, max: 15 })
    expect(fields.reproduccion_automatica.label).toBe('Avanzar solo (carrusel)')
  })

  it('cada disposición muestra solo sus opciones', () => {
    const rejilla = visibles('insignias', {})
    expect(rejilla).toContain('columnas')
    for (const oculto of ['reproduccion_automatica', 'intervalo_segundos', 'velocidad_cinta']) {
      expect(rejilla).not.toContain(oculto)
    }

    const carrusel = visibles('insignias', { disposicion: 'carrusel' })
    expect(carrusel).toContain('reproduccion_automatica')
    expect(carrusel).not.toContain('intervalo_segundos')
    expect(carrusel).not.toContain('columnas')
    expect(carrusel).not.toContain('velocidad_cinta')
    expect(visibles('insignias', { disposicion: 'carrusel', reproduccion_automatica: true })).toContain(
      'intervalo_segundos',
    )

    const cinta = visibles('insignias', { disposicion: 'cinta' })
    expect(cinta).toContain('velocidad_cinta')
    expect(cinta).not.toContain('reproduccion_automatica')
    expect(cinta).not.toContain('columnas')
  })

  it('las opciones nuevas se combinan con las de medalla y tarjeta', () => {
    expect(visibles('insignias', { estilo: 'tarjeta', disposicion: 'cinta' })).toEqual(
      expect.arrayContaining(['velocidad_cinta', 'mostrar_emisor']),
    )
    expect(visibles('insignias', { estilo: 'tarjeta', disposicion: 'cinta' })).not.toContain('marco_medalla')
    expect(visibles('insignias', { disposicion: 'carrusel' })).toContain('marco_medalla')
  })

  it('defaultProps no trae las claves nuevas; al insertar sí', () => {
    for (const clave of ['disposicion', 'reproduccion_automatica', 'intervalo_segundos', 'velocidad_cinta']) {
      expect(bloques.insignias.defaultProps).not.toHaveProperty(clave)
    }
    expect(bloques.insignias.resolveData({ props: {} }, { trigger: 'insert' }).props).toMatchObject({
      disposicion: 'rejilla',
      reproduccion_automatica: false,
      intervalo_segundos: 5,
      velocidad_cinta: 'normal',
    })
    expect(bloques.insignias.resolveData({ props: {} }, { trigger: 'load' }).props).toEqual({})
  })
})
