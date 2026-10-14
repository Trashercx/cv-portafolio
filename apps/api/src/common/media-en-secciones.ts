/**
 * Recorrido común de las referencias a `Media` dentro de secciones (Fase 7d,
 * UC-09): `hero.imagen_fondo_media_id` y `galeria.fotos[].media_id`, tanto en
 * secciones de nivel superior como anidadas en `configuracion.columna_1/2/3`
 * de `columnas` (a cualquier profundidad). Lo comparten `versiones-sitio`
 * (resolver media del snapshot) y `media` (calcular "usos" por archivo).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeccionLike = any;

export interface ReferenciaMediaEnSeccion {
  mediaId: string;
  tipo: 'hero' | 'galeria';
  /** Sección (o bloque anidado) que contiene la referencia. */
  seccion: SeccionLike;
}

/** `configuracion.fotos` de una sección `galeria` (vacío si no es array). */
export function fotosDeSeccion(seccion: SeccionLike): SeccionLike[] {
  const configuracion = (seccion?.configuracion ?? {}) as Record<
    string,
    unknown
  >;
  return Array.isArray(configuracion.fotos) ? configuracion.fotos : [];
}

/** Las 3 columnas de una sección `columnas` (siempre 3 arrays). */
export function columnasDeSeccion(seccion: SeccionLike): SeccionLike[][] {
  const configuracion = (seccion?.configuracion ?? {}) as Record<
    string,
    unknown
  >;
  return [
    configuracion.columna_1,
    configuracion.columna_2,
    configuracion.columna_3,
  ].map((columna) => (Array.isArray(columna) ? columna : []));
}

/** Lista plana de referencias a media (con repeticiones) en las secciones. */
export function recolectarReferenciasMedia(
  secciones: SeccionLike[],
): ReferenciaMediaEnSeccion[] {
  return secciones.flatMap((seccion): ReferenciaMediaEnSeccion[] => {
    if (seccion?.tipo_seccion === 'hero') {
      const id = (seccion.configuracion as Record<string, unknown> | null)
        ?.imagen_fondo_media_id;
      return typeof id === 'string' && id.length > 0
        ? [{ mediaId: id, tipo: 'hero', seccion }]
        : [];
    }

    if (seccion?.tipo_seccion === 'galeria') {
      return fotosDeSeccion(seccion).flatMap((foto) =>
        typeof foto?.media_id === 'string' && foto.media_id.length > 0
          ? [
              {
                mediaId: foto.media_id as string,
                tipo: 'galeria' as const,
                seccion,
              },
            ]
          : [],
      );
    }

    if (seccion?.tipo_seccion === 'columnas') {
      return columnasDeSeccion(seccion).flatMap((columna) =>
        recolectarReferenciasMedia(columna),
      );
    }

    return [];
  });
}
