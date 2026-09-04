import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import type { Proyecto } from '@/features/proyectos/types'
import { BloqueProyectos } from './BloqueProyectos'

/**
 * Fase 4.3 (detalle en modal): en modo público (default de
 * `useModoRenderizado`, sin envolver en `ProveedorModoRenderizado`), un
 * click en la tarjeta abre el detalle del proyecto en el modal de
 * `ProveedorDetallePublico` en vez de navegar a `/proyecto/:id`. El
 * comportamiento en modo `'editor'` se verifica en
 * `bloques-modo-editor.test.tsx`.
 */

const PROYECTO: Proyecto = {
  id: 'proyecto-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Portafolio personal',
  descripcion: 'Sitio de portafolio personal',
  url_demo: null,
  url_repositorio: null,
  fecha_inicio: '2025-01-01',
  fecha_fin: null,
  estado: 'en_progreso',
  destacado: true,
  orden: 0,
  tecnologias: [],
  imagenes: [],
}

describe('BloqueProyectos (Fase 4.3, detalle en modal)', () => {
  it('click en la tarjeta abre el modal con el detalle del proyecto', async () => {
    const user = userEvent.setup()
    render(
      <ProveedorDetallePublico>
        <BloqueProyectos
          titulo="Proyectos"
          config={{ cantidad_a_mostrar: 3, solo_destacados: false }}
          proyectos={[PROYECTO]}
        />
      </ProveedorDetallePublico>,
    )

    expect(
      screen.queryByRole('heading', { name: 'Portafolio personal', level: 1 }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Portafolio personal' }))

    expect(
      screen.getByRole('heading', { name: 'Portafolio personal', level: 1 }),
    ).toBeInTheDocument()
  })
})
