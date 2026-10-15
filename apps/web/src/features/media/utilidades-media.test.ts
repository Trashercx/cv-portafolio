import { describe, expect, it } from 'vitest'
import { nombreArchivo } from './utilidades-media'

describe('nombreArchivo (Fase 7h, UC-09)', () => {
  it('muestra el nombre original que conserva la clave', () => {
    expect(nombreArchivo({ s3_key: 'certificaciones/a1b2c3d4e5f6/Certificado-AWS.pdf' })).toBe(
      'Certificado-AWS.pdf',
    )
  })

  it('decodifica secuencias % y tolera las inválidas', () => {
    expect(nombreArchivo({ s3_key: 'x/a%20b.png' })).toBe('a b.png')
    expect(nombreArchivo({ s3_key: 'x/100%.png' })).toBe('100%.png')
  })

  it('para claves antiguas con uuid usa el texto alternativo si existe', () => {
    const uuid = 'perfil/3f2504e0-4f89-41d3-9a0c-0305e82c3301.png'
    expect(nombreArchivo({ s3_key: uuid, alt_text: 'Foto de perfil' })).toBe('Foto de perfil')
    expect(nombreArchivo({ s3_key: uuid, alt_text: null })).toBe(
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301.png',
    )
  })
})
