import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EnvoltorioSeccion } from './EnvoltorioSeccion'

/**
 * Fase 3.4 (personalización visual por bloque): `EnvoltorioSeccion` es el
 * único lugar que compone las clases de `escalas-bloque.ts` a partir de
 * `BloqueConfiguracionBase` — este archivo cubre que cada combinación
 * produzca la clase esperada, y que sin ninguna prop use el default genérico
 * documentado en `escalas-bloque.ts` (`'normal'`/`max-w-5xl`, `'ninguno'`,
 * `border-b`).
 *
 * OJO: ese default genérico es el que corresponde a los bloques que YA eran
 * `max-w-5xl` antes de esta fase (`proyectos`, `certificaciones`, `skills`).
 * `hero`/`columnas` (`'completo'`) y `sobre-mi`/`logros`/`contacto`
 * (`'estrecho'`) tenían un ancho distinto hardcodeado — cada uno de esos 5
 * pasa su propio fallback explícito a `EnvoltorioSeccion` en vez de dejarla
 * caer en este default genérico (ver el comentario junto a cada
 * `ancho_contenido ?? '...'` en `puck-config.tsx`/`RenderizadorSecciones.tsx`
 * — no se prueba acá, sino en los tests de esos archivos).
 */
describe('EnvoltorioSeccion (Fase 3.4)', () => {
  it('sin ninguna prop de configuración usa el default genérico (aspecto que ya tenían proyectos/certificaciones/skills)', () => {
    render(
      <EnvoltorioSeccion visible id="seccion-1">
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    const section = document.getElementById('seccion-1') as HTMLElement
    expect(section).toHaveClass('px-6', 'py-12', 'border-b')
    expect(section).not.toHaveClass('bg-muted/30', 'bg-card')

    const divInterno = section.querySelector(':scope > div')
    expect(divInterno).toHaveClass('mx-auto', 'max-w-5xl')
  })

  it('aplica espaciado_vertical, ancho_contenido y fondo_bloque a las clases correctas', () => {
    render(
      <EnvoltorioSeccion
        visible
        id="seccion-2"
        espaciado_vertical="amplio"
        ancho_contenido="completo"
        fondo_bloque="tarjeta"
      >
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    const section = document.getElementById('seccion-2') as HTMLElement
    expect(section).toHaveClass('py-20', 'bg-card', 'border', 'rounded-xl')

    const divInterno = section.querySelector(':scope > div')
    expect(divInterno).toHaveClass('mx-auto', 'max-w-none')
  })

  it('separador_inferior=false quita el borde inferior', () => {
    render(
      <EnvoltorioSeccion visible id="seccion-3" separador_inferior={false}>
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    const section = document.getElementById('seccion-3') as HTMLElement
    expect(section).not.toHaveClass('border-b')
  })

  it('una sección oculta (visible=false) sigue mostrando el aviso "Oculta" y queda atenuada', () => {
    render(
      <EnvoltorioSeccion visible={false} id="seccion-4">
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    expect(screen.getByText('Oculta · no se publicará')).toBeInTheDocument()
    const section = document.getElementById('seccion-4') as HTMLElement
    expect(section).toHaveClass('opacity-40', 'border-dashed')
  })
})
