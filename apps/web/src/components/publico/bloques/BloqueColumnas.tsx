import type {
  AlineacionVerticalColumnas,
  BloqueColumnaHijo,
  ColumnasConfiguracion,
  DistribucionColumnas,
  EspaciadoColumnas,
} from '@/features/secciones/types'
import { DespachoBloqueSeccion, type DatosDespachoBloque } from './DespachoBloqueSeccion'

// Clases Tailwind literales (nunca construidas en runtime concatenando
// fragmentos dinámicos) — mismo criterio que exige `puck-config.tsx` para su
// versión editable de este mismo layout. `grid-cols-1` en mobile: apila las
// columnas en pantallas angostas, mismo patrón responsive que ya usan
// `BloqueSobreMi`/`BloqueProyectos` (`sm:grid-cols-*`).
const GRID_COLS_POR_DISTRIBUCION: Record<DistribucionColumnas, string> = {
  '1-1': 'grid-cols-1 sm:grid-cols-2',
  '1-2': 'grid-cols-1 sm:grid-cols-[1fr_2fr]',
  '2-1': 'grid-cols-1 sm:grid-cols-[2fr_1fr]',
  '1-1-1': 'grid-cols-1 sm:grid-cols-3',
}

const ALINEACION_VERTICAL_CLASE: Record<AlineacionVerticalColumnas, string> = {
  inicio: 'items-start',
  centro: 'items-center',
  fin: 'items-end',
  estirado: 'items-stretch',
}

const ESPACIADO_CLASE: Record<EspaciadoColumnas, string> = {
  compacto: 'gap-4',
  normal: 'gap-8',
  amplio: 'gap-12',
}

type BloqueColumnasProps = {
  config: ColumnasConfiguracion
  datos: DatosDespachoBloque
  /**
   * `true` (por defecto) en el sitio público: los bloques hijo con
   * `visible=false` se ocultan por completo. `false` en la vista previa del
   * panel: se muestran atenuados con el mismo aviso "Oculta" que usa
   * `EnvoltorioSeccion` a nivel superior — mismo criterio que la prop
   * homónima de `RenderizadorSecciones`, propagado hacia dentro del
   * contenedor.
   */
  soloVisibles?: boolean
}

/**
 * Bloque `columnas` (UC-17): renderiza los bloques hijo de cada columna con
 * el mismo `DespachoBloqueSeccion` que usa `RenderizadorSecciones` a nivel
 * superior, compartido entre el sitio público y la vista previa del panel
 * (`PanelVersiones`, vía `RenderizadorSecciones`). El lienzo del editor de
 * Puck NO pasa por este componente: `puck-config.tsx` monta cada bloque hijo
 * directamente vía las zonas de slot de Puck (drag-and-drop en vivo), no a
 * partir de `ColumnasConfiguracion` ya serializada.
 */
export function BloqueColumnas({ config, datos, soloVisibles = true }: BloqueColumnasProps) {
  const tresColumnas = config.distribucion === '1-1-1'

  return (
    <div
      className={`grid ${GRID_COLS_POR_DISTRIBUCION[config.distribucion]} ${ALINEACION_VERTICAL_CLASE[config.alineacion_vertical]} ${ESPACIADO_CLASE[config.espaciado]}`}
    >
      <ColumnaHijos hijos={config.columna_1} datos={datos} soloVisibles={soloVisibles} />
      <ColumnaHijos hijos={config.columna_2} datos={datos} soloVisibles={soloVisibles} />
      {tresColumnas ? (
        <ColumnaHijos hijos={config.columna_3} datos={datos} soloVisibles={soloVisibles} />
      ) : null}
    </div>
  )
}

function ColumnaHijos({
  hijos,
  datos,
  soloVisibles,
}: {
  hijos: BloqueColumnaHijo[]
  datos: DatosDespachoBloque
  soloVisibles: boolean
}) {
  return (
    <div className="grid gap-6">
      {hijos.map((hijo, index) => {
        if (soloVisibles && !hijo.visible) return null

        return (
          <div
            // Los hijos de columna no tienen `id` propio (nunca fueron filas,
            // ver `BloqueColumnaHijo`) — la posición dentro del array es
            // estable para esta lista de solo lectura.
            key={`${hijo.tipo_seccion}-${index}`}
            className={hijo.visible ? undefined : 'opacity-40'}
          >
            {!hijo.visible ? (
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Oculta · no se publicará
              </p>
            ) : null}
            <DespachoBloqueSeccion
              tipo_seccion={hijo.tipo_seccion}
              titulo_visible={hijo.titulo_visible}
              configuracion={hijo.configuracion}
              datos={datos}
            />
          </div>
        )
      })}
    </div>
  )
}
