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
    return this.prisma.integracionGithub.upsert({
      where: { usuario_admin_id: usuarioAdminId },
      create: { usuario_admin_id: usuarioAdminId, ...dto },
      update: { ...dto, etag: null },
      select: SELECT_PUBLICO,
    });
  }
}
