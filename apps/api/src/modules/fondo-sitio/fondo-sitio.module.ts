import { Module } from '@nestjs/common';
import { FondoSitioController } from './fondo-sitio.controller';
import { FondoSitioService } from './fondo-sitio.service';

@Module({
  controllers: [FondoSitioController],
  providers: [FondoSitioService],
  exports: [FondoSitioService],
})
export class FondoSitioModule {}
