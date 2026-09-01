import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * UC-02 (Gestionar perfil personal) — campos exactos según
 * docs/plan-portafolio.md: nombre_completo, titulo_profesional, resumen_bio,
 * imagen_perfil_id (opcional, FK a Media), cv_media_id (opcional, FK a
 * Media), ubicacion. Se usa tanto para crear como para actualizar porque
 * `PUT /admin/perfil` es un upsert real (fila única) y ambos casos requieren
 * el mismo conjunto de campos.
 */
export class UpsertPerfilDto {
  @IsString()
  @IsNotEmpty()
  nombre_completo: string;

  @IsString()
  @IsNotEmpty()
  titulo_profesional: string;

  @IsString()
  @IsNotEmpty()
  resumen_bio: string;

  @IsOptional()
  @IsUUID()
  imagen_perfil_id?: string;

  @IsOptional()
  @IsUUID()
  cv_media_id?: string;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;
}
