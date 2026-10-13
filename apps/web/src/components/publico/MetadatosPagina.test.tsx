import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PerfilPublico } from '@/features/publico/types'
import { recortarDescripcion } from '@/lib/seo'
import { DatosEstructuradosPersona } from './DatosEstructuradosPersona'
import { MetadatosPagina } from './MetadatosPagina'

function meta(selector: string) {
  return document.head.querySelector(selector)
}

describe('MetadatosPagina (Fase 6, UC-12/UC-13)', () => {
  afterEach(() => {
    cleanup()
    document.head.innerHTML = ''
  })

  it('renderiza title, description, canonical, Open Graph y Twitter en el <head>', () => {
    render(
      <MetadatosPagina
        titulo="Ada — Ingeniera"
        descripcion="Bio corta."
        imagen="/uploads/ada.png"
      />,
    )

    expect(document.title).toBe('Ada — Ingeniera')
    expect(meta('meta[name="description"]')).toHaveAttribute(
      'content',
      'Bio corta.',
    )
    expect(meta('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${window.location.origin}${window.location.pathname}`,
    )
    expect(meta('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Ada — Ingeniera',
    )
    expect(meta('meta[property="og:description"]')).toBeInTheDocument()
    expect(meta('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'website',
    )
    expect(meta('meta[property="og:url"]')).toBeInTheDocument()
    expect(meta('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `${window.location.origin}/uploads/ada.png`,
    )
    expect(meta('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
  })

  it('sin imagen usa twitter:card summary y omite og:image', () => {
    render(<MetadatosPagina titulo="Sin imagen" />)

    expect(meta('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary',
    )
    expect(meta('meta[property="og:image"]')).toBeNull()
  })

  it('retira los metadatos estáticos de index.html para no duplicarlos', () => {
    document.head.innerHTML =
      '<meta name="description" content="generica" data-meta-estatico />'

    render(<MetadatosPagina titulo="X" descripcion="Propia" />)

    const descripciones = document.head.querySelectorAll(
      'meta[name="description"]',
    )
    expect(descripciones).toHaveLength(1)
    expect(descripciones[0]).toHaveAttribute('content', 'Propia')
  })
})

describe('DatosEstructuradosPersona (JSON-LD)', () => {
  const perfil = {
    nombre_completo: 'Ada Lovelace',
    titulo_profesional: 'Ingeniera de software',
    resumen_bio: 'Bio de prueba.',
    imagen_perfil: null,
  } as unknown as PerfilPublico

  it('emite un script ld+json con @type Person, sameAs y sin email', () => {
    const { container } = render(
      <DatosEstructuradosPersona
        perfil={perfil}
        redes={
          [
            { url: 'https://github.com/ada' },
            { url: 'https://linkedin.com/in/ada' },
          ] as never
        }
        imagen="/foto.png"
      />,
    )

    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const datos = JSON.parse(script!.textContent ?? '')
    expect(datos['@type']).toBe('Person')
    expect(datos.name).toBe('Ada Lovelace')
    expect(datos.jobTitle).toBe('Ingeniera de software')
    expect(datos.sameAs).toEqual([
      'https://github.com/ada',
      'https://linkedin.com/in/ada',
    ])
    expect(datos.image).toBe(`${window.location.origin}/foto.png`)
    expect(datos).not.toHaveProperty('email')
  })
})

describe('recortarDescripcion', () => {
  it('no toca textos cortos', () => {
    expect(recortarDescripcion('Hola   mundo\n')).toBe('Hola mundo')
  })

  it('recorta sin cortar palabras y agrega elipsis', () => {
    const texto = 'palabra '.repeat(40)
    const resultado = recortarDescripcion(texto, 155)
    expect(resultado.length).toBeLessThanOrEqual(155)
    expect(resultado.endsWith('…')).toBe(true)
    expect(resultado.replace('…', '').split(' ').every((p) => p === 'palabra')).toBe(true)
  })
})
