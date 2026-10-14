import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { InsigniaPublica } from '@/features/insignias/types'
import { simularMovimientoReducido } from '@/test/movimiento'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueInsignias } from './BloqueInsignias'
import { DespachoBloqueSeccion } from './DespachoBloqueSeccion'

/** Fase 7d, UC-35: efectos, límite, `mostrar_*`, movimiento reducido y snapshots sin `insignias`. */

function crearInsignia(n: number, extra: Partial<InsigniaPublica> = {}): InsigniaPublica {
  return {
    id: `ins-${n}`,
    usuario_admin_id: 'admin-1',
    nombre: `Insignia ${n}`,
    emisor: `Emisor ${n}`,
    descripcion: null,
    proveedor: 'credly',
    id_externo: null,
    url_verificacion: `https://www.credly.com/badges/${n}`,
    url_origen: null,
    imagen_media_id: `media-${n}`,
    fecha_emision: '2025-03-10',
    fecha_expiracion: null,
    habilidades: ['AWS', 'Cloud'],
    orden: n,
    visible: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    imagen: {
      id: `media-${n}`,
      url: `https://cdn.example.com/insignia-${n}.png`,
      s3_key: `insignias/insignia-${n}.png`,
      tipo: 'imagen',
      ancho: 600,
      alto: 600,
      alt_text: null,
      created_at: '2026-01-01T00:00:00.000Z',
      variantes: [
        { formato: 'webp', ancho: 320, alto: 320, url: `https://cdn.example.com/i${n}-320.webp` },
        { formato: 'webp', ancho: 640, alto: 640, url: `https://cdn.example.com/i${n}-640.webp` },
      ],
    },
    ...extra,
  }
}

const INSIGNIAS = [crearInsignia(1), crearInsignia(2), crearInsignia(3)]

describe('BloqueInsignias (Fase 7d, UC-35)', () => {
  it('pinta nombre, emisor y fecha por defecto y no muestra las habilidades', () => {
    render(<BloqueInsignias titulo="Insignias" config={{}} insignias={INSIGNIAS} />)

    expect(screen.getByRole('heading', { name: 'Insignias', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Insignia 1')).toBeInTheDocument()
    expect(screen.getByText('Emisor 1')).toBeInTheDocument()
    expect(screen.getAllByText(/Emitida/)).toHaveLength(3)
    expect(screen.queryByText('AWS')).not.toBeInTheDocument()
  })

  it('imagen con ImagenResponsive: width/height, alt y sizes de `insignia`', () => {
    const { container } = render(
      <BloqueInsignias titulo="Insignias" config={{}} insignias={[INSIGNIAS[0]]} />,
    )

    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('width', '600')
    expect(img).toHaveAttribute('height', '600')
    expect(img).toHaveAttribute('alt', 'Insignia 1')
    expect(container.querySelector('source[type="image/webp"]')).toHaveAttribute(
      'sizes',
      SIZES_POR_CONTEXTO.insignia,
    )
  })

  it('respeta `limite` y el orden', () => {
    render(
      <BloqueInsignias
        titulo="Insignias"
        config={{ limite: 2 }}
        insignias={[INSIGNIAS[2], INSIGNIAS[0], INSIGNIAS[1]]}
      />,
    )

    const nombres = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(nombres).toEqual(['Insignia 1', 'Insignia 2'])
  })

  it('los `mostrar_*` apagan emisor, fecha y enlace, y encienden las habilidades', () => {
    const { rerender } = render(
      <BloqueInsignias
        titulo="Insignias"
        config={{ mostrar_emisor: false, mostrar_fecha: false, mostrar_enlace: false }}
        insignias={[INSIGNIAS[0]]}
      />,
    )
    expect(screen.queryByText('Emisor 1')).not.toBeInTheDocument()
    expect(screen.queryByText(/Emitida/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Verificar/ })).not.toBeInTheDocument()

    rerender(
      <BloqueInsignias
        titulo="Insignias"
        config={{ mostrar_habilidades: true }}
        insignias={[INSIGNIAS[0]]}
      />,
    )
    expect(screen.getByText('AWS')).toBeInTheDocument()
    expect(screen.getByText('Cloud')).toBeInTheDocument()
  })

  it('"Verificar" abre en pestaña nueva con rel noopener noreferrer y descarta URLs inseguras', () => {
    render(
      <BloqueInsignias
        titulo="Insignias"
        config={{}}
        insignias={[crearInsignia(1), crearInsignia(2, { url_verificacion: 'javascript:alert(1)' })]}
      />,
    )

    const enlaces = screen.getAllByRole('link', { name: /Verificar/ })
    expect(enlaces).toHaveLength(1)
    expect(enlaces[0]).toHaveAttribute('href', 'https://www.credly.com/badges/1')
    expect(enlaces[0]).toHaveAttribute('target', '_blank')
    expect(enlaces[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('usa la tabla literal de columnas y la de tamaño', () => {
    const { container, rerender } = render(
      <BloqueInsignias titulo="Insignias" config={{ columnas: 4, tamano: 'grande' }} insignias={INSIGNIAS} />,
    )
    expect(container.querySelector('ul')).toHaveClass('lg:grid-cols-4')
    expect(container.querySelector('img')).toHaveClass('size-52')

    rerender(<BloqueInsignias titulo="Insignias" config={{ tamano: 'compacto' }} insignias={INSIGNIAS} />)
    expect(container.querySelector('ul')!.className).toContain('auto-fill')
    expect(container.querySelector('img')).toHaveClass('size-24')
  })

  it('el título de la configuración tiene prioridad y admite subtítulo', () => {
    render(
      <BloqueInsignias
        titulo="Insignias"
        config={{ titulo: 'Mis credenciales', subtitulo: 'Verificables' }}
        insignias={INSIGNIAS}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Mis credenciales' })).toBeInTheDocument()
    expect(screen.getByText('Verificables')).toBeInTheDocument()
  })

  describe('efecto_hover', () => {
    it('inclinar_brillo (default) usa TarjetaInteractiva "inclinar" y el brillo especular', () => {
      const { container } = render(
        <BloqueInsignias titulo="Insignias" config={{}} insignias={[INSIGNIAS[0]]} />,
      )
      expect(container.querySelector('[data-efecto-hover="inclinar"]')).toBeInTheDocument()
      const brillo = container.querySelector('[data-brillo]')
      expect(brillo).toBeInTheDocument()
      expect(brillo!.className).toContain('--mx')
    })

    it('el brillo sigue al puntero fijando --mx/--my', () => {
      const { container } = render(
        <BloqueInsignias titulo="Insignias" config={{}} insignias={[INSIGNIAS[0]]} />,
      )
      const tarjeta = container.querySelector('.group\\/insignia') as HTMLElement
      tarjeta.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }) as DOMRect
      fireEvent.pointerMove(tarjeta, { clientX: 50, clientY: 25 })
      expect(tarjeta.style.getPropertyValue('--mx')).toBe('25%')
      expect(tarjeta.style.getPropertyValue('--my')).toBe('25%')
    })

    it('elevar usa la sombra y traslación de TarjetaInteractiva, sin brillo', () => {
      const { container } = render(
        <BloqueInsignias titulo="Insignias" config={{ efecto_hover: 'elevar' }} insignias={[INSIGNIAS[0]]} />,
      )
      expect(container.querySelector('[data-efecto-hover="elevar"]')).toBeInTheDocument()
      expect(container.querySelector('[data-brillo]')).not.toBeInTheDocument()
    })

    it('ninguno no aplica ningún efecto', () => {
      const { container } = render(
        <BloqueInsignias titulo="Insignias" config={{ efecto_hover: 'ninguno' }} insignias={[INSIGNIAS[0]]} />,
      )
      expect(container.querySelector('[data-efecto-hover="ninguno"]')).toBeInTheDocument()
      expect(container.querySelector('[data-brillo]')).not.toBeInTheDocument()
    })

    it('girar: volteo 3D con los detalles en la cara trasera', () => {
      const { container } = render(
        <BloqueInsignias
          titulo="Insignias"
          config={{ efecto_hover: 'girar', mostrar_habilidades: true }}
          insignias={[INSIGNIAS[0]]}
        />,
      )
      const giratoria = container.querySelector('[data-volteada]') as HTMLElement
      expect(giratoria.className).toContain('rotateY(180deg)')
      expect(giratoria.className).toContain('focus-within')
      // El emisor y las habilidades están en la cara trasera.
      expect(screen.getByText('Emisor 1').closest('[class*="backface-visibility"]')).toHaveClass(
        '[transform:rotateY(180deg)]',
      )
    })

    it('girar: el toque alterna el volteo solo en punteros sin hover', () => {
      const { container } = render(
        <BloqueInsignias titulo="Insignias" config={{ efecto_hover: 'girar' }} insignias={[INSIGNIAS[0]]} />,
      )
      const giratoria = container.querySelector('[data-volteada]') as HTMLElement

      fireEvent.click(giratoria)
      expect(giratoria).toHaveAttribute('data-volteada', 'false') // jsdom: hover disponible

      const original = window.matchMedia
      window.matchMedia = ((query: string) => ({
        matches: query === '(hover: none)',
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia
      fireEvent.click(giratoria)
      expect(giratoria).toHaveAttribute('data-volteada', 'true')
      fireEvent.click(giratoria)
      expect(giratoria).toHaveAttribute('data-volteada', 'false')
      window.matchMedia = original
    })
  })

  describe('prefers-reduced-motion', () => {
    it('desactiva el volteo, la inclinación y el brillo', () => {
      simularMovimientoReducido(true)
      const { container, unmount } = render(
        <BloqueInsignias titulo="Insignias" config={{ efecto_hover: 'girar' }} insignias={[INSIGNIAS[0]]} />,
      )
      expect(container.querySelector('[data-volteada]')).not.toBeInTheDocument()
      // Sin giro, el emisor queda visible en la tarjeta estática.
      expect(screen.getByText('Emisor 1')).toBeInTheDocument()
      unmount()

      const otro = render(
        <BloqueInsignias titulo="Insignias" config={{}} insignias={[INSIGNIAS[0]]} />,
      )
      expect(otro.container.querySelector('[data-brillo]')).not.toBeInTheDocument()
      // `TarjetaInteractiva` degrada `inclinar` a solo sombra: sin `transform` en línea.
      expect(otro.container.querySelector('[data-efecto-hover="inclinar"]')).not.toHaveAttribute('style')
    })
  })

  describe('sin insignias (snapshot anterior a la Fase 7d)', () => {
    it('en el sitio público no pinta nada y no falla', () => {
      const { container } = render(
        <DespachoBloqueSeccion
          tipo_seccion="insignias"
          titulo_visible="Insignias"
          configuracion={{}}
          datos={{
            perfil: null,
            proyectos: [],
            certificaciones: [],
            logros: [],
            redes_sociales: [],
            skills: [],
          }}
        />,
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('en el editor muestra "Sin insignias"', () => {
      render(
        <ProveedorModoRenderizado modo="editor">
          <BloqueInsignias titulo="Insignias" config={{}} insignias={[]} />
        </ProveedorModoRenderizado>,
      )
      expect(screen.getByText('Sin insignias')).toBeInTheDocument()
    })
  })
})
