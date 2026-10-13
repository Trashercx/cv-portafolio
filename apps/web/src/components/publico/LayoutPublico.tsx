import { Outlet } from 'react-router-dom'
import {
  ContenidoPrincipal,
  SaltarAlContenido,
} from '@/components/publico/ContenidoPrincipal'

/**
 * Layout de las rutas públicas que no arman su propio contenedor temado
 * (detalles UC-13 y 404, Fase 6): skip link + `<main id="contenido">`.
 * La home lo compone por su cuenta porque el footer y el toggle de tema
 * deben quedar dentro del contenedor temado pero fuera de `<main>`.
 */
export function LayoutPublico() {
  return (
    <>
      <SaltarAlContenido />
      <ContenidoPrincipal>
        <Outlet />
      </ContenidoPrincipal>
    </>
  )
}
