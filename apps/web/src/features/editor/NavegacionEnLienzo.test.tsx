import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProveedorModoRenderizado } from '@/components/publico/contexto-renderizado'
import { sanearSlots } from '@/pages/admin/EditorSeccionesPage'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'
import { NavegacionEnLienzo } from './NavegacionEnLienzo'

/**
 * Fase 7 (7.3, UC-07): en el lienzo los enlaces de la navegación salen del
 * `content` actual de Puck (espejo en `useEditorSeccionesStore`), no del
 * snapshot publicado. Incluye una regresión de `sanearSlots` con los campos
 * base nuevos del contenedor `columnas`.
 */

function item(type: string, props: Record<string, unknown>) {
  return { type, props } as never
}

function renderLienzo(visible = true) {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo="editor">
        <NavegacionEnLienzo config={{}} visible={visible} perfil={null} />
      </ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('NavegacionEnLienzo', () => {
  beforeEach(() => {
    useEditorSeccionesStore.setState({ content: [] })
  })

  it('genera enlaces con las secciones del content: visibles, con título, sin hero ni navegacion', () => {
    useEditorSeccionesStore.setState({
      content: [
        item('navegacion', { id: 'n', _visible: true, _tituloVisible: 'Navegación' }),
        item('hero', { id: 'h', _seccionId: 'h', _visible: true, _tituloVisible: 'Portada' }),
        item('sobre-mi', { id: 'p1', _seccionId: 'guardada', _visible: true, _tituloVisible: 'Sobre mí' }),
        item('proyectos', { id: 'nuevo', _visible: true, _tituloVisible: 'Proyectos' }),
        item('logros', { id: 'l', _visible: false, _tituloVisible: 'Logros' }),
        item('skills', { id: 's', _visible: true, _tituloVisible: '  ' }),
      ],
    })
    renderLienzo()

    // En el lienzo los enlaces son inertes (`div role="link"`) pero siguen en la lista.
    const items = Array.from(document.querySelectorAll('nav ul:not(.hidden) li, nav ul li')).map(
      (li) => li.textContent,
    )
    expect(new Set(items)).toEqual(new Set(['Sobre mí', 'Proyectos']))
    expect(screen.queryByText('Portada')).not.toBeInTheDocument()
    expect(screen.queryByText('Logros')).not.toBeInTheDocument()
    expect(screen.queryByText('Navegación')).not.toBeInTheDocument()
  })

  it('se actualiza al cambiar el content antes de guardar', () => {
    renderLienzo()
    expect(screen.queryByText('Galería')).not.toBeInTheDocument()

    act(() => {
      useEditorSeccionesStore.setState({
        content: [item('galeria', { id: 'g', _visible: true, _tituloVisible: 'Galería' })],
      })
    })
    expect(screen.getByText('Galería')).toBeInTheDocument()
  })

  it('es sticky (seleccionable) y se atenúa cuando está oculta', () => {
    const { container } = renderLienzo(false)
    expect(screen.getByRole('navigation')).toHaveClass('sticky', 'top-0')
    expect(container.firstElementChild).toHaveClass('opacity-40')
  })
})

describe('sanearSlots — campos base de la Fase 7', () => {
  it('conserva animacion_entrada y separador_forma del contenedor columnas', () => {
    const resultado = sanearSlots({
      espaciado_vertical: 'normal',
      ancho_contenido: 'completo',
      alineacion_texto: 'izquierda',
      fondo_bloque: 'vidrio',
      separador_inferior: true,
      animacion_entrada: 'escalar',
      separador_forma: 'onda',
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [],
      columna_2: [],
      columna_3: [],
    })
    expect(resultado).toMatchObject({
      fondo_bloque: 'vidrio',
      animacion_entrada: 'escalar',
      separador_forma: 'onda',
    })
  })
})
