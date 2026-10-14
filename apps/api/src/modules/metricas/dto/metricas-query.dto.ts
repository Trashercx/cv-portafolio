import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

/** Query de `GET /admin/metricas` (Fase 8, UC-27): periodo en días. */
export class MetricasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30, 90])
  periodo: number = 30;
}
