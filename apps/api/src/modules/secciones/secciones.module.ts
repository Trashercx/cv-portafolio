import { Module } from '@nestjs/common';
import { SeccionesController } from './secciones.controller';
import { SeccionesService } from './secciones.service';

@Module({
  controllers: [SeccionesController],
  providers: [SeccionesService],
})
export class SeccionesModule {}
