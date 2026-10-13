import { describe, expect, it } from 'vitest'
import type { Seccion } from '@/features/secciones/types'
import { anclaSeccion, generarEnlacesNavegacion, navegacionReemplazaToggle } from './navegacion'

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
      { id: '1', titulo: 'Sobre mí' },
      { id: '2', titulo: 'Proyectos' },
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
    expect(enlaces).toEqual([{ id: '3', titulo: 'Galería' }])
  })

  it('excluye las ocultas salvo en la vista previa (soloVisibles=false)', () => {
    const secciones = [seccion('1', 'logros', 'Logros', false), seccion('2', 'skills', 'Skills')]
    expect(generarEnlacesNavegacion(secciones).map((enlace) => enlace.id)).toEqual(['2'])
    expect(generarEnlacesNavegacion(secciones, false).map((enlace) => enlace.id)).toEqual(['1', '2'])
  })
})

describe('anclaSeccion', () => {
  it('antepone seccion-', () => {
    expect(anclaSeccion('abc')).toBe('seccion-abc')
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
