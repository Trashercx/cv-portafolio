/**
 * Atajo de la "Vista limpia" (Fase 7c, UC-07): `Ctrl/Cmd+Shift+L`. Lo usan el
 * panel (`LienzoPuck`) y el documento del iframe (`PuckRoot`).
 */
export function esAtajoVistaLimpia(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === 'l' && event.shiftKey && (event.ctrlKey || event.metaKey)
}
