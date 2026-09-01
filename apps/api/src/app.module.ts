import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CertificacionesModule } from './modules/certificaciones/certificaciones.module';
import { LogrosModule } from './modules/logros/logros.module';
import { MediaModule } from './modules/media/media.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { ProyectosModule } from './modules/proyectos/proyectos.module';
import { RedesSocialesModule } from './modules/redes-sociales/redes-sociales.module';
import { TecnologiasModule } from './modules/tecnologias/tecnologias.module';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
