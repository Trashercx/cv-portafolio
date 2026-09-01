import { Request } from 'express';
import { JwtPayload } from '../modules/auth/jwt.strategy';

/**
 * Request de Express con `user` ya poblado por `JwtStrategy` (rutas detrás de
 * `JwtAuthGuard`). Se usa en los controladores de administración para leer
 * `usuario_admin_id` (payload.sub) sin repetir el tipo inline en cada uno.
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
