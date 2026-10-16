import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TIPOS_SECCION } from '@/features/secciones/types'
import { puckConfig } from './puck-config'

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: () => ({ data: [], isLoading: false }),
}))

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

  it('los slots de columnas admiten la portada pero no columnas ni navegacion (Fase 7j)', () => {
    for (const nombre of ['columna_1', 'columna_2', 'columna_3']) {
      const campo = bloques.columnas.fields[nombre] as unknown as { allow: string[] }
      expect(campo.allow).toContain('hero')
      expect(campo.allow).not.toContain('columnas')
      expect(campo.allow).not.toContain('navegacion')
      expect(campo.allow).toContain('galeria')
      expect(campo.allow).toContain('insignias') // Fase 7d (UC-35)
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
    // Fase 7d (UC-35)
    [
      'insignias',
      {
        columnas: 'auto',
        tamano: 'normal',
        efecto_hover: 'inclinar_brillo',
        mostrar_emisor: true,
        mostrar_fecha: true,
        mostrar_habilidades: false,
        mostrar_enlace: true,
      },
    ],
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

  // Octava ronda (UC-07): Puck no pinta la etiqueta de los campos `custom`;
  // su `render` debe envolverse en `FieldLabel`.
  it.each([
    ['titulos_rotativos', 'Títulos rotativos'],
    ['imagen_fondo_media_id', 'Imagen (biblioteca de medios)'],
  ])('el campo custom %s muestra su etiqueta', (clave, etiqueta) => {
    const campo = bloques.hero.fields[clave] as unknown as {
      render: (props: Record<string, unknown>) => ReactElement
    }
    const props = { field: bloques.hero.fields[clave], name: clave, onChange: vi.fn() }
    render(campo.render({ ...props, value: undefined }))
    expect(screen.getByText(etiqueta, { exact: false })).toBeInTheDocument()
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

describe('puckConfig — borde_bloque (Fase 7c, UC-12)', () => {
  it('todos los bloques con campos base tienen el radio "Borde del bloque" con default sutil', () => {
    for (const tipo of TIPOS_SECCION) {
      if (tipo === 'navegacion') continue
      const bloque = bloques[tipo]
      expect(bloque.defaultProps.borde_bloque, tipo).toBe('sutil')
      const campo = bloque.fields.borde_bloque
      expect(campo.type, tipo).toBe('radio')
      expect(campo.label).toBe('Borde del bloque')
      expect(campo.options?.map((o) => o.value)).toEqual(['ninguno', 'sutil', 'marcado'])
    }
  })

  it('el campo queda justo después de "Fondo del bloque"', () => {
    const claves = Object.keys(bloques.proyectos.fields)
    expect(claves.indexOf('borde_bloque')).toBe(claves.indexOf('fondo_bloque') + 1)
  })

  it('normalizarConfiguracion trata sutil como default de una sección guardada sin el campo', async () => {
    const { normalizarConfiguracion } = await import('@/pages/admin/EditorSeccionesPage')
    const normalizada = normalizarConfiguracion('proyectos', {})
    expect(normalizada.borde_bloque).toBe('sutil')
    const marcada = normalizarConfiguracion('proyectos', { borde_bloque: 'marcado' })
    expect(marcada.borde_bloque).toBe('marcado')
  })
})

describe('puckConfig — bloque insignias (Fase 7d, UC-35)', () => {
  it('ofrece columnas, tamaño y efecto con los valores del contrato, en español', () => {
    const { fields } = bloques.insignias
    expect(fields.columnas.options?.map((o) => o.value)).toEqual(['auto', 2, 3, 4])
    expect(fields.tamano.options?.map((o) => o.value)).toEqual(['compacto', 'normal', 'grande'])
    expect(fields.efecto_hover.options?.map((o) => o.value)).toEqual([
      'inclinar_brillo',
      'girar',
      'elevar',
      'ninguno',
    ])
    expect(fields.limite).toMatchObject({ type: 'number', min: 1, max: 50 })
    expect(fields.mostrar_habilidades.label).toBe('Mostrar habilidades')
  })

  it('está en la categoría "Contenido"', () => {
    expect(puckConfig.categories?.contenido?.components).toContain('insignias')
  })
})

describe('puckConfig — insignias como medallas (Fase 7h, UC-35)', () => {
  it('por defecto son medallas, con los defaults del API', () => {
    expect(bloques.insignias.defaultProps).toMatchObject({
      estilo: 'medalla',
      animacion_reposo: 'flotar',
      marco_medalla: 'halo',
      etiqueta_medalla: 'al_pasar',
      mostrar_enlace: true,
    })
    const { fields } = bloques.insignias
    expect(fields.estilo.options?.map((o) => o.value)).toEqual(['medalla', 'tarjeta'])
    expect(fields.animacion_reposo.options?.map((o) => o.value)).toEqual([
      'flotar',
      'balanceo',
      'destello',
      'ninguna',
    ])
    expect(fields.marco_medalla.options?.map((o) => o.value)).toEqual(['halo', 'aro', 'cinta', 'ninguno'])
    expect(fields.etiqueta_medalla.options?.map((o) => o.value)).toEqual(['al_pasar', 'siempre', 'nunca'])
  })

  it('en medallas oculta el texto de tarjeta y muestra las opciones de medalla', () => {
    for (const props of [{}, { estilo: 'medalla' }]) {
      const campos = camposVisibles('insignias', props)
      expect(campos).toEqual(expect.arrayContaining(['animacion_reposo', 'marco_medalla', 'etiqueta_medalla']))
      expect(campos).not.toContain('mostrar_emisor')
      expect(campos).not.toContain('mostrar_fecha')
      expect(campos).not.toContain('mostrar_habilidades')
      expect(campos).toContain('mostrar_enlace')
    }
  })

  it('en tarjetas oculta las opciones de medalla', () => {
    const campos = camposVisibles('insignias', { estilo: 'tarjeta' })
    expect(campos).toEqual(expect.arrayContaining(['mostrar_emisor', 'mostrar_fecha', 'mostrar_habilidades']))
    expect(campos).not.toContain('animacion_reposo')
    expect(campos).not.toContain('marco_medalla')
    expect(campos).not.toContain('etiqueta_medalla')
  })
})

describe('puckConfig — Fase 7j', () => {
  it('"Título en la página" está en los bloques de contenido y no en la portada', () => {
    expect(camposVisibles('logros', {})).toContain('mostrar_titulo')
    expect(camposVisibles('galeria', {})).toContain('mostrar_titulo')
    expect(camposVisibles('hero', {})).not.toContain('mostrar_titulo')
    expect(bloques.logros.defaultProps.mostrar_titulo).toBe(true)
  })

  it('galería: cada disposición muestra solo sus opciones', () => {
    const carrusel = camposVisibles('galeria', { disposicion: 'carousel' })
    expect(carrusel).toContain('reproduccion_automatica')
    expect(carrusel).not.toContain('intervalo_segundos')
    expect(carrusel).not.toContain('columnas_grid')
    expect(carrusel).not.toContain('velocidad_cinta')
    expect(
      camposVisibles('galeria', { disposicion: 'carousel', reproduccion_automatica: true }),
    ).toContain('intervalo_segundos')

    const cinta = camposVisibles('galeria', { disposicion: 'cinta' })
    expect(cinta).toContain('velocidad_cinta')
    expect(cinta).not.toContain('aparicion_fotos')

    const masonry = camposVisibles('galeria', { disposicion: 'masonry' })
    expect(masonry).toContain('columnas_grid')
    expect(masonry).not.toContain('proporcion')

    expect(camposVisibles('galeria', { disposicion: 'mosaico' })).not.toContain('columnas_grid')
  })

  it('galería: opciones del contrato y resumen de cada foto', () => {
    const { fields } = bloques.galeria
    expect(fields.disposicion.options?.map((o) => o.value)).toEqual([
      'carousel',
      'grid',
      'mosaico',
      'masonry',
      'cinta',
    ])
    expect(fields.efecto_hover.options?.map((o) => o.value)).toEqual([
      'zoom',
      'elevar',
      'inclinar',
      'grises',
      'ninguno',
    ])
    const resumen = (fields.fotos as unknown as {
      getItemSummary: (foto: { titulo?: string }, indice?: number) => string
    }).getItemSummary
    expect(resumen({ titulo: 'Playa' }, 0)).toBe('Playa')
    expect(resumen({ titulo: '' }, 2)).toBe('Foto 3')
  })
})

describe('puckConfig — galería: opciones nuevas solo al insertar (Fase 7j)', () => {
  type ConResolveData = {
    resolveData: (
      data: { props: Record<string, unknown> },
      params: { trigger: string },
    ) => { props: Record<string, unknown> }
  }
  const galeria = bloques.galeria as unknown as ConResolveData

  it('defaultProps no trae las opciones nuevas (una galería guardada no cambia en el lienzo)', () => {
    for (const clave of ['proporcion', 'mostrar_titulos', 'aparicion_fotos', 'separacion', 'esquinas']) {
      expect(bloques.galeria.defaultProps).not.toHaveProperty(clave)
    }
  })

  it('al insertar recibe los valores de partida; al cargar no', () => {
    const insertada = galeria.resolveData({ props: { fotos: [] } }, { trigger: 'insert' })
    expect(insertada.props).toMatchObject({ mostrar_titulos: 'al_pasar', aparicion_fotos: 'escalonada' })
    const cargada = galeria.resolveData({ props: { fotos: [] } }, { trigger: 'load' })
    expect(cargada.props).not.toHaveProperty('mostrar_titulos')
  })
})
