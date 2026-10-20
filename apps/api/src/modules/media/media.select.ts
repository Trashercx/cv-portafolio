/**
 * Fase 8 (UC-34, entrega 8.2): toda lectura de `Media` expone sus variantes
 * responsive ordenadas por ancho, las variantes no exponen `s3_key` ni `bytes`. Fase 7m (#67, #68): `Media.bytes` (tamaño del
 * original, null en archivos anteriores) viaja como escalar de la fila. Centralizado aquí
 * para que endpoints admin y snapshot devuelvan exactamente la misma forma.
 */
export const SELECT_VARIANTES = {
  select: { formato: true, ancho: true, alto: true, url: true },
  orderBy: [{ ancho: 'asc' as const }, { formato: 'asc' as const }],
};

/** `include` de Prisma para cargar una `Media` con sus variantes. */
export const INCLUDE_MEDIA_CON_VARIANTES = {
  variantes: SELECT_VARIANTES,
};
