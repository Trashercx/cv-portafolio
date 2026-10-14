/**
 * Analítica con Umami (Fase 8, 8.4; UC-14/UC-27). Sin cookies. Todo es no-op
 * si el tracker no está configurado o aún no cargó (adblock, desarrollo, lienzo
 * del editor): los enlaces nunca dependen de la analítica para funcionar.
 */

export type NombreEventoAnalitica = 'descargar_cv' | 'clic_red'

/** `true` si el build trae `VITE_UMAMI_URL` y `VITE_UMAMI_WEBSITE_ID`. */
export function analiticaConfigurada(): boolean {
  return Boolean(import.meta.env.VITE_UMAMI_URL && import.meta.env.VITE_UMAMI_WEBSITE_ID)
}

/** Registra un evento personalizado; nunca lanza. */
export function registrarEvento(
  nombre: NombreEventoAnalitica,
  datos?: Record<string, string>,
): void {
  try {
    window.umami?.track(nombre, datos)
  } catch {
    // La analítica jamás debe romper la navegación del visitante.
  }
}
