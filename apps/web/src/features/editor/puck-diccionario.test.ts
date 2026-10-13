/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { PUCK_DICCIONARIO } from './puck-diccionario'

/**
 * Lee las claves de `defaultDictionary` del `.d.ts` del paquete (archivo con
 * hash en el nombre: se busca por contenido) para que añadir una clave en una
 * versión futura de Puck rompa este test en vez de quedar en inglés.
 */
function clavesDePuck(): string[] {
  const require = createRequire(import.meta.url)
  const dist = join(
    dirname(require.resolve('@puckeditor/core/package.json')),
    'dist',
  )
  const archivo = readdirSync(dist).find(
    (nombre) =>
      nombre.startsWith('index-') &&
      nombre.endsWith('.d.ts') &&
      readFileSync(join(dist, nombre), 'utf8').includes(
        'declare const defaultDictionary',
      ),
  )
  expect(archivo).toBeDefined()
  const fuente = readFileSync(join(dist, archivo as string), 'utf8')
  const bloque = fuente.slice(
    fuente.indexOf('declare const defaultDictionary'),
    fuente.indexOf('type DictionaryKey'),
  )
  return [...bloque.matchAll(/readonly "([^"]+)":/g)].map((m) => m[1])
}

describe('PUCK_DICCIONARIO', () => {
  it('traduce todas las claves del diccionario por defecto de Puck', () => {
    const claves = clavesDePuck()
    expect(claves.length).toBeGreaterThan(50)
    const faltantes = claves.filter((clave) => !(clave in PUCK_DICCIONARIO))
    expect(faltantes).toEqual([])
  })

  it('no define claves que Puck no conoce', () => {
    const claves = new Set(clavesDePuck())
    const sobrantes = Object.keys(PUCK_DICCIONARIO).filter(
      (clave) => !claves.has(clave),
    )
    expect(sobrantes).toEqual([])
  })
})
