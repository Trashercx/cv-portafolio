import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertIntegracionGithubDto } from './dto/upsert-integracion-github.dto';

/** Columnas que ve el panel: nunca `etag` ni `usuario_admin_id`. */
const SELECT_PUBLICO = {
  id: true,
  usuario_github: true,
  activa: true,
  intervalo_horas: true,
  publicar_automaticamente: true,
  incluir_forks: true,
  incluir_archivados: true,
  destacar_nuevos: true,
  ultima_sincronizacion_en: true,
  ultimo_error: true,
  // Fase 7m (#66): solo el destino; el Markdown y su etag salen por `/readme`.
  readme_repositorio: true,
  readme_rama: true,
  created_at: true,
  updated_at: true,
} as const;

/** Configuración de la integración con GitHub (UC-36, Fase 7l). */
@Injectable()
export class IntegracionGithubService {
  constructor(private readonly prisma: PrismaService) {}

  /** La integración del administrador, o `null` si aún no se configuró. */
  async obtener(usuarioAdminId: string) {
    return this.prisma.integracionGithub.findUnique({
      where: { usuario_admin_id: usuarioAdminId },
      select: SELECT_PUBLICO,
    });
  }

  /**
   * Crea o actualiza (1:1 con el administrador). Cualquier cambio de
   * configuración descarta el `etag`: un 304 saltaría repos que los nuevos
   * filtros (forks, archivados) sí deben importar.
   */
  async guardar(usuarioAdminId: string, dto: UpsertIntegracionGithubDto) {
    // Fase 7m (#66): cambiar o quitar el repositorio/rama del README invalida
    // la caché (markdown, etag, fecha y error); `null` en el repositorio la deja vacía.
    const cache = await this.cacheReadmeA(usuarioAdminId, dto);
    return this.prisma.integracionGithub.upsert({
      where: { usuario_admin_id: usuarioAdminId },
      create: { usuario_admin_id: usuarioAdminId, ...dto },
      update: { ...dto, etag: null, ...cache },
      select: SELECT_PUBLICO,
    });
  }

  private async cacheReadmeA(
    usuarioAdminId: string,
    dto: UpsertIntegracionGithubDto,
  ) {
    if (dto.readme_repositorio === undefined && dto.readme_rama === undefined) {
      return {};
    }
    const actual = await this.prisma.integracionGithub.findUnique({
      where: { usuario_admin_id: usuarioAdminId },
      select: { readme_repositorio: true, readme_rama: true },
    });
    const repoCambia =
      dto.readme_repositorio !== undefined &&
      dto.readme_repositorio !== (actual?.readme_repositorio ?? null);
    const ramaCambia =
      dto.readme_rama !== undefined &&
      dto.readme_rama !== (actual?.readme_rama ?? null);
    if (!repoCambia && !ramaCambia && dto.readme_repositorio !== null) {
      return {};
    }
    return {
      readme_markdown: null,
      readme_etag: null,
      readme_actualizado_en: null,
      readme_error: null,
    };
  }
}
