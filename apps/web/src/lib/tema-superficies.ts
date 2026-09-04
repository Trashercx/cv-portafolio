import type { TemaColores } from './tema-css'
import {
  clamp,
  derivarPaletaOscura,
  hexARgb,
  hslAHex,
  rgbAHsl,
  type ModoTema,
} from './tema-oscuro'

/**
 * Ajusta la luminosidad de un color hex preservando hue/saturación
 * (`L' = clamp(L + deltaL, 0, 100)`) — mismo patrón que `invertirLuminosidad`
 * de `tema-oscuro.ts`, pero sumando un delta en vez de invertir.
 */
function ajustarLuminosidad(hex: string, deltaL: number): string {
  const { r, g, b } = hexARgb(hex)
  const hsl = rgbAHsl(r, g, b)
  const lAjustada = clamp(hsl.l + deltaL, 0, 100)
  return hslAHex({ h: hsl.h, s: hsl.s, l: lAjustada })
}

/**
 * Interpola linealmente los canales RGB de dos colores hex. `proporcion` en
 * [0, 1]: 0 devuelve `hexA` puro, 1 devuelve `hexB` puro.
 */
function mezclarColores(hexA: string, hexB: string, proporcion: number): string {
  const a = hexARgb(hexA)
  const b = hexARgb(hexB)
  const canal = (valorA: number, valorB: number) =>
    Math.round(valorA + (valorB - valorA) * proporcion)
      .toString(16)
      .padStart(2, '0')

  return `#${canal(a.r, b.r)}${canal(a.g, b.g)}${canal(a.b, b.b)}`
}

/**
 * Deriva las 11 superficies genéricas de shadcn/Tailwind (`background`,
 * `card`, `muted`, `border`, `foreground`, etc.) a partir de los 4 tokens de
 * negocio del `Tema`, para que el sitio público tenga una sola fuente de
 * verdad de color en vez de dos paletas independientes (los 4 tokens de
 * negocio, ya coloreados según el `Tema`, y los tokens genéricos de
 * shadcn/Tailwind, hoy fijos en los valores neutros de `index.css`).
 *
 * Devuelve las claves SIN el prefijo `--`: quien consume esto (`tema-css.ts`)
 * les agrega el prefijo y las mapea a su variable `--kebab-case` equivalente.
 */
export function derivarSuperficiesShadcn(
  tema: TemaColores,
  modo: ModoTema,
): Record<string, string> {
  const colores = modo === 'oscuro' ? derivarPaletaOscura(tema) : tema
  const deltaSuperficie = modo === 'oscuro' ? 5 : -4
  const deltaMuted = modo === 'oscuro' ? 8 : -6
  const deltaBorder = modo === 'oscuro' ? 12 : -10
  const deltaAccent = modo === 'oscuro' ? 8 : -6

  const card = ajustarLuminosidad(colores.color_fondo, deltaSuperficie)

  return {
    background: colores.color_fondo,
    foreground: colores.color_texto,
    card,
    popover: card,
    muted: ajustarLuminosidad(colores.color_fondo, deltaMuted),
    border: ajustarLuminosidad(colores.color_fondo, deltaBorder),
    cardForeground: colores.color_texto,
    popoverForeground: colores.color_texto,
    accentForeground: colores.color_texto,
    mutedForeground: mezclarColores(colores.color_texto, colores.color_fondo, 0.45),
    accent: ajustarLuminosidad(colores.color_secundario, deltaAccent),
  }
}
