import { ValidationOptions, registerDecorator } from 'class-validator';

/**
 * URL absoluta http(s) o ruta relativa interna que empiece por `/` o `#`
 * (Fase 7, 7.2, UC-07). Rechaza `//host` (protocolo relativo), `javascript:`
 * y cualquier otro esquema.
 */
const PATRON_ENLACE = /^(https?:\/\/[^\s/]\S*|\/(?!\/)\S*|#\S*)$/i;

export function esEnlaceValido(valor: unknown): boolean {
  return typeof valor === 'string' && PATRON_ENLACE.test(valor);
}

export function EsEnlaceValido(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esEnlaceValido',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: esEnlaceValido,
        defaultMessage: () =>
          `${propertyName} debe ser una URL http(s) o una ruta que empiece por "/" o "#".`,
      },
    });
  };
}
