import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { parseDurationToMs } from './parse-duration';

interface SesionResponseBody {
  email: string;
  nombre: string;
  expiresAt: string;
}

/**
 * UC-01 (Iniciar sesión / extender sesión).
 * `AuthController` no lleva guard a nivel de clase (a diferencia del resto de
 * los controladores `admin/*`): `POST /auth/login` es pública por definición
 * (es la que emite la sesión), y `POST /auth/refresh` protege su propia ruta
 * con `@UseGuards(JwtAuthGuard)` porque exige una cookie `access_token`
 * vigente para poder renovarla.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SesionResponseBody> {
    const { accessToken, admin, expiresAt } = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    // El token viaja en cookie httpOnly, nunca en el cuerpo de la respuesta
    // (decisión de arquitectura de docs/plan-tecnico.md, Sprint 0).
    this.setCookieAcceso(res, accessToken);

    return { ...admin, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Extiende la sesión activa: exige una cookie `access_token` todavía
   * válida (el guard responde 401 automáticamente si expiró o falta, sin
   * ninguna gracia para revivir una sesión ya vencida) y emite un token
   * nuevo con los mismos claims.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SesionResponseBody> {
    const { accessToken, admin, expiresAt } = await this.authService.refrescar(
      req.user.sub,
    );

    this.setCookieAcceso(res, accessToken);

    return { ...admin, expiresAt: expiresAt.toISOString() };
  }

  private setCookieAcceso(res: Response, accessToken: string): void {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true es obligatorio en producción (HTTPS); en desarrollo local
      // (http://localhost) se deja en false para que la cookie se guarde igual.
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN),
      path: '/',
    });
  }
}
