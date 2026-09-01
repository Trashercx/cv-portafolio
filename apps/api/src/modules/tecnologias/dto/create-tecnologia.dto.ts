import { IsNotEmpty, IsString } from 'class-validator';

/** Catálogo de tecnologías (soporte de UC-03). Único campo: nombre. */
export class CreateTecnologiaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
