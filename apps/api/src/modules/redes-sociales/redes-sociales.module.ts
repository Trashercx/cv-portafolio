import { Module } from '@nestjs/common';
import { PlataformasRedAdminController } from './plataformas-red-admin.controller';
import { PlataformasRedService } from './plataformas-red.service';
import { RedesSocialesAdminController } from './redes-sociales-admin.controller';
import { RedesSocialesController } from './redes-sociales.controller';
import { RedesSocialesService } from './redes-sociales.service';

@Module({
  controllers: [
    RedesSocialesController,
    RedesSocialesAdminController,
    PlataformasRedAdminController,
  ],
  providers: [RedesSocialesService, PlataformasRedService],
})
export class RedesSocialesModule {}
