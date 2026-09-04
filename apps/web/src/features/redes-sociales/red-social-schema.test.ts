import { describe, expect, it } from 'vitest'
import { redSocialSchema } from './red-social-schema'

const BASE = {
  plataforma_id: '11111111-1111-4111-8111-111111111111',
  orden: 0,
}

/**
 * `url` se normaliza con `.transform()` anteponiendo `https://` cuando el
 * valor no trae ya un esquema URI reconocible — ver comentario del schema.
 */
describe('redSocialSchema (normalización de url)', () => {
  it('antepone https:// a una url sin esquema', () => {
    const resultado = redSocialSchema.parse({ ...BASE, url: 'linkedin.com/in/x' })

    expect(resultado.url).toBe('https://linkedin.com/in/x')
  })

  it('no toca una url que ya trae https://', () => {
    const resultado = redSocialSchema.parse({ ...BASE, url: 'https://linkedin.com/in/x' })

    expect(resultado.url).toBe('https://linkedin.com/in/x')
  })

  it('no toca un enlace mailto:', () => {
    const resultado = redSocialSchema.parse({ ...BASE, url: 'mailto:correo@ejemplo.com' })

    expect(resultado.url).toBe('mailto:correo@ejemplo.com')
  })

  it('no toca una url que ya trae http://', () => {
    const resultado = redSocialSchema.parse({ ...BASE, url: 'http://ejemplo.com' })

    expect(resultado.url).toBe('http://ejemplo.com')
  })

  it('sigue rechazando una url vacía', () => {
    expect(() => redSocialSchema.parse({ ...BASE, url: '' })).toThrow()
  })
})
