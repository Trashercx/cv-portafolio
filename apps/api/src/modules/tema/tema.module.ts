import { Module } from '@nestjs/common';
import { TemaController } from './tema.controller';
import { TemaService } from './tema.service';

@Module({
  controllers: [TemaController],
  providers: [TemaService],
})
export class TemaModule {}
