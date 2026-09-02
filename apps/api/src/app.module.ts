import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CertificacionesModule } from './modules/certificaciones/certificaciones.module';
import { FondoSitioModule } from './modules/fondo-sitio/fondo-sitio.module';
import { LogrosModule } from './modules/logros/logros.module';
import { MediaModule } from './modules/media/media.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { ProyectosModule } from './modules/proyectos/proyectos.module';
import { PublicoModule } from './modules/publico/publico.module';
import { RedesSocialesModule } from './modules/redes-sociales/redes-sociales.module';
import { SeccionesModule } from './modules/secciones/secciones.module';
import { SkillsModule } from './modules/skills/skills.module';
import { TecnologiasModule } from './modules/tecnologias/tecnologias.module';
import { TemaModule } from './modules/tema/tema.module';
import { VersionesSitioModule } from './modules/versiones-sitio/versiones-sitio.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MediaModule,
    PerfilModule,
    ProyectosModule,
    TecnologiasModule,
    CertificacionesModule,
    LogrosModule,
    RedesSocialesModule,
    SeccionesModule,
    TemaModule,
    SkillsModule,
    FondoSitioModule,
    VersionesSitioModule,
    PublicoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
