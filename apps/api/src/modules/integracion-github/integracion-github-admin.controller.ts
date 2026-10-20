import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertIntegracionGithubDto } from './dto/upsert-integracion-github.dto';
import { GithubSyncService } from './github-sync.service';
import { IntegracionGithubService } from './integracion-github.service';

/**
 * UC-36 (Fase 7l) — administración de la integración con GitHub, siempre tras
 * `JwtAuthGuard`.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/integraciones/github')
export class IntegracionGithubAdminController {
  constructor(
    private readonly integracionService: IntegracionGithubService,
    private readonly syncService: GithubSyncService,
  ) {}

  /**
   * La integración o el JSON `null`. Nest responde cuerpo vacío ante `null`,
   * así que se serializa a mano: el panel espera un JSON válido.
   */
  @Get()
  async obtener(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const integracion = await this.integracionService.obtener(req.user.sub);
    res.status(200).type('application/json').send(JSON.stringify(integracion));
  }

  @Put()
  async guardar(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpsertIntegracionGithubDto,
  ) {
    return this.integracionService.guardar(req.user.sub, dto);
  }

  /**
   * Hace peticiones salientes y gasta cuota de GitHub: límite estricto por IP
   * (6/min; `THROTTLE_GITHUB_LIMIT` lo ajusta en pruebas).
   */
  @Throttle({
    default: {
      limit: () => Number(process.env.THROTTLE_GITHUB_LIMIT ?? 6),
      ttl: 60_000,
    },
  })
  @Post('sincronizar')
  async sincronizar(@Req() req: AuthenticatedRequest) {
    return this.syncService.sincronizar(req.user.sub);
  }
}
