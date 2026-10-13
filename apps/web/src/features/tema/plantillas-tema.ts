import type { TemaFormValues } from './tema-schema'

/**
 * Catálogo de paletas predefinidas (UC-08): un punto de partida editable
 * para crear un tema nuevo, no plantillas que se guarden en el servidor.
 * Cada una espeja `TemaFormValues` (mismos campos que `CreateTemaDto`, sin
 * `id`/`activo`) más un `id` de catálogo solo para identificarla en el
 * selector del formulario.
 *
 * Fase 7 (UC-08): 12 plantillas (las 6 originales más Grafito, Lavanda,
 * Menta, Ámbar, Carbón y Cielo), con fuentes del catálogo de
 * `features/tema/fuentes.ts`.
 *
 * Contraste: en cada paleta `color_texto` sobre `color_fondo` supera 7:1
 * (WCAG AAA para texto normal); `plantillas-tema.test.ts` lo verifica con
 * `ratioContraste`. `color_primario`/`color_secundario` se
 * eligieron en tonos ~600/700 de Tailwind, que es el rango que ya usa el
 * resto del panel para botones con texto blanco encima (ver
 * `TemaFormDialog` `DEFAULT_VALUES`: `#2563eb`/`#7c3aed`).
 */
export type PlantillaTema = TemaFormValues & { id: string }

export const PLANTILLAS_TEMA: PlantillaTema[] = [
  {
    id: 'oceano',
    nombre: 'Océano',
    color_primario: '#0284c7',
    color_secundario: '#0891b2',
    color_fondo: '#f0f9ff',
    color_texto: '#0c4a6e',
    fuente_principal: 'sans_sistema',
    modo: 'claro',
  },
  {
    id: 'atardecer',
    nombre: 'Atardecer',
    color_primario: '#c2410c',
    color_secundario: '#be123c',
    color_fondo: '#fff7ed',
    color_texto: '#7c2d12',
    fuente_principal: 'manrope',
    modo: 'claro',
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    color_primario: '#16a34a',
    color_secundario: '#65a30d',
    color_fondo: '#f0fdf4',
    color_texto: '#14532d',
    fuente_principal: 'serif_sistema',
    modo: 'claro',
  },
  {
    id: 'arena',
    nombre: 'Arena',
    color_primario: '#b45309',
    color_secundario: '#57534e',
    color_fondo: '#fafaf9',
    color_texto: '#292524',
    fuente_principal: 'serif_sistema',
    modo: 'claro',
  },
  {
    id: 'monocromo',
    nombre: 'Monocromo',
    color_primario: '#52525b',
    color_secundario: '#71717a',
    color_fondo: '#18181b',
    color_texto: '#f4f4f5',
    fuente_principal: 'manrope',
    modo: 'oscuro',
  },
  {
    id: 'medianoche',
    nombre: 'Medianoche',
    color_primario: '#4f46e5',
    color_secundario: '#0284c7',
    color_fondo: '#0f172a',
    color_texto: '#e2e8f0',
    fuente_principal: 'manrope',
    modo: 'oscuro',
  },
  {
    id: 'grafito',
    nombre: 'Grafito',
    color_primario: '#60a5fa',
    color_secundario: '#9ca3af',
    color_fondo: '#1f2937',
    color_texto: '#f3f4f6',
    fuente_principal: 'inter',
    modo: 'oscuro',
  },
  {
    id: 'lavanda',
    nombre: 'Lavanda',
    color_primario: '#7e22ce',
    color_secundario: '#a21caf',
    color_fondo: '#faf5ff',
    color_texto: '#3b0764',
    fuente_principal: 'dm_sans',
    modo: 'claro',
  },
  {
    id: 'menta',
    nombre: 'Menta',
    color_primario: '#047857',
    color_secundario: '#0f766e',
    color_fondo: '#ecfdf5',
    color_texto: '#064e3b',
    fuente_principal: 'space_grotesk',
    modo: 'claro',
  },
  {
    id: 'ambar',
    nombre: 'Ámbar',
    color_primario: '#a16207',
    color_secundario: '#b45309',
    color_fondo: '#fffbeb',
    color_texto: '#451a03',
    fuente_principal: 'sora',
    modo: 'claro',
  },
  {
    id: 'carbon',
    nombre: 'Carbón',
    color_primario: '#f59e0b',
    color_secundario: '#a3a3a3',
    color_fondo: '#0a0a0a',
    color_texto: '#fafafa',
    fuente_principal: 'jetbrains_mono',
    modo: 'oscuro',
  },
  {
    id: 'cielo',
    nombre: 'Cielo',
    color_primario: '#2563eb',
    color_secundario: '#0ea5e9',
    color_fondo: '#eff6ff',
    color_texto: '#1e3a8a',
    fuente_principal: 'playfair_display',
    modo: 'claro',
  },
]
