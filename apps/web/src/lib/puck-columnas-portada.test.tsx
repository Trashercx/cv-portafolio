import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useEnColumna } from '@/components/publico/contexto-renderizado'
import type { MetadataEditor } from '@/features/editor/useDatosEditor'
import { puckConfig } from './puck-config'

/**
 * Fase 7j (UC-17): el render de `columnas` en Puck envuelve cada slot en
 * `ProveedorEnColumna`, así que lo que Puck pinte dentro (la portada
 * incluida, con el `render` real de `hero`) sabe que está en una columna.
 * Montar `<Puck>` entero no es viable en jsdom (ver
 * `hero-imagen-fondo-repro.test.tsx`): se simula cada slot con un componente.
 */
const DATOS: MetadataEditor['datos'] = {
  perfil: null,
  tema: null,
  proyectos: [],
  certificaciones: [],
  logros: [],
  redes_sociales: [],
  skills: [],
  fondo: null,
  mediaPorId: {},
}

function Sonda({ nombre }: { nombre: string }) {
  return <p>{`${nombre}: ${useEnColumna() ? 'en columna' : 'fuera'}`}</p>
}

const BASE = {
  distribucion: '1-1-1',
  alineacion_vertical: 'inicio',
  espaciado: 'normal',
  _visible: true,
  _tituloVisible: 'Columnas',
  _seccionId: 'seccion-1',
  puck: { metadata: { datos: DATOS } },
}

describe('Puck: columnas proveen el contexto a sus slots (Fase 7j)', () => {
  it('cada slot ve useEnColumna() === true; fuera no', () => {
    const props = {
      ...BASE,
      columna_1: () => <Sonda nombre="c1" />,
      columna_2: () => <Sonda nombre="c2" />,
      columna_3: () => <Sonda nombre="c3" />,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    render(
      <>
        {puckConfig.components.columnas.render(props)}
        <Sonda nombre="afuera" />
      </>,
    )
    expect(screen.getByText('c1: en columna')).toBeInTheDocument()
    expect(screen.getByText('c3: en columna')).toBeInTheDocument()
    expect(screen.getByText('afuera: fuera')).toBeInTheDocument()
  })

  it('la portada real dentro de un slot se pinta compacta', () => {
    const portada = {
      titulo: 'Hola',
      subtitulo: 'Sub',
      tamano_titulo: 'grande',
      altura: 'pantalla_completa',
      _visible: true,
      _tituloVisible: 'Portada',
      _seccionId: 'hijo',
      puck: { metadata: { datos: DATOS } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const props = {
      ...BASE,
      distribucion: '1-1',
      columna_1: () => puckConfig.components.hero.render(portada),
      columna_2: () => null,
      columna_3: () => null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    const { container } = render(<MemoryRouter>{puckConfig.components.columnas.render(props)}</MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Hola', level: 2 })).toHaveClass('text-4xl')
    expect(container.querySelector('.min-h-screen')).not.toBeInTheDocument()
  })
})
