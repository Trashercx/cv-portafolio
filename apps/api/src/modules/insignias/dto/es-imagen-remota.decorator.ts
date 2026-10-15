import { isURL, registerDecorator, ValidationOptions } from 'class-validator';
import { MAX_DATA_URI_IMAGEN, RE_DATA_URI_IMAGEN } from '../extractores/utils';

/** Tope de una URL https de imagen (el de la Fase 7d). */
const MAX_URL_HTTPS = 2000;

/**
 * `imagen_url_remota` (UC-35): una URL https (≤ 2000) que el servidor
 * descarga con red segura o, desde la Fase 7i, la imagen que generó un
 * extractor como `data:image/svg+xml;base64,…` o `data:image/png;base64,…`
 * (≤ 64 000 caracteres). En ambos casos el contenido se valida después por
 * bytes con `validarImagen` (SVG sin código activo).
 */
export function EsImagenRemota(opciones?: ValidationOptions) {
  return (objeto: object, propiedad: string) => {
    registerDecorator({
      name: 'esImagenRemota',
      target: objeto.constructor,
      propertyName: propiedad,
      options: opciones,
      validator: {
        validate(valor: unknown) {
          if (typeof valor !== 'string') return false;
          if (valor.startsWith('data:')) {
            return (
              valor.length <= MAX_DATA_URI_IMAGEN &&
              RE_DATA_URI_IMAGEN.test(valor)
            );
          }
          return (
            valor.length <= MAX_URL_HTTPS &&
            isURL(valor, { protocols: ['https'], require_protocol: true })
          );
        },
        defaultMessage() {
          return 'imagen_url_remota debe ser una URL https o una imagen data:image/svg+xml|png en base64';
        },
      },
    });
  };
}
