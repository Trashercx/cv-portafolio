import { useEffect } from 'react'
import { cargarFuente } from './fuentes'

/**
 * Pide la descarga de la fuente de un tema (Fase 7, UC-08) mientras el
 * componente está montado. Se usa donde se aplica `temaComoVariablesCss`:
 * lienzo del editor (`PuckRoot`), vista previa del diálogo de versiones,
 * sitio público y formulario de tema. La carga es idempotente
 * (`cargarFuente`), así que llamarlo desde varios componentes a la vez no
 * repite el `import()` del paquete `@fontsource-variable/*`.
 *
 * Nota: la fuente se inyecta como hoja de estilos en el `<head>` del
 * documento que ejecuta el `import()` (el del panel). El iframe del lienzo la
 * recibe porque Puck (`iframe.syncHostStyles`) copia al iframe las hojas de
 * estilo del panel, también las añadidas después del montaje.
 */
export function useFuenteTema(clave: string | null | undefined) {
  useEffect(() => {
    if (clave) void cargarFuente(clave)
  }, [clave])
}
