import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
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

  /**
   * Fase 7m (#66, UC-36): repositorio `owner/repo` cuyo README se muestra en el
   * panel; `null` lo quita y limpia la caché.
   */
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null)
  @IsString()
  @Matches(
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/,
    {
      message: 'readme_repositorio debe tener la forma owner/repo',
    },
  )
  readme_repositorio?: string | null;

  /** Rama del README; `null` o ausente usa `main`. */
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null)
  @IsString()
  @Matches(/^[\w./-]{1,255}$/, {
    message: 'readme_rama no es un nombre de rama válido',
  })
  readme_rama?: string | null;
}
