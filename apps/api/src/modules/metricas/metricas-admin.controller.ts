import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MetricasQueryDto } from './dto/metricas-query.dto';
import { MetricasService } from './metricas.service';

/** Fase 8, UC-27 (Ver métricas de visitas) — administración, detrás de JwtAuthGuard. */
@UseGuards(JwtAuthGuard)
@Controller('admin/metricas')
export class MetricasAdminController {
  constructor(private readonly metricasService: MetricasService) {}

  @Get()
  async obtener(@Query() query: MetricasQueryDto) {
    return this.metricasService.obtener(query.periodo);
  }
}
