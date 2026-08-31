import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * UC-01 (Iniciar sesión) — parámetros/campos clave: email, contraseña.
 * Ningún otro campo se acepta (ValidationPipe global con whitelist activado en main.ts).
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
