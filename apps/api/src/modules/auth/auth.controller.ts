import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { parseDurationToMs } from './parse-duration';

/**
 * UC-01 (Iniciar sesión).
 * POST /auth/login — ruta pública (no lleva JwtAuthGuard): es el propio
 * endpoint que emite la sesión.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ email: string; nombre: string }> {
    const { accessToken, admin } = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    // El token viaja en cookie httpOnly, nunca en el cuerpo de la respuesta
    // (decisión de arquitectura de docs/plan-tecnico.md, Sprint 0).
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true es obligatorio en producción (HTTPS); en desarrollo local
      // (http://localhost) se deja en false para que la cookie se guarde igual.
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseDurationToMs(process.env.JWT_EXPIRES_IN),
      path: '/',
    });

    return admin;
  }
}
