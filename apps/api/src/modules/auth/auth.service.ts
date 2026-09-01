import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

/** UC-01: número de intentos fallidos permitidos antes de bloquear la cuenta. */
const MAX_INTENTOS_FALLIDOS = 3;

/**
 * UC-01: duración del bloqueo temporal tras agotar los intentos fallidos.
 * 15 minutos es un valor razonable para un panel de un solo administrador:
 * suficiente para desalentar fuerza bruta sin dejar al admin real fuera por
 * mucho tiempo tras un error de tipeo. Ajustable si el criterio de negocio cambia.
 */
const MINUTOS_BLOQUEO = 15;

export interface LoginResult {
  accessToken: string;
  admin: {
    email: string;
    nombre: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const admin = await this.prisma.usuarioAdmin.findUnique({
      where: { email },
    });

    // Nunca revelamos si el email existe o no: mismo mensaje para "no existe" y
    // "contraseña incorrecta". Solo comparamos intentos/bloqueo si el registro existe.
    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (admin.bloqueado_hasta && admin.bloqueado_hasta.getTime() > Date.now()) {
      // Cuenta bloqueada: se rechaza sin siquiera comparar la contraseña.
      throw new UnauthorizedException(
        'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde.',
      );
    }

    const passwordValida = await bcrypt.compare(password, admin.password_hash);

    if (!passwordValida) {
      const intentosFallidos = admin.intentos_fallidos + 1;
      const seBloquea = intentosFallidos >= MAX_INTENTOS_FALLIDOS;

      await this.prisma.usuarioAdmin.update({
        where: { id: admin.id },
        data: {
          intentos_fallidos: intentosFallidos,
          bloqueado_hasta: seBloquea
            ? new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000)
            : null,
        },
      });

      if (seBloquea) {
        throw new UnauthorizedException(
          'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde.',
        );
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Login exitoso: se resetean los contadores de bloqueo.
    await this.prisma.usuarioAdmin.update({
      where: { id: admin.id },
      data: { intentos_fallidos: 0, bloqueado_hasta: null },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
    });

    return {
      accessToken,
      admin: { email: admin.email, nombre: admin.nombre },
    };
  }
}
