/**
 * Contraste de color según WCAG 2.x (Fase 7, UC-08): luminancia relativa y
 * ratio de contraste, para el indicador del formulario de tema y para
 * verificar en tests que las plantillas predefinidas cumplen AAA.
 * Referencia: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

const HEX_6 = /^#[0-9a-fA-F]{6}$/
const HEX_3 = /^#[0-9a-fA-F]{3}$/

/** Umbrales WCAG 2.x para texto normal. */
export const UMBRAL_AA = 4.5
export const UMBRAL_AAA = 7

export type NivelContraste = 'AAA' | 'AA' | 'insuficiente'

/** `true` para `#rrggbb` y `#rgb`. */
export function esHexValido(hex: string): boolean {
  return HEX_6.test(hex) || HEX_3.test(hex)
}

function canales(hex: string): [number, number, number] {
  if (!esHexValido(hex)) {
    throw new RangeError(`Color hexadecimal inválido: "${hex}"`)
  }
  const completo =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex
  return [
    parseInt(completo.slice(1, 3), 16),
    parseInt(completo.slice(3, 5), 16),
    parseInt(completo.slice(5, 7), 16),
  ]
}

/** Luminancia relativa (0 negro, 1 blanco) de un color hex. */
export function luminanciaRelativa(hex: string): number {
  const [r, g, b] = canales(hex).map((canal) => {
    const c = canal / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Ratio de contraste entre dos colores hex, de 1 (idénticos) a 21 (negro
 * sobre blanco). Es simétrico: el orden de los argumentos no importa.
 * Lanza `RangeError` si algún color no es hex válido (usar `esHexValido`
 * antes con valores a medio escribir).
 */
export function ratioContraste(hexA: string, hexB: string): number {
  const a = luminanciaRelativa(hexA)
  const b = luminanciaRelativa(hexB)
  const [claro, oscuro] = a >= b ? [a, b] : [b, a]
  return (claro + 0.05) / (oscuro + 0.05)
}

/** Nivel WCAG para texto normal: AAA >= 7, AA >= 4.5, si no `'insuficiente'`. */
export function nivelContraste(ratio: number): NivelContraste {
  if (ratio >= UMBRAL_AAA) return 'AAA'
  if (ratio >= UMBRAL_AA) return 'AA'
  return 'insuficiente'
}
