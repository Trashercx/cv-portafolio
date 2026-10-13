import { describe, expect, it } from 'vitest'
import { resolverEnlaceSeguro } from './enlaces'

describe('resolverEnlaceSeguro (Fase 7, UC-12)', () => {
  it('acepta http(s), mailto, rutas internas y anclas', () => {
    expect(resolverEnlaceSeguro('https://ejemplo.com/x')).toEqual({
      href: 'https://ejemplo.com/x',
      target: '_blank',
      rel: 'noreferrer',
    })
    expect(resolverEnlaceSeguro('http://ejemplo.com')).toMatchObject({ target: '_blank' })
    expect(resolverEnlaceSeguro('mailto:a@b.com')).toEqual({ href: 'mailto:a@b.com' })
    expect(resolverEnlaceSeguro('/contacto')).toEqual({ to: '/contacto' })
    expect(resolverEnlaceSeguro('#proyectos')).toEqual({ href: '#proyectos' })
  })

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html,x',
    'ftp://ejemplo.com',
    '//evil.com',
    String.raw`/\evil.com`,
    'ejemplo.com',
    '',
    '   ',
  ])('rechaza %j', (valor) => {
    expect(resolverEnlaceSeguro(valor)).toBeNull()
  })

  it('undefined no genera enlace', () => {
    expect(resolverEnlaceSeguro(undefined)).toBeNull()
  })
})
