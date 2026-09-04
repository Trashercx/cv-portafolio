import type { TemaColores } from './tema-css'

/**
 * Modo de paleta aplicado al sitio público (Fase 4.6, UC-08/UC-12). Reusa el
 * mismo vocabulario que `Tema.modo` (`features/tema/types.ts`), aunque ese
 * campo de la tabla `tema` sigue siendo metadata inerte en esta fase: el modo
 * real que se aplica al visitante se deriva en el cliente (ver
 * `useModoTema.ts`), no se lee de esa columna.
 */
export type ModoTema = 'claro' | 'oscuro'

type Hsl = { h: number; s: number; l: number }

/** Convierte un hex `#rgb`/`#rrggbb` a componentes RGB en [0, 255]. */
function hexARgb(hex: string): { r: number; g: number; b: number } {
  let valor = hex.trim().replace(/^#/, '')
  if (valor.length === 3) {
    valor = valor
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const numero = Number.parseInt(valor, 16)
  return {
    r: (numero >> 16) & 255,
    g: (numero >> 8) & 255,
    b: numero & 255,
  }
}

/** RGB (cada canal en [0, 255]) a HSL (`h` en grados [0, 360), `s`/`l` en [0, 100]). */
function rgbAHsl(r: number, g: number, b: number): Hsl {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const l = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 }
  }

  const delta = max - min
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

  let h: number
  switch (max) {
    case rNorm:
      h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60
      break
    case gNorm:
      h = ((bNorm - rNorm) / delta + 2) * 60
      break
    default:
      h = ((rNorm - gNorm) / delta + 4) * 60
  }

  return { h, s: s * 100, l: l * 100 }
}

/** HSL de vuelta a hex `#rrggbb`. */
function hslAHex({ h, s, l }: Hsl): string {
  const sNorm = s / 100
  const lNorm = l / 100
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2

  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) {
    rp = c
    gp = x
  } else if (h < 120) {
    rp = x
    gp = c
  } else if (h < 180) {
    gp = c
    bp = x
  } else if (h < 240) {
    gp = x
    bp = c
  } else if (h < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }

  const canal = (valor: number) =>
    Math.round((valor + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${canal(rp)}${canal(gp)}${canal(bp)}`
}

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor))
}

/**
 * Invierte la luminosidad de un color hex preservando hue/saturación
 * (`L' = 100 - L`, con `clamp(L', 6, 94)` para evitar negro/blanco puro que
 * rompería el contraste con bordes/sombras que asumen algo de rango).
 */
function invertirLuminosidad(hex: string): string {
  const { r, g, b } = hexARgb(hex)
  const hsl = rgbAHsl(r, g, b)
  const lInvertida = clamp(100 - hsl.l, 6, 94)
  return hslAHex({ h: hsl.h, s: hsl.s, l: lInvertida })
}

/**
 * Deriva la paleta oscura de un `Tema` sin persistir nada nuevo: invierte la
 * luminosidad de los 4 colores (hue/saturación intactos) y copia
 * `fuente_principal` tal cual, porque la tipografía no cambia con el modo.
 * Usado por `temaComoVariablesCss` cuando `modo === 'oscuro'`.
 */
export function derivarPaletaOscura(tema: TemaColores): TemaColores {
  return {
    color_primario: invertirLuminosidad(tema.color_primario),
    color_secundario: invertirLuminosidad(tema.color_secundario),
    color_fondo: invertirLuminosidad(tema.color_fondo),
    color_texto: invertirLuminosidad(tema.color_texto),
    fuente_principal: tema.fuente_principal,
  }
}
