import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  NOMBRE_COOKIE_ACCESO,
  opcionesBaseCookieAcceso,
} from './cookie-acceso';
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

  // Fase 6: límite estricto contra fuerza bruta (además del bloqueo de cuenta
  // de UC-01). Se resuelve por request para poder sobreescribirlo por env.
  @Throttle({
    default: {
      limit: () => Number(process.env.THROTTLE_LOGIN_LIMIT ?? 5),
      ttl: () => Number(process.env.THROTTLE_LOGIN_TTL_MS ?? 60_000),
    },
  })
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

  /**
   * Octava ronda, UC-01: rehidrata la sesión del panel tras recargar la
   * página (el store del frontend vive en memoria). Misma forma que el cuerpo
   * de `POST /auth/refresh`, pero sin emitir cookie nueva: `expiresAt` es la
   * del token vigente. Sin cookie o token vencido, el guard responde 401.
   * Usa el límite global de throttling.
   */
  @Get('sesion')
  @UseGuards(JwtAuthGuard)
  async sesion(@Req() req: AuthenticatedRequest): Promise<SesionResponseBody> {
    const { admin, expiresAt } = await this.authService.sesionActual(
      req.user.sub,
      req.user.exp as number,
    );
    return { ...admin, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Fase 6 (UC-01): cierra la sesión borrando la cookie httpOnly. Sin guard a
   * propósito: debe funcionar aunque el token ya haya expirado.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(NOMBRE_COOKIE_ACCESO, opcionesBaseCookieAcceso());
  }

  private setCookieAcceso(res: Response, accessToken: string): void {
    res.cookie(NOMBRE_COOKIE_ACCESO, accessToken, {
      ...opcionesBaseCookieAcceso(),
      maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN),
    });
  }
}
