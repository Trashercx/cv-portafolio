import type { TemaFormValues } from './tema-schema'

/**
 * Catálogo de paletas predefinidas (UC-08): un punto de partida editable
 * para crear un tema nuevo, no plantillas que se guarden en el servidor.
 * Cada una espeja `TemaFormValues` (mismos campos que `CreateTemaDto`, sin
 * `id`/`activo`) más un `id` de catálogo solo para identificarla en el
 * selector del formulario.
 *
 * Contraste: en cada paleta `color_texto` sobre `color_fondo` supera 7:1
 * (WCAG AAA para texto normal). `color_primario`/`color_secundario` se
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
    fuente_principal: 'Inter',
    modo: 'claro',
  },
  {
    id: 'atardecer',
    nombre: 'Atardecer',
    color_primario: '#c2410c',
    color_secundario: '#be123c',
    color_fondo: '#fff7ed',
    color_texto: '#7c2d12',
    fuente_principal: 'Poppins',
    modo: 'claro',
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    color_primario: '#16a34a',
    color_secundario: '#65a30d',
    color_fondo: '#f0fdf4',
    color_texto: '#14532d',
    fuente_principal: 'Merriweather',
    modo: 'claro',
  },
  {
    id: 'arena',
    nombre: 'Arena',
    color_primario: '#b45309',
    color_secundario: '#57534e',
    color_fondo: '#fafaf9',
    color_texto: '#292524',
    fuente_principal: 'Georgia',
    modo: 'claro',
  },
  {
    id: 'monocromo',
    nombre: 'Monocromo',
    color_primario: '#52525b',
    color_secundario: '#71717a',
    color_fondo: '#18181b',
    color_texto: '#f4f4f5',
    fuente_principal: 'Inter',
    modo: 'oscuro',
  },
  {
    id: 'medianoche',
    nombre: 'Medianoche',
    color_primario: '#4f46e5',
    color_secundario: '#0284c7',
    color_fondo: '#0f172a',
    color_texto: '#e2e8f0',
    fuente_principal: 'Inter',
    modo: 'oscuro',
  },
]
