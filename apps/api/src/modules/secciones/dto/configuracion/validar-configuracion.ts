import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import {
  CONFIGURACION_DTO_POR_TIPO,
  TIPOS_SECCION,
  TipoSeccion,
} from './index';

/**
 * Cuerpo reutilizable de la validación de `Seccion.configuracion` contra el
 * DTO de `class-validator` que le corresponde a `tipoSeccion` (uno de los
 * valores de `TIPOS_SECCION`, ver `CONFIGURACION_DTO_POR_TIPO`). Reproduce a
 * mano el comportamiento del `ValidationPipe` global (`whitelist` +
 * `forbidNonWhitelisted`) porque `configuracion` es JSON dinámico y no se
 * puede tipar como un DTO fijo en la firma del controlador.
 *
 * Extraído de `SeccionesService.validarConfiguracion` (que sigue siendo el
 * único que lanza `BadRequestException`, como wrapper delgado de esta
 * función) para que también lo use `@EsListaDeBloques()` (Fase 3.3, UC-17):
 * un bloque hijo dentro de un contenedor `columnas` valida su
 * `configuracion` exactamente igual que si fuera una `Seccion` propia, sin
 * duplicar esta lógica.
 *
 * Devuelve la lista de mensajes de error (vacía si `configuracion` es
 * válida) en vez de lanzar, para que cada llamador decida qué hacer con el
 * resultado.
 */
export async function obtenerErroresConfiguracion(
  tipoSeccion: TipoSeccion,
  configuracion: unknown,
): Promise<string[]> {
  if (!TIPOS_SECCION.includes(tipoSeccion)) {
    return [`tipo_seccion desconocido: ${tipoSeccion}`];
  }

  if (
    typeof configuracion !== 'object' ||
    configuracion === null ||
    Array.isArray(configuracion)
  ) {
    return ['configuracion debe ser un objeto'];
  }

  const DtoClase = CONFIGURACION_DTO_POR_TIPO[tipoSeccion];
  const instancia = plainToInstance(DtoClase, configuracion);

  const errores = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return aplanarErrores(errores);
}

/**
 * Aplana los errores de `class-validator` incluyendo los de objetos anidados
 * (`error.children`, p. ej. `estadisticas[0].valor`, Fase 7, UC-07). Sin esto
 * los errores de un `@ValidateNested` quedaban silenciados porque solo tienen
 * `children`, no `constraints`.
 */
function aplanarErrores(errores: ValidationError[], prefijo = ''): string[] {
  return errores.flatMap((error) => {
    const ruta = prefijo ? `${prefijo}.${error.property}` : error.property;
    const propios = Object.values(error.constraints ?? {});
    return [...propios, ...aplanarErrores(error.children ?? [], ruta)];
  });
}
