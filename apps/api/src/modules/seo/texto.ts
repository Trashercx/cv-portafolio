/**
 * Utilidades de texto del módulo `seo` (Fase 8, UC-34).
 */

/**
 * Recorta un texto largo a una descripción apta para `<meta description>`.
 * Port idéntico de `recortarDescripcion` de `apps/web/src/lib/seo.ts`: colapsa
 * espacios/saltos de línea y, si hay que recortar, corta en el último espacio
 * anterior al límite y agrega «…». Mantener ambas copias sincronizadas para
 * que el fragmento del servidor y `MetadatosPagina` coincidan.
 */
export function recortarDescripcion(texto: string, max = 155): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;

  const corte = limpio.lastIndexOf(' ', max - 1);
  const base = corte > 0 ? limpio.slice(0, corte) : limpio.slice(0, max - 1);
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** Escapa `& < > " '` para usarlo en texto o en valores de atributo HTML/XML. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
