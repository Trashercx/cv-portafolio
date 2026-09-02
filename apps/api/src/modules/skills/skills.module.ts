import { Module } from '@nestjs/common';
import { SkillsAdminController } from './skills-admin.controller';
import { SkillsService } from './skills.service';

/**
 * Sin controlador público propio: los skills del visitante se sirven como
 * parte del snapshot en `GET /sitio` (`PublicoModule`), nunca contra esta
 * tabla en vivo (mismo patrón que `LogrosModule`).
 */
@Module({
  controllers: [SkillsAdminController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
