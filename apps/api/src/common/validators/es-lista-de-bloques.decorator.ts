import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  TIPOS_SECCION,
  TipoSeccion,
} from '../../modules/secciones/dto/configuracion';
import { obtenerErroresConfiguracion } from '../../modules/secciones/dto/configuracion/validar-configuracion';

/**
 * Las únicas 4 claves que puede tener un "bloque hijo" dentro de una columna
 * (`ColumnasConfiguracionDto.columna_1/2/3`, Fase 3.3/UC-17): la misma forma
 * que tendría el bloque como `Seccion` propia, pero SIN `id`/
 * `usuario_admin_id`/`orden` (esos campos solo existen para filas reales).
 * Blindaje explícito en el backend contra que el frontend mande de más (p.
 * ej. `id`/`_seccionId`), aunque `sanearSlots` del editor ya debería
 * limpiarlo antes de enviar.
 */
const CLAVES_PERMITIDAS = [
  'tipo_seccion',
  'titulo_visible',
  'visible',
  'configuracion',
] as const;

/**
 * Guarda, por cada array `value` que falló la validación, el mensaje
 * diagnosticable armado en `validate()` — `defaultMessage()` lo recupera
 * usando el mismo `args.value` como clave. Se usa un `WeakMap` (en vez de
 * una variable de closure compartida) para que validaciones concurrentes de
 * DTOs distintos (arrays distintos) nunca se pisen entre sí: cada request
 * trae su propia instancia de array, nunca la misma referencia.
 */
const mensajesPorValor = new WeakMap<object, string>();

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function tieneExactamenteLasClavesPermitidas(
  item: Record<string, unknown>,
): boolean {
  const claves = Object.keys(item);
  return (
    claves.length === CLAVES_PERMITIDAS.length &&
    CLAVES_PERMITIDAS.every((clave) => claves.includes(clave))
  );
}

/** Valida un único bloque hijo; devuelve el mensaje de error o `undefined`. */
async function validarBloque(
  item: unknown,
  indice: number,
  nombreCampo: string,
): Promise<string | undefined> {
  if (!esObjetoPlano(item)) {
    return `${nombreCampo}[${indice}]: debe ser un objeto con las claves tipo_seccion, titulo_visible, visible y configuracion.`;
  }

  if (!tieneExactamenteLasClavesPermitidas(item)) {
    return `${nombreCampo}[${indice}]: debe tener exactamente las claves tipo_seccion, titulo_visible, visible y configuracion (sin id ni otras claves).`;
  }

  const { tipo_seccion, titulo_visible, visible, configuracion } = item;

  // Un bloque hijo nunca puede ser 'hero' (la portada ocupa todo el ancho
  // por diseño), 'navegacion' (barra global del sitio, Fase 7, 7.2) ni 'columnas' (evita anidamiento sin límite). Tipado como
  // `readonly string[]` (en vez de dejar que TS infiera la unión angosta de
  // literales) para poder comparar contra `tipo_seccion` (un `string`
  // llegado del payload) sin castear en el sentido contrario.
  const tiposPermitidosEnColumna: readonly string[] = TIPOS_SECCION.filter(
    (tipo) => tipo !== 'hero' && tipo !== 'columnas' && tipo !== 'navegacion',
  );

  if (
    typeof tipo_seccion !== 'string' ||
    !tiposPermitidosEnColumna.includes(tipo_seccion)
  ) {
    return `${nombreCampo}[${indice}]: tipo_seccion "${String(tipo_seccion)}" no está permitido dentro de un contenedor "Columnas".`;
  }

  if (typeof titulo_visible !== 'string' || titulo_visible.length === 0) {
    return `${nombreCampo}[${indice}]: titulo_visible debe ser un string no vacío.`;
  }

  if (typeof visible !== 'boolean') {
    return `${nombreCampo}[${indice}]: visible debe ser un valor booleano.`;
  }

  const erroresConfiguracion = await obtenerErroresConfiguracion(
    tipo_seccion as TipoSeccion,
    configuracion,
  );

  if (erroresConfiguracion.length > 0) {
    return `${nombreCampo}[${indice}]: configuracion inválida para tipo_seccion "${tipo_seccion}": ${erroresConfiguracion.join('; ')}.`;
  }

  return undefined;
}

/**
 * Valida que el valor decorado sea un array de "bloques hijo" de un
 * contenedor `columnas` (`ColumnasConfiguracionDto.columna_1/2/3`, Fase
 * 3.3/UC-17). Cada elemento debe:
 *
 * - Ser un objeto plano con EXACTAMENTE las claves `tipo_seccion`/
 *   `titulo_visible`/`visible`/`configuracion` (rechaza `id`/`_seccionId`/
 *   cualquier otra clave).
 * - Tener un `tipo_seccion` de `TIPOS_SECCION` distinto de `'hero'`,
 *   `'navegacion'` y de `'columnas'` (restricción de anidamiento de un solo nivel).
 * - Tener `titulo_visible` un string no vacío y `visible` un booleano.
 * - Tener `configuracion` válida contra el DTO que le corresponde a ese
 *   `tipo_seccion` (`obtenerErroresConfiguracion`, la misma validación que
 *   se le aplicaría si el bloque fuera una `Seccion` propia).
 *
 * `class-validator` soporta validadores async siempre que `validate()`
 * devuelva una `Promise<boolean>` (como aquí, porque
 * `obtenerErroresConfiguracion` es async).
 */
export function EsListaDeBloques(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esListaDeBloques',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        async validate(
          value: unknown,
          args: ValidationArguments,
        ): Promise<boolean> {
          if (!Array.isArray(value)) {
            return false;
          }

          const mensajesError = (
            await Promise.all(
              value.map((item, indice) =>
                validarBloque(item, indice, args.property),
              ),
            )
          ).filter((mensaje): mensaje is string => mensaje !== undefined);

          if (mensajesError.length > 0) {
            mensajesPorValor.set(value, mensajesError.join(' '));
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          if (!Array.isArray(args.value)) {
            return `${args.property} debe ser un array de bloques.`;
          }

          return (
            mensajesPorValor.get(args.value) ??
            `${args.property} contiene bloques inválidos.`
          );
        },
      },
    });
  };
}
