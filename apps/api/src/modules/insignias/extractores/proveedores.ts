/**
 * Registro de proveedores de insignias (Fase 7e, UC-35): alimenta la cadena
 * de extractores, la validación de `CreateInsigniaDto.proveedor` y
 * `GET /admin/insignias/proveedores`. Añadir un proveedor = una entrada aquí
 * + un extractor. Sin imports: lo usan `tipos`, `utils` y el DTO.
 */
export type ModoProveedor = 'automatico' | 'archivo' | 'mixto';

export interface ProveedorRegistrado {
  clave: string;
  nombre: string;
  dominios: RegExp[];
  modo: ModoProveedor;
  ayuda: string;
}

export const AYUDA_DATACAMP =
  'DataCamp no permite la lectura automática: descarga el PDF o la imagen del certificado y súbelo en la pestaña Subir archivo';

export const PROVEEDORES_INSIGNIA = [
  {
    clave: 'credly',
    nombre: 'Credly',
    dominios: [/^https:\/\/(?:www\.)?credly\.com\//i],
    modo: 'automatico',
    ayuda: 'Pega el enlace público de la insignia o el código de embed.',
  },
  {
    clave: 'open_badges',
    nombre: 'Open Badges',
    dominios: [],
    modo: 'automatico',
    ayuda: 'Enlace de verificación Open Badges',
  },
  {
    clave: 'skilljar',
    nombre: 'Skilljar',
    dominios: [/^https:\/\/(?:[a-z0-9-]+\.)?skilljar\.com\//i],
    modo: 'automatico',
    ayuda: 'Anthropic Academy y otros cursos en Skilljar',
  },
  {
    clave: 'datacamp',
    nombre: 'DataCamp',
    dominios: [/^https:\/\/(?:www\.)?datacamp\.com\//i],
    modo: 'archivo',
    ayuda: AYUDA_DATACAMP,
  },
  {
    clave: 'generico',
    nombre: 'Otra página web',
    dominios: [],
    modo: 'automatico',
    ayuda:
      'Cualquier página con metadatos (og:title, og:image) o una imagen directa.',
  },
  {
    clave: 'manual',
    nombre: 'Manual',
    dominios: [],
    modo: 'archivo',
    ayuda: 'Sube la imagen y completa los datos a mano.',
  },
] as const satisfies readonly ProveedorRegistrado[];

export type ProveedorInsignia = (typeof PROVEEDORES_INSIGNIA)[number]['clave'];

export const CLAVES_PROVEEDOR: readonly ProveedorInsignia[] =
  PROVEEDORES_INSIGNIA.map((p) => p.clave);

export function modoDeProveedor(clave: string): ModoProveedor {
  return (
    (PROVEEDORES_INSIGNIA.find((p) => p.clave === clave)?.modo as
      ModoProveedor | undefined) ?? 'automatico'
  );
}

/** Lista pública de `GET /admin/insignias/proveedores` (sin las regex). */
export function listarProveedores() {
  return PROVEEDORES_INSIGNIA.map(({ clave, nombre, modo, ayuda }) => ({
    clave,
    nombre,
    modo,
    ayuda,
  }));
}
