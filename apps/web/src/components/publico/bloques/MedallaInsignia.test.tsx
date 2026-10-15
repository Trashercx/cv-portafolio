import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { InsigniaPublica } from '@/features/insignias/types'
import { simularMovimientoReducido } from '@/test/movimiento'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueInsignias } from './BloqueInsignias'

/** Fase 7h, UC-35: insignias como medallas animadas y clicables. */

function crearInsignia(n: number, extra: Partial<InsigniaPublica> = {}): InsigniaPublica {
  return {
    id: `ins-${n}`,
    nombre: `Insignia ${n}`,
    emisor: `Emisor ${n}`,
    descripcion: null,
    proveedor: 'credly',
    url_verificacion: `https://www.credly.com/badges/${n}`,
    fecha_emision: '2025-03-10',
    fecha_expiracion: null,
    habilidades: ['AWS'],
    orden: n,
    imagen: {
      id: `media-${n}`,
      url: `https://cdn.example.com/insignia-${n}.png`,
      s3_key: `insignias/abc/insignia-${n}.png`,
      tipo: 'imagen',
      ancho: 600,
      alto: 600,
      alt_text: null,
      created_at: '2026-01-01T00:00:00.000Z',
      variantes: [],
    },
    ...extra,
  }
}

const INSIGNIAS = [crearInsignia(1), crearInsignia(2)]

describe('BloqueInsignias como medallas (Fase 7h, UC-35)', () => {
  afterEach(() => simularMovimientoReducido(false))

  it('sin `estilo` pinta medallas: sin emisor, fechas ni habilidades a la vista', () => {
    const { container } = render(<BloqueInsignias titulo="Insignias" config={{}} insignias={INSIGNIAS} />)

    expect(container.querySelector('[data-estilo-insignias="medalla"]')).toBeInTheDocument()
    expect(screen.queryByText('Emisor 1')).not.toBeInTheDocument()
    expect(screen.queryByText(/Emitida/)).not.toBeInTheDocument()
    expect(screen.queryByText('AWS')).not.toBeInTheDocument()
    expect(screen.queryByText('Verificar')).not.toBeInTheDocument()
  })

  it('toda la medalla es un enlace a la verificación con nombre y emisor accesibles', () => {
    render(<BloqueInsignias titulo="Insignias" config={{}} insignias={INSIGNIAS} />)

    const enlace = screen.getByRole('link', { name: /Insignia 1, emitida por Emisor 1/ })
    expect(enlace).toHaveAttribute('href', 'https://www.credly.com/badges/1')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
    expect(enlace).toHaveAccessibleName(/se abre en una pestaña nueva/)
    // La imagen es decorativa dentro del enlace: el nombre lo da el enlace.
    expect(enlace.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('sin URL segura o con `mostrar_enlace` apagado no hay enlace', () => {
    const { rerender } = render(
      <BloqueInsignias
        titulo="Insignias"
        config={{}}
        insignias={[crearInsignia(1, { url_verificacion: 'javascript:alert(1)' })]}
      />,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Insignia 1/ })).toBeInTheDocument()

    rerender(<BloqueInsignias titulo="Insignias" config={{ mostrar_enlace: false }} insignias={INSIGNIAS} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('en el lienzo del editor no navega, pero conserva el movimiento', () => {
    const { container } = render(
      <ProveedorModoRenderizado modo="editor">
        <BloqueInsignias titulo="Insignias" config={{}} insignias={INSIGNIAS} />
      </ProveedorModoRenderizado>,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('[data-sin-navegacion="true"]')).toBeInTheDocument()
    expect(container.querySelector('.medalla-flotar')).toBeInTheDocument()
  })

  it.each([
    ['flotar', '.medalla-flotar'],
    ['balanceo', '.medalla-balanceo'],
    ['destello', '[data-destello]'],
  ] as const)('animacion_reposo=%s aplica su animación', (animacion_reposo, selector) => {
    const { container } = render(
      <BloqueInsignias titulo="Insignias" config={{ animacion_reposo }} insignias={INSIGNIAS} />,
    )
    expect(container.querySelector(selector)).toBeInTheDocument()
  })

  it('desfasa el ciclo de cada medalla con --retardo-medalla', () => {
    render(<BloqueInsignias titulo="Insignias" config={{}} insignias={INSIGNIAS} />)
    const [a, b] = screen.getAllByRole('link')
    expect(a.style.getPropertyValue('--retardo-medalla')).toBe('0.00s')
    expect(b.style.getPropertyValue('--retardo-medalla')).toBe('-0.73s')
  })

  it.each(['halo', 'aro', 'cinta'] as const)('marco_medalla=%s pinta su decoración', (marco_medalla) => {
    const { container } = render(
      <BloqueInsignias titulo="Insignias" config={{ marco_medalla }} insignias={[INSIGNIAS[0]]} />,
    )
    expect(container.querySelector(`[data-marco="${marco_medalla}"]`)).toBeInTheDocument()
  })

  it('etiqueta_medalla controla cuándo se ve el nombre', () => {
    const { container, rerender } = render(
      <BloqueInsignias titulo="Insignias" config={{}} insignias={[INSIGNIAS[0]]} />,
    )
    const alPasar = container.querySelector('[data-etiqueta="al_pasar"]')
    expect(alPasar).toHaveClass('opacity-0')
    expect(alPasar!.className).toContain('[@media(hover:none)]:opacity-100')

    rerender(
      <BloqueInsignias titulo="Insignias" config={{ etiqueta_medalla: 'siempre' }} insignias={[INSIGNIAS[0]]} />,
    )
    expect(container.querySelector('[data-etiqueta="siempre"]')).not.toHaveClass('opacity-0')

    rerender(
      <BloqueInsignias titulo="Insignias" config={{ etiqueta_medalla: 'nunca' }} insignias={[INSIGNIAS[0]]} />,
    )
    expect(container.querySelector('[data-etiqueta]')).not.toBeInTheDocument()
  })

  it('inclinar_brillo inclina la medalla siguiendo al puntero y vuelve al salir', () => {
    const { container } = render(<BloqueInsignias titulo="Insignias" config={{}} insignias={[INSIGNIAS[0]]} />)
    const disco = container.querySelector('[data-efecto-medalla="inclinar_brillo"]') as HTMLElement
    disco.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }) as DOMRect

    fireEvent.pointerMove(disco, { clientX: 100, clientY: 0 })
    expect(disco.style.getPropertyValue('--ry')).toBe('11.0deg')
    expect(disco.style.getPropertyValue('--rx')).toBe('11.0deg')

    fireEvent.pointerLeave(disco)
    expect(disco.style.getPropertyValue('--ry')).toBe('')
  })

  it('girar usa el giro de moneda al pasar o enfocar', () => {
    const { container } = render(
      <BloqueInsignias titulo="Insignias" config={{ efecto_hover: 'girar' }} insignias={[INSIGNIAS[0]]} />,
    )
    const disco = container.querySelector('[data-efecto-medalla="girar"]') as HTMLElement
    expect(disco.className).toContain('group-hover/medalla:[transform:rotateY(360deg)]')
    expect(disco.className).toContain('group-focus-visible/medalla:[transform:rotateY(360deg)]')
  })

  it('con movimiento reducido quedan quietas, sin destello ni inclinación', () => {
    simularMovimientoReducido(true)
    const { container } = render(
      <BloqueInsignias titulo="Insignias" config={{ animacion_reposo: 'destello' }} insignias={INSIGNIAS} />,
    )
    expect(container.querySelector('.medalla-flotar')).not.toBeInTheDocument()
    expect(container.querySelector('[data-destello]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-brillo]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-efecto-medalla="ninguno"]')).toBeInTheDocument()
    // Sigue siendo un enlace.
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('columnas numéricas usan la rejilla literal centrada', () => {
    const { container } = render(
      <BloqueInsignias titulo="Insignias" config={{ columnas: 4, tamano: 'grande' }} insignias={INSIGNIAS} />,
    )
    const lista = container.querySelector('ul')!
    expect(lista).toHaveClass('lg:grid-cols-4')
    expect(lista).toHaveClass('justify-items-center')
    expect(container.querySelector('[data-efecto-medalla]')).toHaveClass('size-52')
  })

  it('en el editor sin insignias muestra "Sin insignias"', () => {
    render(
      <ProveedorModoRenderizado modo="editor">
        <BloqueInsignias titulo="Insignias" config={{}} insignias={[]} />
      </ProveedorModoRenderizado>,
    )
    expect(screen.getByText('Sin insignias')).toBeInTheDocument()
  })
})
