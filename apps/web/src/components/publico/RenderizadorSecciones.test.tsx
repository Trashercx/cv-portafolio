import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { PerfilPublico, SnapshotSitio } from '@/features/publico/types'
import type { Seccion } from '@/features/secciones/types'
import { RenderizadorSecciones } from './RenderizadorSecciones'

const PERFIL: PerfilPublico = {
  id: 'perfil-1',
  usuario_admin_id: 'admin-1',
  nombre_completo: 'Oscar Burga',
  titulo_profesional: 'Desarrollador',
  resumen_bio: 'Bio',
  imagen_perfil_id: null,
  cv_media_id: null,
  ubicacion: 'Lima, Perú',
  updated_at: '2026-01-01T00:00:00.000Z',
  imagen_perfil: null,
  cv_media: null,
}

function seccion(id: string, tipo_seccion: Seccion['tipo_seccion']): Seccion {
  const configuracionPorTipo: Record<string, unknown> = {
    hero: { titulo: 'Hola', subtitulo: 'Sub' },
    'sobre-mi': { mostrar_foto: false },
    logros: {},
    contacto: { mostrar_formulario: false },
    columnas: {
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [],
      columna_2: [],
      columna_3: [],
    },
    proyectos: { cantidad_a_mostrar: 3, solo_destacados: false },
    navegacion: {},
  }

  return {
    id,
    usuario_admin_id: 'admin-1',
    tipo_seccion,
    titulo_visible: tipo_seccion,
    orden: 0,
    visible: true,
    // No trae ninguno de los 5 campos de `BloqueConfiguracionBase`
    // (`espaciado_vertical`/`ancho_contenido`/etc.) — simula una `Seccion`
    // guardada antes de la Fase 3.4, el caso real que hay que preservar.
    configuracion: configuracionPorTipo[tipo_seccion] as never,
  }
}

function renderSnapshot(secciones: Seccion[]) {
  const snapshot: SnapshotSitio = {
    perfil: PERFIL,
    tema: null,
    secciones,
    proyectos: [],
    certificaciones: [],
    logros: [],
    redes_sociales: [],
    skills: [],
    fondo: null,
  }

  return render(
    <MemoryRouter>
      <RenderizadorSecciones snapshot={snapshot} />
    </MemoryRouter>,
  )
}

/**
 * Regresión (Fase 3.4): `hero`/`sobre-mi`/`logros`/`contacto`/`columnas` NO
 * eran `max-w-5xl` antes de esta fase (`hero`/`columnas` sin `max-w` en
 * absoluto, los otros 3 más angostos) — a diferencia de `proyectos`/
 * `certificaciones`/`skills`, que sí lo eran y por eso usan el default
 * genérico de `EnvoltorioSeccion` sin necesitar un fallback propio. Sin el
 * mapa `ANCHO_CONTENIDO_POR_DEFECTO_POR_TIPO`, publicar esta fase cambiaría
 * el ancho de esos 5 tipos en cualquier sitio ya existente (hallazgo de
 * `code-reviewer`, corregido acá).
 */
describe('RenderizadorSecciones — ancho_contenido por defecto cuando falta en la Seccion (Fase 3.4)', () => {
  it.each([
    ['hero', 'max-w-none'],
    ['columnas', 'max-w-none'],
    ['sobre-mi', 'max-w-2xl'],
    ['logros', 'max-w-2xl'],
    ['contacto', 'max-w-2xl'],
    ['proyectos', 'max-w-5xl'],
  ] as const)('%s sin ancho_contenido guardado usa %s (aspecto previo a esta fase)', (tipo, claseEsperada) => {
    renderSnapshot([seccion(tipo, tipo)])

    const section = document.getElementById(tipo) as HTMLElement
    const divInterno = section.querySelector(':scope > div')
    expect(divInterno).toHaveClass(claseEsperada)
  })
})

/**
 * Fase 7m (Lighthouse): las secciones bajo el pliegue se pintan con
 * `content-visibility: auto` (`diferirPintado`), a partir de la tercera con
 * contenido; la navegación no cuenta porque va `fixed` fuera del flujo.
 */
describe('RenderizadorSecciones — pintado diferido de las secciones bajo el pliegue (Fase 7m)', () => {
  it('difiere desde la tercera sección con contenido y nunca las dos primeras', () => {
    renderSnapshot([
      seccion('hero', 'hero'),
      seccion('sobre-mi', 'sobre-mi'),
      seccion('proyectos', 'proyectos'),
      seccion('contacto', 'contacto'),
    ])

    expect(document.getElementById('hero')).not.toHaveClass('[content-visibility:auto]')
    expect(document.getElementById('sobre-mi')).not.toHaveClass('[content-visibility:auto]')
    expect(document.getElementById('proyectos')).toHaveClass('[content-visibility:auto]')
    expect(document.getElementById('contacto')).toHaveClass('[content-visibility:auto]')
  })

  it('la navegación no cuenta como sección con contenido', () => {
    renderSnapshot([
      seccion('nav', 'navegacion'),
      seccion('hero', 'hero'),
      seccion('sobre-mi', 'sobre-mi'),
      seccion('proyectos', 'proyectos'),
    ])

    expect(document.getElementById('sobre-mi')).not.toHaveClass('[content-visibility:auto]')
    expect(document.getElementById('proyectos')).toHaveClass('[content-visibility:auto]')
  })
})
