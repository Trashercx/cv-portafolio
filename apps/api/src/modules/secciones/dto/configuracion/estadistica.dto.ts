import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Un elemento de `SobreMiConfiguracionDto.estadisticas` (Fase 7, 7.2, UC-07):
 * una cifra destacada con su etiqueta (p. ej. valor "5+", etiqueta "Años de
 * experiencia"). Clase anidada: `forbidNonWhitelisted` aplica también aquí.
 */
export class EstadisticaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  etiqueta: string;

  @IsString()
  @MinLength(1)
  @MaxLength(12)
  valor: string;
}
