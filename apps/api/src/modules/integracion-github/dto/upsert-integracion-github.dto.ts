import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * `PUT /admin/integraciones/github` (UC-36, Fase 7l): crea o actualiza la
 * única integración del administrador. `usuario_github` es obligatorio y sigue
 * las reglas de GitHub (1-39 caracteres alfanuméricos o guiones, sin guion al
 * inicio ni al final); el resto es opcional y, al crear, toma los defaults del
 * esquema (`activa` false, 6 h, sin publicar solo, sin forks ni archivados).
 */
export class UpsertIntegracionGithubDto {
  @IsString()
  @Matches(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/, {
    message: 'usuario_github no es un nombre de usuario válido de GitHub',
  })
  usuario_github: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  intervalo_horas?: number;

  @IsOptional()
  @IsBoolean()
  publicar_automaticamente?: boolean;

  @IsOptional()
  @IsBoolean()
  incluir_forks?: boolean;

  @IsOptional()
  @IsBoolean()
  incluir_archivados?: boolean;

  @IsOptional()
  @IsBoolean()
  destacar_nuevos?: boolean;
}
