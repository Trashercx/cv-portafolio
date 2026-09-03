import { describe, expect, it } from 'vitest'
import type { Seccion } from '@/features/secciones/types'
import { sanearSlots, seccionesAContenidoInicial } from './EditorSeccionesPage'

/**
 * UC-17 (Fase 3.3, columnas): pruebas unitarias de las dos funciones de
 * conversión entre la forma "en edición" del lienzo de Puck (`ComponentData[]`
 * reales, con `id`/`_seccionId`/`_visible`/`_tituloVisible`) y la forma
 * persistida en el backend (`BloqueColumnaHijo[]`, sin `id` propio) — ver
 * contrato en `docs/plan-portafolio.md` §4. Se prueban por separado del resto
 * de `EditorSeccionesPage.test.tsx` (que sí monta el componente completo)
 * porque acá no hace falta renderizar nada: son funciones puras.
 */

describe('sanearSlots (UC-17)', () => {
  it('un hijo de columna con _seccionId (arrastrado desde una sección existente de nivel superior) lo pierde al sanear', () => {
    const configuracion = {
      distribucion: '1-1' as const,
      alineacion_vertical: 'inicio' as const,
      espaciado: 'normal' as const,
      columna_1: [
        {
          type: 'sobre-mi',
          props: {
            id: 'puck-id-1',
            _seccionId: 'seccion-existente',
            _visible: true,
            _tituloVisible: 'Sobre mí',
            mostrar_foto: true,
          },
        },
      ],
      columna_2: [],
      columna_3: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const resultado = sanearSlots(configuracion)

    expect(resultado.columna_1).toEqual([
      {
        tipo_seccion: 'sobre-mi',
        titulo_visible: 'Sobre mí',
        visible: true,
        configuracion: { mostrar_foto: true },
      },
    ])
    // Ni `id` ni `_seccionId` sobreviven al saneo.
    expect(resultado.columna_1[0]).not.toHaveProperty('id')
    expect(resultado.columna_1[0]).not.toHaveProperty('_seccionId')
  })

  it('un hijo de columna sin _seccionId (bloque nuevo, nunca fue fila propia) queda igual salvo el descarte del id', () => {
    const configuracion = {
      distribucion: '1-1-1' as const,
      alineacion_vertical: 'centro' as const,
      espaciado: 'amplio' as const,
      columna_1: [],
      columna_2: [
        {
          type: 'proyectos',
          props: {
            id: 'temp-puck-id',
            _visible: false,
            _tituloVisible: 'Proyectos',
            cantidad_a_mostrar: 3,
            solo_destacados: true,
          },
        },
      ],
      columna_3: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const resultado = sanearSlots(configuracion)

    expect(resultado).toEqual({
      distribucion: '1-1-1',
      alineacion_vertical: 'centro',
      espaciado: 'amplio',
      columna_1: [],
      columna_2: [
        {
          tipo_seccion: 'proyectos',
          titulo_visible: 'Proyectos',
          visible: false,
          configuracion: { cantidad_a_mostrar: 3, solo_destacados: true },
        },
      ],
      columna_3: [],
    })
  })

  it('columna_3 vacía se sanea a un array vacío, no a undefined', () => {
    const configuracion = {
      distribucion: '1-1' as const,
      alineacion_vertical: 'inicio' as const,
      espaciado: 'normal' as const,
      columna_1: [],
      columna_2: [],
      columna_3: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    expect(sanearSlots(configuracion).columna_3).toEqual([])
  })
})

describe('seccionesAContenidoInicial — Seccion tipo_seccion=columnas (UC-17)', () => {
  const SECCION_COLUMNAS: Seccion = {
    id: 'seccion-columnas-1',
    usuario_admin_id: 'admin-1',
    tipo_seccion: 'columnas',
    titulo_visible: 'Columnas',
    orden: 0,
    visible: true,
    configuracion: {
      distribucion: '1-2',
      alineacion_vertical: 'centro',
      espaciado: 'compacto',
      columna_1: [
        {
          tipo_seccion: 'logros',
          titulo_visible: 'Mis logros',
          visible: true,
          configuracion: {},
        },
      ],
      columna_2: [
        {
          tipo_seccion: 'contacto',
          titulo_visible: 'Escríbeme',
          visible: false,
          configuracion: { mostrar_formulario: true },
        },
      ],
      columna_3: [],
    },
  }

  it('reconstruye los hijos de cada columna como ComponentData con un id nuevo generado y _visible/_tituloVisible correctos', () => {
    const [item] = seccionesAContenidoInicial([SECCION_COLUMNAS])

    expect(item.type).toBe('columnas')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = item.props as any
    expect(props.distribucion).toBe('1-2')
    expect(props.columna_1).toHaveLength(1)
    expect(props.columna_2).toHaveLength(1)
    expect(props.columna_3).toEqual([])

    const hijoLogros = props.columna_1[0]
    expect(hijoLogros.type).toBe('logros')
    expect(typeof hijoLogros.props.id).toBe('string')
    expect(hijoLogros.props.id.length).toBeGreaterThan(0)
    expect(hijoLogros.props._visible).toBe(true)
    expect(hijoLogros.props._tituloVisible).toBe('Mis logros')
    // Un hijo de columna nunca fue una fila propia: no debe traer `_seccionId`.
    expect(hijoLogros.props._seccionId).toBeUndefined()

    const hijoContacto = props.columna_2[0]
    expect(hijoContacto.type).toBe('contacto')
    expect(hijoContacto.props._visible).toBe(false)
    expect(hijoContacto.props._tituloVisible).toBe('Escríbeme')
    expect(hijoContacto.props.mostrar_formulario).toBe(true)
  })

  it('genera un id distinto por hijo en cada carga (no reutiliza uno fijo)', () => {
    const [primeraCarga] = seccionesAContenidoInicial([SECCION_COLUMNAS])
    const [segundaCarga] = seccionesAContenidoInicial([SECCION_COLUMNAS])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idPrimera = (primeraCarga.props as any).columna_1[0].props.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idSegunda = (segundaCarga.props as any).columna_1[0].props.id

    expect(idPrimera).not.toBe(idSegunda)
  })

  it('la propia fila columnas conserva su id/_seccionId de nivel superior (igual que cualquier otra sección)', () => {
    const [item] = seccionesAContenidoInicial([SECCION_COLUMNAS])

    expect(item.props.id).toBe('seccion-columnas-1')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((item.props as any)._seccionId).toBe('seccion-columnas-1')
  })
})
