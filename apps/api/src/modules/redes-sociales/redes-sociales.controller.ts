import { Controller, Get } from '@nestjs/common';
import { RedesSocialesService } from './redes-sociales.service';

/** UC-06 (Gestionar enlaces de redes) — vista de visitante, pública. */
@Controller('redes')
export class RedesSocialesController {
  constructor(private readonly redesSocialesService: RedesSocialesService) {}

  @Get()
  async listar() {
    return this.redesSocialesService.listar();
  }
}
