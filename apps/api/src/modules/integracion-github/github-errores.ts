import { RedSeguraError } from '../insignias/red-segura';

/** Mensaje común de cuota agotada de la API de GitHub (UC-36, Fase 7m). */
export const MENSAJE_CUOTA_GITHUB =
  'GitHub rechazó la petición (límite de cuota). Define GITHUB_TOKEN o reintenta más tarde';

/**
 * Traduce un error de red segura a un mensaje legible para el panel. Lo
 * comparten la sincronización de repos y el README (UC-36). `mensaje404` es
 * lo que significa un 404 en cada contexto.
 */
export function mensajeDeErrorGithub(
  error: unknown,
  mensaje404: string,
): string {
  if (error instanceof RedSeguraError) {
    if (/respondió 404/.test(error.message)) return mensaje404;
    if (/respondió (403|429)/.test(error.message)) return MENSAJE_CUOTA_GITHUB;
    return error.message;
  }
  return error instanceof SyntaxError
    ? 'GitHub devolvió una respuesta que no es JSON'
    : error instanceof Error
      ? error.message
      : String(error);
}
