import { Module } from '@nestjs/common';
import { LogrosAdminController } from './logros-admin.controller';
import { LogrosController } from './logros.controller';
import { LogrosService } from './logros.service';

@Module({
  controllers: [LogrosController, LogrosAdminController],
  providers: [LogrosService],
})
export class LogrosModule {}
