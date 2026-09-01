import { Module } from '@nestjs/common';
import { ProyectosAdminController } from './proyectos-admin.controller';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';

@Module({
  controllers: [ProyectosController, ProyectosAdminController],
  providers: [ProyectosService],
})
export class ProyectosModule {}
