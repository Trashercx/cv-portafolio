import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import type { Logro } from '@/features/logros/types'
import { BloqueLogros } from './BloqueLogros'

/**
 * Fase 3.4 (personalización visual por bloque): `estilo_lista` alterna entre
 * el layout de tarjetas que ya existía (default) y una variante de línea de
 * tiempo (`border-l-2` + marcador circular por ítem).
 */

const LOGRO: Logro = {
  id: 'logro-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Certificación AWS',
  descripcion: 'Obtuve la certificación',
  fecha: '2025-01-01',
  categoria: 'certificacion',
  url_referencia: null,
  orden: 0,
}

const LOGRO_CON_REFERENCIA: Logro = {
  ...LOGRO,
  id: 'logro-2',
  titulo: 'Publicación técnica',
  url_referencia: 'https://blog.example.com/post',
}

describe('BloqueLogros (Fase 3.4)', () => {
  it('estilo_lista="tarjetas" (o sin definir) usa tarjetas con borde por ítem', () => {
    const { container } = render(
      <BloqueLogros titulo="Logros" config={{}} logros={[LOGRO]} />,
    )

    expect(screen.getByText('Certificación AWS')).toBeInTheDocument()
    const lista = container.querySelector('ul')
    expect(lista).not.toHaveClass('border-l-2')
    expect(container.querySelector('li')).toHaveClass('border')
  })

  it('estilo_lista="linea_tiempo" usa la línea vertical con marcador por ítem', () => {
    const { container } = render(
      <BloqueLogros
        titulo="Logros"
        config={{ estilo_lista: 'linea_tiempo' }}
        logros={[LOGRO]}
      />,
    )

    expect(screen.getByText('Certificación AWS')).toBeInTheDocument()
    const lista = container.querySelector('ul')
    expect(lista).toHaveClass('border-l-2')
  })
})

/**
 * Fase 4.3 (detalle en modal): la tarjeta completa de un logro (en ambos
 * estilos de lista) abre su detalle en el modal de `ProveedorDetallePublico`
 * al hacer click — Logros nunca tuvo esta capacidad antes. El link externo
 * opcional "Ver referencia" (`TarjetaLogro`, `BloqueLogros.tsx`) es HERMANO
 * del botón de la tarjeta, no descendiente — anidar un `<a>` dentro de un
 * `<button>` viola el modelo de contenido HTML5 (axe-core, regla
 * `nested-interactive`, severidad "serious") y puede dejar el link
 * inalcanzable para lectores de pantalla en navegación por cursor virtual,
 * aun si sigue respondiendo a un click directo — por eso además de que el
 * click en el link no abra el modal, se verifica que no sea descendiente
 * del `<button>`.
 */
describe('BloqueLogros (Fase 4.3, detalle en modal)', () => {
  it('click en la tarjeta abre el modal con el detalle del logro', async () => {
    const user = userEvent.setup()
    render(
      <ProveedorDetallePublico>
        <BloqueLogros titulo="Logros" config={{}} logros={[LOGRO]} />
      </ProveedorDetallePublico>,
    )

    expect(
      screen.queryByRole('heading', { name: 'Certificación AWS', level: 1 }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Certificación AWS' }))

    expect(
      screen.getByRole('heading', { name: 'Certificación AWS', level: 1 }),
    ).toBeInTheDocument()
  })

  it('"Ver referencia" es hermano del botón de la tarjeta (no anidado) y no abre el modal al hacer click', async () => {
    const user = userEvent.setup()
    render(
      <ProveedorDetallePublico>
        <BloqueLogros titulo="Logros" config={{}} logros={[LOGRO_CON_REFERENCIA]} />
      </ProveedorDetallePublico>,
    )

    const tarjeta = screen.getByRole('button', { name: 'Publicación técnica' })
    const enlaceReferencia = screen.getByRole('link', { name: /ver referencia/i })

    // Ningún `<a>` interactivo debe quedar anidado dentro del `<button>` de
    // la tarjeta (violaría el modelo de contenido HTML5 / `nested-interactive`).
    expect(tarjeta.contains(enlaceReferencia)).toBe(false)
    expect(enlaceReferencia).toHaveAttribute('href', 'https://blog.example.com/post')
    expect(enlaceReferencia).toHaveAttribute('target', '_blank')

    await user.click(enlaceReferencia)

    expect(
      screen.queryByRole('heading', { name: 'Publicación técnica', level: 1 }),
    ).not.toBeInTheDocument()
  })
})
