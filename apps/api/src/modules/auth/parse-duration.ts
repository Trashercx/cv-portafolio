/**
 * Parser mínimo de duraciones tipo "15m", "1h", "30s", "1d" a milisegundos,
 * usado para calcular el `maxAge` de la cookie `access_token` a partir de
 * `JWT_EXPIRES_IN`. Si el valor no matchea el formato esperado, usa un
 * fallback de 15 minutos (la misma duración configurada en el `.env` de
 * ejemplo del proyecto).
 */
export function parseDurationToMs(
  duration: string | undefined,
  fallbackMs = 15 * 60 * 1000,
): number {
  if (!duration) {
    return fallbackMs;
  }

  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(duration.trim());
  if (!match) {
    return fallbackMs;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitToMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitToMs[unit];
}

/**
 * Calcula la fecha/hora de expiración de la sesión a partir de `JWT_EXPIRES_IN`,
 * reusando `parseDurationToMs`. La usan tanto `login` como `refrescar` en
 * `AuthService` para que el `expiresAt` devuelto al frontend quede sincronizado
 * con el `maxAge` de la cookie `access_token` seteada en el controller.
 */
export function calcularExpiracion(
  duration: string | undefined = process.env.JWT_EXPIRES_IN,
): Date {
  return new Date(Date.now() + parseDurationToMs(duration));
}
