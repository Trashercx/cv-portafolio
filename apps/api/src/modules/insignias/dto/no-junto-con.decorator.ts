import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * El campo no puede venir junto con `otraPropiedad` (XOR de
 * `imagen_media_id` / `imagen_url_remota` en `CreateInsigniaDto`, UC-35).
 */
export function NoJuntoCon(
  otraPropiedad: string,
  opciones?: ValidationOptions,
) {
  return (objeto: object, propiedad: string) => {
    registerDecorator({
      name: 'noJuntoCon',
      target: objeto.constructor,
      propertyName: propiedad,
      constraints: [otraPropiedad],
      options: opciones,
      validator: {
        validate(valor: unknown, args: ValidationArguments) {
          const otra = (args.object as Record<string, unknown>)[
            args.constraints[0] as string
          ];
          return !(valor !== undefined && otra !== undefined);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} y ${String(args.constraints[0])} son excluyentes: envía solo uno`;
        },
      },
    });
  };
}
