import { Module } from '@nestjs/common';
import { MetricasAdminController } from './metricas-admin.controller';
import { MetricasService } from './metricas.service';
import { UmamiClient } from './umami.client';

/** Fase 8, UC-27: proxy de métricas de Umami para el panel de administración. */
@Module({
  controllers: [MetricasAdminController],
  providers: [MetricasService, UmamiClient],
})
export class MetricasModule {}
