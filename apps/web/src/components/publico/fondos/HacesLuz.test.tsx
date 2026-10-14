import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HacesLuz } from './HacesLuz'

/** Fase 7b (UC-15): en táctil o con intensidad `sutil` se aligeran los haces (3 y blur 8px). */

const matchMediaOriginal = window.matchMedia
afterEach(() => {
  window.matchMedia = matchMediaOriginal
})

function simular(sinHover: boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: sinHover && consulta.includes('hover: none'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

const props = {
  velocidad: 'media',
  interactivo: false,
  estatico: false,
  maxFps: 60,
  ambito: 'caja',
} as const

function haces(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[style*="haz-oscilar"]')]
}

describe('HacesLuz', () => {
  it('en escritorio usa 4 haces con blur de 16px', () => {
    simular(false)
    const { container } = render(<HacesLuz {...props} intensidad="media" />)
    const lista = haces(container)
    expect(lista).toHaveLength(4)
    expect(lista[0].style.filter).toBe('blur(16px)')
  })

  it('con (hover: none) usa 3 haces con blur de 8px', () => {
    simular(true)
    const { container } = render(<HacesLuz {...props} intensidad="media" />)
    const lista = haces(container)
    expect(lista).toHaveLength(3)
    expect(lista[0].style.filter).toBe('blur(8px)')
  })

  it('con intensidad sutil también se aligera', () => {
    simular(false)
    const { container } = render(<HacesLuz {...props} intensidad="sutil" />)
    expect(haces(container)).toHaveLength(3)
  })
})
