import { Module } from '@nestjs/common';
import { CertificacionesAdminController } from './certificaciones-admin.controller';
import { CertificacionesController } from './certificaciones.controller';
import { CertificacionesService } from './certificaciones.service';

@Module({
  controllers: [CertificacionesController, CertificacionesAdminController],
  providers: [CertificacionesService],
})
export class CertificacionesModule {}
