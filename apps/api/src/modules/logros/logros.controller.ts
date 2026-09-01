import { Controller, Get } from '@nestjs/common';
import { LogrosService } from './logros.service';

/** UC-05 (Gestionar logros y reconocimientos) — vista de visitante, pública. */
@Controller('logros')
export class LogrosController {
  constructor(private readonly logrosService: LogrosService) {}

  @Get()
  async listar() {
    return this.logrosService.listar();
  }
}
