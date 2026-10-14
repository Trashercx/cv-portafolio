/**
 * Fase 8 (UC-34, entrega 8.2): toda lectura de `Media` expone sus variantes
 * responsive ordenadas por ancho, sin `s3_key` ni `bytes`. Centralizado aquí
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
