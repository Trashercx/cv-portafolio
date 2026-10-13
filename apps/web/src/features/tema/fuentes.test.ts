import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Los paquetes `@fontsource-variable/*` son hojas de CSS: en el test se
 * sustituyen por módulos espía para comprobar CUÁNDO se piden (bajo demanda y
 * una sola vez), no su contenido.
 */
const importMocks = vi.hoisted(() => ({
  inter: vi.fn(),
  spaceGrotesk: vi.fn(),
  sora: vi.fn(),
  dmSans: vi.fn(),
  playfair: vi.fn(),
  jetbrains: vi.fn(),
}))

vi.mock('@fontsource-variable/inter', () => (importMocks.inter(), {}))
vi.mock('@fontsource-variable/space-grotesk', () => (importMocks.spaceGrotesk(), {}))
vi.mock('@fontsource-variable/sora', () => (importMocks.sora(), {}))
vi.mock('@fontsource-variable/dm-sans', () => (importMocks.dmSans(), {}))
vi.mock('@fontsource-variable/playfair-display', () => (importMocks.playfair(), {}))
vi.mock('@fontsource-variable/jetbrains-mono', () => (importMocks.jetbrains(), {}))

import {
  CLAVES_FUENTE,
  FUENTES_TEMA,
  cargarFuente,
  familiaCssDeFuente,
  obtenerFuente,
  reiniciarCargasDeFuentes,
} from './fuentes'

describe('catálogo de fuentes (Fase 7, UC-08)', () => {
  beforeEach(() => {
    reiniciarCargasDeFuentes()
    Object.values(importMocks).forEach((mock) => mock.mockClear())
  })

  it('contiene exactamente las 10 claves del contrato 7.2', () => {
    expect([...CLAVES_FUENTE].sort()).toEqual(
      [
        'manrope',
        'inter',
        'space_grotesk',
        'sora',
        'dm_sans',
        'playfair_display',
        'jetbrains_mono',
        'sans_sistema',
        'serif_sistema',
        'mono_sistema',
      ].sort(),
    )
    expect(FUENTES_TEMA).toHaveLength(10)
  })

  it('cada fuente tiene nombre y familia CSS; solo las variables descargables tienen paquete', () => {
    for (const fuente of FUENTES_TEMA) {
      expect(fuente.nombre.length).toBeGreaterThan(0)
      expect(fuente.familiaCss.length).toBeGreaterThan(0)
    }
    const conPaquete = FUENTES_TEMA.filter((f) => f.paquete).map((f) => f.clave)
    expect(conPaquete.sort()).toEqual(
      ['inter', 'space_grotesk', 'sora', 'dm_sans', 'playfair_display', 'jetbrains_mono'].sort(),
    )
  })

  it('mapea los legados a la fuente más parecida', () => {
    expect(obtenerFuente('Inter')?.clave).toBe('inter')
    expect(obtenerFuente('Poppins')?.clave).toBe('dm_sans')
    expect(obtenerFuente('Merriweather')?.clave).toBe('serif_sistema')
    expect(obtenerFuente('Georgia')?.clave).toBe('serif_sistema')
    expect(obtenerFuente('Desconocida')).toBeUndefined()
    expect(familiaCssDeFuente('Desconocida')).toBe('Desconocida')
  })

  it('cargarFuente hace import() del paquete una sola vez aunque se llame varias veces', async () => {
    expect(importMocks.inter).not.toHaveBeenCalled()

    await Promise.all([
      cargarFuente('inter'),
      cargarFuente('inter'),
      cargarFuente('Inter'),
    ])
    await cargarFuente('inter')

    expect(importMocks.inter).toHaveBeenCalledTimes(1)
    expect(importMocks.sora).not.toHaveBeenCalled()
  })

  it('no descarga nada para manrope ni para las fuentes del sistema', async () => {
    await cargarFuente('manrope')
    await cargarFuente('sans_sistema')
    await cargarFuente('serif_sistema')
    await cargarFuente('mono_sistema')
    await cargarFuente('Desconocida')

    for (const mock of Object.values(importMocks)) {
      expect(mock).not.toHaveBeenCalled()
    }
  })

  it('un legado carga el paquete de su equivalente (Poppins -> DM Sans)', async () => {
    await cargarFuente('Poppins')
    expect(importMocks.dmSans).toHaveBeenCalledTimes(1)
  })
})
