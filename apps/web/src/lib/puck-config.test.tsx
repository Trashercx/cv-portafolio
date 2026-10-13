import { describe, expect, it } from 'vitest'
import { TIPOS_SECCION } from '@/features/secciones/types'
import { puckConfig } from './puck-config'

/**
 * Fase 7 (7.2/7.3, UC-07): la configuración de Puck refleja el contrato del
 * API (mismos nombres y defaults que `apps/api/.../dto/configuracion/*.dto.ts`),
 * agrupa los campos en el orden contenido → disposición → efectos → base y
 * oculta lo que no aplica con `resolveFields`.
 */

// Acceso suelto a `components`: los tipos de Puck son estrictos por bloque y
// aquí solo se inspeccionan formas.
type Bloque = {
  defaultProps: Record<string, unknown>
  fields: Record<string, { type: string; label?: string; options?: { value: unknown }[]; max?: number }>
  resolveFields?: (
    data: { props: Record<string, unknown> },
    params: { fields: Record<string, unknown> },
  ) => Record<string, unknown>
}
const bloques = puckConfig.components as unknown as Record<string, Bloque>

function camposVisibles(tipo: string, props: Record<string, unknown>): string[] {
  const bloque = bloques[tipo]
  const fields = bloque.resolveFields
    ? bloque.resolveFields({ props }, { fields: bloque.fields })
    : bloque.fields
  return Object.keys(fields)
}

describe('puckConfig — un bloque por tipo_seccion (Fase 7)', () => {
  it('registra un componente por cada tipo del plan, incluido navegacion', () => {
    expect(Object.keys(bloques).sort()).toEqual([...TIPOS_SECCION].sort())
  })

  it('navegacion está en la categoría "Diseño" junto a hero y columnas', () => {
    expect(puckConfig.categories?.diseno?.components).toEqual(['hero', 'columnas', 'navegacion'])
  })

  it('los slots de columnas no admiten hero, columnas ni navegacion', () => {
    for (const nombre of ['columna_1', 'columna_2', 'columna_3']) {
      const campo = bloques.columnas.fields[nombre] as unknown as { allow: string[] }
      expect(campo.allow).not.toContain('hero')
      expect(campo.allow).not.toContain('columnas')
      expect(campo.allow).not.toContain('navegacion')
      expect(campo.allow).toContain('galeria')
    }
  })
})

describe('puckConfig — defaults iguales a los del API (Fase 7)', () => {
  it('campos base de todos los bloques', () => {
    for (const tipo of TIPOS_SECCION) {
      expect(bloques[tipo].defaultProps).toMatchObject({
        animacion_entrada: 'aparecer',
        separador_forma: 'ninguno',
        separador_inferior: true,
      })
    }
  })

  it.each([
    [
      'hero',
      {
        disposicion: 'centrado',
        titulos_rotativos: [],
        mostrar_redes: false,
        mostrar_indicador_scroll: false,
        efecto_titulo: 'ninguno',
        decoracion_fondo: 'ninguna',
      },
    ],
    ['sobre-mi', { estadisticas: [], estilo_foto: 'simple' }],
    [
      'proyectos',
      { disposicion: 'tarjetas', efecto_hover: 'elevar', mostrar_tecnologias: true },
    ],
    ['certificaciones', { efecto_hover: 'elevar' }],
    ['logros', { efecto_hover: 'elevar' }],
    ['skills', { disposicion: 'marquesina', estilo_chip: 'simple' }],
    ['contacto', { estilo: 'simple' }],
    ['galeria', { efecto_hover: 'zoom' }],
    [
      'navegacion',
      {
        estilo: 'flotante',
        fijo: true,
        mostrar_nombre: true,
        mostrar_cv: true,
        mostrar_toggle_modo: true,
        mostrar_progreso_scroll: false,
      },
    ],
  ])('%s', (tipo, esperado) => {
    expect(bloques[tipo].defaultProps).toMatchObject(esperado)
  })
})

describe('puckConfig — campos y etiquetas (Fase 7)', () => {
  it('fondo_bloque incluye degradado y vidrio', () => {
    const valores = bloques.hero.fields.fondo_bloque.options?.map((opcion) => opcion.value)
    expect(valores).toEqual(['ninguno', 'sutil', 'tarjeta', 'degradado', 'vidrio'])
  })

  it('animacion_entrada y separador_forma ofrecen exactamente los valores del contrato', () => {
    expect(bloques.proyectos.fields.animacion_entrada.options?.map((o) => o.value)).toEqual([
      'ninguna',
      'aparecer',
      'deslizar_arriba',
      'deslizar_lateral',
      'escalar',
    ])
    expect(bloques.proyectos.fields.separador_forma.options?.map((o) => o.value)).toEqual([
      'ninguno',
      'onda',
      'diagonal',
      'curva',
    ])
  })

  it('titulos_rotativos es un campo propio (string[] plano, máx. 6) y estadisticas un array de máx. 4', () => {
    expect(bloques.hero.fields.titulos_rotativos.type).toBe('custom')
    expect(bloques.hero.fields.titulos_rotativos.label).toContain('6')
    expect(bloques['sobre-mi'].fields.estadisticas.type).toBe('array')
    expect(bloques['sobre-mi'].fields.estadisticas.max).toBe(4)
  })

  it('las etiquetas de los campos nuevos están en español', () => {
    expect(bloques.hero.fields.disposicion.label).toBe('Disposición')
    expect(bloques.hero.fields.efecto_titulo.label).toBe('Efecto del título')
    expect(bloques.proyectos.fields.efecto_hover.label).toBe('Efecto al pasar el cursor')
    expect(bloques.navegacion.fields.mostrar_progreso_scroll.label).toBe('Mostrar progreso de lectura')
  })

  it('el orden es contenido → disposición → efectos → base', () => {
    const claves = Object.keys(bloques.hero.fields)
    const pos = (clave: string) => claves.indexOf(clave)
    expect(pos('titulo')).toBeLessThan(pos('disposicion'))
    expect(pos('disposicion')).toBeLessThan(pos('efecto_titulo'))
    expect(pos('efecto_titulo')).toBeLessThan(pos('espaciado_vertical'))
    expect(pos('animacion_entrada')).toBeGreaterThan(pos('separador_forma'))
    expect(pos('animacion_entrada')).toBeLessThan(pos('_visible'))
  })
})

describe('puckConfig — resolveFields oculta lo que no aplica (Fase 7)', () => {
  it('hero: el enlace de cada botón solo con su texto', () => {
    expect(camposVisibles('hero', {})).not.toContain('enlace_boton')
    expect(camposVisibles('hero', {})).not.toContain('enlace_boton_secundario')
    expect(camposVisibles('hero', { texto_boton_secundario: 'Hola' })).toContain(
      'enlace_boton_secundario',
    )
    expect(camposVisibles('hero', { texto_boton: 'Ir' })).toContain('enlace_boton')
  })

  it('hero: posición y estilo de la foto solo si se muestra la foto', () => {
    expect(camposVisibles('hero', { mostrar_foto_perfil: false })).not.toContain('posicion_foto')
    expect(camposVisibles('hero', { mostrar_foto_perfil: true })).toContain('posicion_foto')
    expect(camposVisibles('hero', { mostrar_foto_perfil: true })).toContain('estilo_foto')
  })

  it('sobre-mi: opciones de la foto solo si se muestra', () => {
    expect(camposVisibles('sobre-mi', { mostrar_foto: false })).not.toContain('estilo_foto')
    expect(camposVisibles('sobre-mi', { mostrar_foto: true })).toContain('estilo_foto')
  })

  it('proyectos: columnas solo en disposición tarjetas', () => {
    expect(camposVisibles('proyectos', { disposicion: 'tarjetas' })).toContain('columnas')
    expect(camposVisibles('proyectos', { disposicion: 'bento' })).not.toContain('columnas')
    expect(camposVisibles('proyectos', { disposicion: 'lista' })).not.toContain('columnas')
  })

  it('logros: el efecto hover no aplica a la línea de tiempo', () => {
    expect(camposVisibles('logros', { estilo_lista: 'tarjetas' })).toContain('efecto_hover')
    expect(camposVisibles('logros', { estilo_lista: 'linea_tiempo' })).not.toContain('efecto_hover')
  })

  it('contacto: texto_llamada solo en la tarjeta destacada (que además no usa estilo_redes)', () => {
    const simple = camposVisibles('contacto', { estilo: 'simple' })
    expect(simple).not.toContain('texto_llamada')
    expect(simple).toContain('estilo_redes')
    const destacada = camposVisibles('contacto', { estilo: 'tarjeta_destacada' })
    expect(destacada).toContain('texto_llamada')
    expect(destacada).not.toContain('estilo_redes')
  })

  it('skills: marquesina muestra dirección/velocidad/pausa; cuadrícula y nube, el estilo del chip', () => {
    const marquesina = camposVisibles('skills', { disposicion: 'marquesina' })
    expect(marquesina).toEqual(expect.arrayContaining(['direccion', 'velocidad', 'pausar_al_pasar']))
    expect(marquesina).not.toContain('estilo_chip')
    for (const disposicion of ['cuadricula', 'nube']) {
      const campos = camposVisibles('skills', { disposicion })
      expect(campos).toContain('estilo_chip')
      expect(campos).not.toContain('direccion')
    }
  })

  it('galeria: columnas_grid solo en grilla (comportamiento previo)', () => {
    expect(camposVisibles('galeria', { disposicion: 'grid' })).toContain('columnas_grid')
    expect(camposVisibles('galeria', { disposicion: 'carousel' })).not.toContain('columnas_grid')
  })

  it('navegacion: solo sus campos propios y la visibilidad, sin campos base ni título', () => {
    const campos = camposVisibles('navegacion', {})
    expect(campos).toEqual([
      'estilo',
      'fijo',
      'mostrar_nombre',
      'mostrar_cv',
      'mostrar_toggle_modo',
      'mostrar_progreso_scroll',
      '_visible',
    ])
  })
})
