import { IsArray, IsIn } from 'class-validator';
import { EsListaDeBloques } from '../../../../common/validators/es-lista-de-bloques.decorator';

/**
 * `configuracion` para `tipo_seccion = 'columnas'` (Fase 3.3/UC-17): el
 * contenedor de layout multi-columna del editor visual Puck. Decisión de
 * arquitectura (docs/plan-portafolio.md §4): el contenedor "Columnas" es una
 * `Seccion` más, cuya `configuracion` guarda los bloques anidados de cada
 * columna con la MISMA forma que tendrían como fila propia — no se agrega
 * ninguna entidad ni columna nueva.
 *
 * `columna_1`/`columna_2`/`columna_3` están SIEMPRE presentes (aunque
 * `distribucion` sea de 2 columnas y una quede vacía `[]`): el frontend
 * decide cuáles renderiza según `distribucion`.
 */
export class ColumnasConfiguracionDto {
  @IsIn(['1-1', '1-2', '2-1', '1-1-1'])
  distribucion: '1-1' | '1-2' | '2-1' | '1-1-1';

  @IsIn(['inicio', 'centro', 'fin', 'estirado'])
  alineacion_vertical: 'inicio' | 'centro' | 'fin' | 'estirado';

  @IsIn(['compacto', 'normal', 'amplio'])
  espaciado: 'compacto' | 'normal' | 'amplio';

  @IsArray()
  @EsListaDeBloques()
  columna_1: unknown[];

  @IsArray()
  @EsListaDeBloques()
  columna_2: unknown[];

  @IsArray()
  @EsListaDeBloques()
  columna_3: unknown[];
}
