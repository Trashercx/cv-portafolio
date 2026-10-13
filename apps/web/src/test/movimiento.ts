import { afterEach } from 'vitest'

const matchMediaOriginal = window.matchMedia

/**
 * Simula `prefers-reduced-motion: reduce` (Fase 7, 7.3): sustituye
 * `window.matchMedia` por un stub que responde `reducido` solo a esa consulta.
 * Se restaura solo tras cada test.
 */
export function simularMovimientoReducido(reducido: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducido : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = matchMediaOriginal
})
