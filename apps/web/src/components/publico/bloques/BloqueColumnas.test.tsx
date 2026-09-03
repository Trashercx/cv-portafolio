import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ColumnasConfiguracion } from '@/features/secciones/types'
import type { DatosDespachoBloque } from './DespachoBloqueSeccion'
import { BloqueColumnas } from './BloqueColumnas'

/**
 * UC-17 (Fase 3.3): `BloqueColumnas` es el único responsable de decidir
 * cuántas columnas se ven — la `configuracion` siempre trae `columna_3`
 * presente (incluso con distribuciones de 2 columnas, ver
 * `ColumnasConfiguracion`), así que este es el punto que hay que probar: una
 * distribución de 2 columnas nunca debe pintar el contenido de `columna_3`
 * aunque tenga datos.
 */

const DATOS_VACIOS: DatosDespachoBloque = {
  perfil: null,
  proyectos: [],
  certificaciones: [],
  logros: [],
  redes_sociales: [],
  skills: [],
}

function construirConfig(
  distribucion: ColumnasConfiguracion['distribucion'],
): ColumnasConfiguracion {
  return {
    distribucion,
    alineacion_vertical: 'inicio',
    espaciado: 'normal',
    columna_1: [
      {
        tipo_seccion: 'contacto',
        titulo_visible: 'Columna Uno',
        visible: true,
        configuracion: { mostrar_formulario: false },
      },
    ],
    columna_2: [
      {
        tipo_seccion: 'contacto',
        titulo_visible: 'Columna Dos',
        visible: true,
        configuracion: { mostrar_formulario: false },
      },
    ],
    columna_3: [
      {
        tipo_seccion: 'contacto',
        titulo_visible: 'Columna Tres',
        visible: true,
        configuracion: { mostrar_formulario: false },
      },
    ],
  }
}

describe('BloqueColumnas (UC-17)', () => {
  it('con distribucion "1-1" no renderiza el contenido de columna_3 aunque tenga datos', () => {
    render(<BloqueColumnas config={construirConfig('1-1')} datos={DATOS_VACIOS} />)

    expect(screen.getByText('Columna Uno')).toBeInTheDocument()
    expect(screen.getByText('Columna Dos')).toBeInTheDocument()
    expect(screen.queryByText('Columna Tres')).not.toBeInTheDocument()
  })

  it('con distribucion "1-2" tampoco renderiza columna_3', () => {
    render(<BloqueColumnas config={construirConfig('1-2')} datos={DATOS_VACIOS} />)

    expect(screen.queryByText('Columna Tres')).not.toBeInTheDocument()
  })

  it('con distribucion "1-1-1" sí renderiza las 3 columnas', () => {
    render(<BloqueColumnas config={construirConfig('1-1-1')} datos={DATOS_VACIOS} />)

    expect(screen.getByText('Columna Uno')).toBeInTheDocument()
    expect(screen.getByText('Columna Dos')).toBeInTheDocument()
    expect(screen.getByText('Columna Tres')).toBeInTheDocument()
  })

  it('oculta un hijo con visible=false en modo público (soloVisibles=true, default) y lo muestra atenuado en la vista previa (soloVisibles=false)', () => {
    const config: ColumnasConfiguracion = {
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [
        {
          tipo_seccion: 'contacto',
          titulo_visible: 'Hijo oculto',
          visible: false,
          configuracion: { mostrar_formulario: false },
        },
      ],
      columna_2: [],
      columna_3: [],
    }

    const { unmount } = render(<BloqueColumnas config={config} datos={DATOS_VACIOS} />)
    expect(screen.queryByText('Hijo oculto')).not.toBeInTheDocument()
    unmount()

    render(<BloqueColumnas config={config} datos={DATOS_VACIOS} soloVisibles={false} />)
    expect(screen.getByText('Hijo oculto')).toBeInTheDocument()
    expect(screen.getByText('Oculta · no se publicará')).toBeInTheDocument()
  })
})
