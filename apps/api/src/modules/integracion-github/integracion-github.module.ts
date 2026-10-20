import { Module } from '@nestjs/common';
import { VersionesSitioModule } from '../versiones-sitio/versiones-sitio.module';
import { GithubSyncService } from './github-sync.service';
import { IntegracionGithubAdminController } from './integracion-github-admin.controller';
import { IntegracionGithubService } from './integracion-github.service';

/** UC-36 (Fase 7l): integración con GitHub, repos públicos como proyectos. */
@Module({
  imports: [VersionesSitioModule],
  controllers: [IntegracionGithubAdminController],
  providers: [IntegracionGithubService, GithubSyncService],
  exports: [GithubSyncService],
})
export class IntegracionGithubModule {}
