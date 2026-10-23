import { describe, expect, it } from 'vitest'
import type { Seccion } from '@/features/secciones/types'
import {
  anclaSeccion,
  generarAnclasSecciones,
  generarEnlacesNavegacion,
  navegacionReemplazaToggle,
  resolverAnclaHeredada,
  slugAncla,
} from './navegacion'

/** Fase 7 (7.2/7.3, UC-07 y UC-12): los enlaces del menú se generan, no se configuran. */

type Parcial = Pick<Seccion, 'id' | 'tipo_seccion' | 'titulo_visible' | 'visible'>

const seccion = (id: string, tipo_seccion: Seccion['tipo_seccion'], titulo_visible: string, visible = true): Parcial => ({
  id,
  tipo_seccion,
  titulo_visible,
  visible,
})

describe('generarEnlacesNavegacion', () => {
  it('incluye las secciones visibles con título, en el orden recibido', () => {
    const enlaces = generarEnlacesNavegacion([
      seccion('1', 'sobre-mi', 'Sobre mí'),
      seccion('2', 'proyectos', 'Proyectos'),
    ])
    expect(enlaces).toEqual([
      { id: '1', titulo: 'Sobre mí', ancla: 'sobre-mi' },
      { id: '2', titulo: 'Proyectos', ancla: 'proyectos' },
    ])
  })

  it('excluye hero y navegacion', () => {
    const enlaces = generarEnlacesNavegacion([
      seccion('h', 'hero', 'Portada'),
      seccion('n', 'navegacion', 'Navegación'),
      seccion('c', 'contacto', 'Contacto'),
    ])
    expect(enlaces.map((enlace) => enlace.id)).toEqual(['c'])
  })

  it('excluye títulos vacíos o solo espacios y recorta los demás', () => {
    const enlaces = generarEnlacesNavegacion([
      seccion('1', 'logros', ''),
      seccion('2', 'skills', '   '),
      seccion('3', 'galeria', '  Galería '),
    ])
    expect(enlaces).toEqual([{ id: '3', titulo: 'Galería', ancla: 'galeria' }])
  })

  it('excluye las ocultas salvo en la vista previa (soloVisibles=false)', () => {
    const secciones = [seccion('1', 'logros', 'Logros', false), seccion('2', 'skills', 'Skills')]
    expect(generarEnlacesNavegacion(secciones).map((enlace) => enlace.id)).toEqual(['2'])
    expect(generarEnlacesNavegacion(secciones, false).map((enlace) => enlace.id)).toEqual(['1', '2'])
  })
})

describe('anclaSeccion (formato antiguo, lienzo del editor)', () => {
  it('antepone seccion-', () => {
    expect(anclaSeccion('abc')).toBe('seccion-abc')
  })
})

/** Fase 7n (#73): anclas legibles y estables en vez de `#seccion-{uuid}`. */
describe('slugAncla', () => {
  it.each([
    ['Sobre mí', 'sobre-mi'],
    ['Insignias', 'insignias'],
    ['  Experiencia   laboral ', 'experiencia-laboral'],
    ['Diseño & Fotografía (2026)', 'diseno-fotografia-2026'],
    ['Ñandú ÀÉÎÕÜ ç', 'nandu-aeiou-c'],
    ['---', ''],
    ['日本語', ''],
  ])('%j → %j', (texto, esperado) => {
    expect(slugAncla(texto)).toBe(esperado)
  })
})

describe('generarAnclasSecciones', () => {
  it('usa el slug del título y cae al tipo de sección si el título no da slug', () => {
    const anclas = generarAnclasSecciones([
      seccion('a', 'hero', 'Portada'),
      seccion('b', 'sobre-mi', 'Sobre mí'),
      seccion('c', 'insignias', ''),
      seccion('d', 'galeria', '***'),
    ])
    expect(anclas).toEqual({ a: 'portada', b: 'sobre-mi', c: 'insignias', d: 'galeria' })
  })

  it('evita colisiones entre títulos repetidos y con ids reservados de la página', () => {
    const anclas = generarAnclasSecciones([
      seccion('a', 'proyectos', 'Proyectos'),
      seccion('b', 'galeria', 'Proyectos'),
      seccion('c', 'logros', 'proyectos!'),
      seccion('d', 'skills', 'Contenido'),
    ])
    expect(anclas).toEqual({ a: 'proyectos', b: 'proyectos-2', c: 'proyectos-3', d: 'contenido-2' })
  })

  it('reserva "top" (destino del nombre en la barra) y resuelve títulos no latinos por el tipo', () => {
    const anclas = generarAnclasSecciones([
      seccion('a', 'logros', 'Top'),
      seccion('b', 'galeria', '日本語'),
      seccion('c', 'galeria', 'Галерея'),
    ])
    expect(anclas).toEqual({ a: 'top-2', b: 'galeria', c: 'galeria-2' })
  })

  it('es estable: el mismo orden y títulos producen las mismas anclas', () => {
    const secciones = [seccion('x', 'sobre-mi', 'Sobre mí'), seccion('y', 'contacto', 'Contacto')]
    expect(generarAnclasSecciones(secciones)).toEqual(generarAnclasSecciones([...secciones]))
  })

  it('omite las ocultas salvo en la vista previa, igual que el renderizador', () => {
    const secciones = [seccion('1', 'logros', 'Logros', false), seccion('2', 'skills', 'Logros')]
    expect(generarAnclasSecciones(secciones)).toEqual({ '2': 'logros' })
    expect(generarAnclasSecciones(secciones, false)).toEqual({ '1': 'logros', '2': 'logros-2' })
  })

  it('coincide con las anclas que llevan los enlaces del menú', () => {
    const secciones = [
      seccion('h', 'hero', 'Hola'),
      seccion('a', 'sobre-mi', 'Sobre mí'),
      seccion('b', 'proyectos', 'Sobre mí'),
    ]
    const anclas = generarAnclasSecciones(secciones)
    for (const enlace of generarEnlacesNavegacion(secciones)) {
      expect(enlace.ancla).toBe(anclas[enlace.id])
    }
  })
})

describe('resolverAnclaHeredada', () => {
  const anclas = { 'uuid-1': 'sobre-mi', 'uuid-2': 'insignias' }

  it('acepta un slug actual tal cual', () => {
    expect(resolverAnclaHeredada('#insignias', anclas)).toEqual({ ancla: 'insignias', heredada: false })
  })

  it('traduce el formato antiguo #seccion-{id} al slug de esa sección', () => {
    expect(resolverAnclaHeredada('#seccion-uuid-1', anclas)).toEqual({ ancla: 'sobre-mi', heredada: true })
  })

  it('devuelve null con hash vacío, desconocido o de una sección que ya no existe', () => {
    expect(resolverAnclaHeredada('', anclas)).toBeNull()
    expect(resolverAnclaHeredada('#contenido', anclas)).toBeNull()
    expect(resolverAnclaHeredada('#seccion-uuid-9', anclas)).toBeNull()
  })

  it('decodifica el hash de la URL', () => {
    expect(resolverAnclaHeredada('#sobre%2Dmi', anclas)).toEqual({ ancla: 'sobre-mi', heredada: false })
  })

  it('un hash malformado no lanza: devuelve null', () => {
    expect(resolverAnclaHeredada('#100%', anclas)).toBeNull()
    expect(resolverAnclaHeredada('#%E0%A4%A', anclas)).toBeNull()
  })
})

describe('navegacionReemplazaToggle', () => {
  const nav = (visible: boolean, config: object) =>
    ({ tipo_seccion: 'navegacion', visible, configuracion: config }) as Pick<
      Seccion,
      'tipo_seccion' | 'visible' | 'configuracion'
    >

  it('es true con una navegación visible que muestra el toggle (default)', () => {
    expect(navegacionReemplazaToggle([nav(true, {})])).toBe(true)
    expect(navegacionReemplazaToggle([nav(true, { mostrar_toggle_modo: true })])).toBe(true)
  })

  it('es false si no hay navegación, está oculta o no muestra el toggle', () => {
    expect(navegacionReemplazaToggle([])).toBe(false)
    expect(navegacionReemplazaToggle([nav(false, {})])).toBe(false)
    expect(navegacionReemplazaToggle([nav(true, { mostrar_toggle_modo: false })])).toBe(false)
  })
})
