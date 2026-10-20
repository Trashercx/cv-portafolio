/**
 * Fase 8 (UC-34, entrega 8.2): toda lectura de `Media` expone sus variantes
 * responsive ordenadas por ancho; de cada variante salen solo formato, ancho,
 * alto y url (ni su `s3_key` ni sus `bytes`). Centralizado aquí para que los
 * endpoints admin y el snapshot devuelvan exactamente la misma forma.
 * Fase 7m (#67, #68): `Media.bytes` (tamaño del original; null en archivos
 * anteriores) no necesita select: viaja como escalar de la fila.
 */
export const SELECT_VARIANTES = {
  select: { formato: true, ancho: true, alto: true, url: true },
  orderBy: [{ ancho: 'asc' as const }, { formato: 'asc' as const }],
};

/** `include` de Prisma para cargar una `Media` con sus variantes. */
export const INCLUDE_MEDIA_CON_VARIANTES = {
  variantes: SELECT_VARIANTES,
};
