import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export interface EsFechaIsoOpciones {
  /**
   * Si es `true`, además de exigir una fecha de calendario real, rechaza
   * fechas posteriores a "hoy". La comparación es por fecha de calendario
   * en UTC (no por hora exacta): tanto el valor recibido como "hoy" se
   * truncan a medianoche UTC antes de comparar, para que el resultado no
   * dependa de la zona horaria en la que corra el servidor.
   */
  noFutura?: boolean;
}

const PATRON_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `class-validator@0.15` (`@IsDateString()`) solo exige que el string tenga
 * FORMA de fecha ISO 8601 (vía una regex de validator.js) — no que sea una
 * fecha de calendario real. Verificado manualmente: `'2026-02-30'` y
 * `'2026-02-29'` (2026 no es bisiesto) pasan `@IsDateString()` sin error,
 * porque el constructor nativo `new Date('2026-02-30')` "desborda" a
 * `2026-03-02` en vez de fallar. Solo formatos claramente inválidos como
 * mes `13` son rechazados por esa regex.
 *
 * Por eso este validador reconstruye la fecha a partir de sus componentes
 * año/mes/día en UTC con `Date.UTC(...)` y comprueba que, leídos de vuelta,
 * los componentes coincidan exactamente con los del string original — si
 * hubo desborde (por ejemplo 30 de febrero → 2 de marzo), la comparación
 * falla y se rechaza.
 */
function esFechaDeCalendarioReal(valor: string): boolean {
  const coincidencia = PATRON_FECHA_ISO.exec(valor);
  if (!coincidencia) {
    return false;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

/** Asume que `valor` ya pasó `esFechaDeCalendarioReal`. */
function esFechaNoFutura(valor: string): boolean {
  const coincidencia = PATRON_FECHA_ISO.exec(valor);
  if (!coincidencia) {
    return false;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const valorUtc = Date.UTC(anio, mes - 1, dia);

  const ahora = new Date();
  const hoyUtc = Date.UTC(
    ahora.getUTCFullYear(),
    ahora.getUTCMonth(),
    ahora.getUTCDate(),
  );

  return valorUtc <= hoyUtc;
}

/**
 * Valida que el campo decorado sea una fecha ISO `AAAA-MM-DD` de calendario
 * real (rechaza `2026-02-30`, `2026-02-29` en año no bisiesto, `2026-13-01`,
 * etc.). Con `{ noFutura: true }`, además rechaza fechas posteriores a hoy
 * (comparando por fecha de calendario UTC, ver `EsFechaIsoOpciones`).
 *
 * No exige presencia del campo (eso es responsabilidad de `@IsNotEmpty()`
 * o de omitir `@IsOptional()` en el DTO); si el valor no es un string, se
 * reporta como inválido — pero un `undefined` en un DTO `PartialType` no
 * llega a evaluarse porque `@IsOptional()` corta la cadena antes.
 */
export function EsFechaIso(
  opciones: EsFechaIsoOpciones = {},
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esFechaIso',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [opciones],
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          if (!esFechaDeCalendarioReal(value)) {
            return false;
          }

          if (opciones.noFutura && !esFechaNoFutura(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [opts] = args.constraints as [EsFechaIsoOpciones];

          if (opts?.noFutura) {
            return `${args.property} debe ser una fecha de calendario válida (AAAA-MM-DD) y no puede ser una fecha futura`;
          }

          return `${args.property} debe ser una fecha de calendario válida en formato AAAA-MM-DD`;
        },
      },
    });
  };
}
