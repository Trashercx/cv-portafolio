import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de rutas de administración (todo lo que no sea UC-12 a UC-14).
 * Delega en la estrategia 'jwt' (JwtStrategy), que extrae el token de la
 * cookie httpOnly `access_token`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
