import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export interface EsPosteriorAOpciones {
  /** Si es `true`, acepta que ambas fechas sean iguales (posterior-o-igual). */
  oIgual?: boolean;
}

const PATRON_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Devuelve `undefined` si `valor` no es un string `AAAA-MM-DD` parseable. */
function aTimestampUtc(valor: unknown): number | undefined {
  if (typeof valor !== 'string') {
    return undefined;
  }

  const coincidencia = PATRON_FECHA_ISO.exec(valor);
  if (!coincidencia) {
    return undefined;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  return Date.UTC(anio, mes - 1, dia);
}

function esVacio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === '';
}

/**
 * Validador cruzado de propiedades: exige que el campo decorado sea
 * posterior (o posterior-o-igual, con `{ oIgual: true }`) a otro campo
 * `propiedad` del MISMO DTO, ambos strings de fecha `AAAA-MM-DD`.
 *
 * Limitación conocida y aceptada para v1 del proyecto: si cualquiera de los
 * dos valores (el propio o el de `propiedad`) es `undefined`/`null`/`''` —
 * típicamente porque un `PATCH` parcial solo trae uno de los dos campos en
 * el payload — el validador PASA sin error. No es su responsabilidad exigir
 * presencia (de eso se encargan `@IsNotEmpty()`/la ausencia de
 * `@IsOptional()` en cada DTO de creación); y cruzar contra el valor ya
 * persistido en base de datos requeriría que el decorador de validación
 * hiciera I/O, lo cual queda fuera de alcance (sobre-ingeniería) para este
 * proyecto. Esto significa que un `PATCH` que solo cambia `fecha_fin` sin
 * reenviar `fecha_inicio` no se valida contra el `fecha_inicio` persistido
 * — es un trade-off deliberado, no un bug.
 */
export function EsPosteriorA(
  propiedad: string,
  opciones: EsPosteriorAOpciones = {},
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esPosteriorA',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [propiedad, opciones],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [nombrePropiedadRelacionada, opts] = args.constraints as [
            string,
            EsPosteriorAOpciones,
          ];
          const valorRelacionado = (args.object as Record<string, unknown>)[
            nombrePropiedadRelacionada
          ];

          if (esVacio(value) || esVacio(valorRelacionado)) {
            return true;
          }

          const propioTs = aTimestampUtc(value);
          const relacionadoTs = aTimestampUtc(valorRelacionado);

          if (propioTs === undefined || relacionadoTs === undefined) {
            // No es una fecha ISO parseable: `@EsFechaIso` (u otro
            // validador de formato) ya se encarga de reportar ese error
            // específico; este validador cruzado no duplica el reclamo.
            return true;
          }

          return opts.oIgual
            ? propioTs >= relacionadoTs
            : propioTs > relacionadoTs;
        },
        defaultMessage(args: ValidationArguments) {
          const [nombrePropiedadRelacionada, opts] = args.constraints as [
            string,
            EsPosteriorAOpciones,
          ];

          return opts?.oIgual
            ? `${args.property} debe ser posterior o igual a ${nombrePropiedadRelacionada}`
            : `${args.property} debe ser posterior a ${nombrePropiedadRelacionada}`;
        },
      },
    });
  };
}
