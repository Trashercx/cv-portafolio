import { Module } from '@nestjs/common';
import { TecnologiasController } from './tecnologias.controller';
import { TecnologiasService } from './tecnologias.service';

@Module({
  controllers: [TecnologiasController],
  providers: [TecnologiasService],
  exports: [TecnologiasService],
})
export class TecnologiasModule {}
