import type { CookieOptions } from 'express';

export const NOMBRE_COOKIE_ACCESO = 'access_token';

/**
 * Opciones base de la cookie de sesión (UC-01, Fase 6). Las comparten
 * `setCookieAcceso` (login/refresh) y el logout: para que el navegador
 * borre la cookie, `clearCookie` debe usar los mismos `httpOnly`,
 * `sameSite`, `secure` y `path` con los que se emitió.
 */
export function opcionesBaseCookieAcceso(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true es obligatorio en producción (HTTPS); en desarrollo local
    // (http://localhost) se deja en false para que la cookie se guarde igual.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
