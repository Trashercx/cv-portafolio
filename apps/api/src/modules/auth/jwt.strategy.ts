import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  /** Expiración del token (segundos epoch); la usa GET /auth/sesion (octava ronda, UC-01). */
  exp?: number;
}

/**
 * Decisión de arquitectura (docs/plan-tecnico.md, Sprint 0): el JWT viaja en una
 * cookie httpOnly (`access_token`), no en el header Authorization, para que el
 * frontend nunca lo guarde en localStorage. Por eso el extractor lee `req.cookies`
 * en lugar de usar `ExtractJwt.fromAuthHeaderAsBearerToken()`.
 */
const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.['access_token'] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // El payload validado queda disponible como `req.user` en rutas protegidas.
    return { sub: payload.sub, email: payload.email, exp: payload.exp };
  }
}
