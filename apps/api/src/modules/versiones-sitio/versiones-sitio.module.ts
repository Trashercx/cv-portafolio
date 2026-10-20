import { Module } from '@nestjs/common';
import { CertificacionesModule } from '../certificaciones/certificaciones.module';
import { ExperienciasModule } from '../experiencias/experiencias.module';
import { FondoSitioModule } from '../fondo-sitio/fondo-sitio.module';
import { InsigniasModule } from '../insignias/insignias.module';
import { LogrosModule } from '../logros/logros.module';
import { PerfilModule } from '../perfil/perfil.module';
import { ProyectosModule } from '../proyectos/proyectos.module';
import { RedesSocialesModule } from '../redes-sociales/redes-sociales.module';
import { SeccionesModule } from '../secciones/secciones.module';
import { SkillsModule } from '../skills/skills.module';
import { TemaModule } from '../tema/tema.module';
import { VersionesSitioAdminController } from './versiones-sitio-admin.controller';
import { VersionesSitioService } from './versiones-sitio.service';

@Module({
  imports: [
    PerfilModule,
    SeccionesModule,
    TemaModule,
    ProyectosModule,
    CertificacionesModule,
    LogrosModule,
    RedesSocialesModule,
    SkillsModule,
    InsigniasModule,
    ExperienciasModule,
    FondoSitioModule,
  ],
  controllers: [VersionesSitioAdminController],
  providers: [VersionesSitioService],
  exports: [VersionesSitioService],
})
export class VersionesSitioModule {}
