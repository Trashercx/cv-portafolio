import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { ListarMediaQueryDto } from './dto/listar-media-query.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import {
  MEDIA_STORAGE_SERVICE,
  MediaStorageService,
} from './storage/media-storage.interface';

/** Deriva un `tipo` razonable cuando el admin no lo especifica en el DTO. */
function inferirTipo(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'imagen';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'archivo';
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE_SERVICE)
    private readonly storage: MediaStorageService,
  ) {}

  async create(
    file: Express.Multer.File,
    dto: CreateMediaDto,
    usuarioAdminId: string,
  ) {
    const resultado = await this.storage.upload(file, dto.carpeta);

    return this.prisma.media.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        url: resultado.url,
        s3_key: resultado.key,
        tipo: dto.tipo ?? inferirTipo(file.mimetype),
        ancho: resultado.width,
        alto: resultado.height,
        alt_text: dto.alt_text,
      },
    });
  }

  // ---------------------------------------------------------------------
  // UC-09: biblioteca multimedia completa
  // ---------------------------------------------------------------------

  /** `GET /admin/media`: lista completa, con filtro opcional por `tipo`. */
  async listar(query: ListarMediaQueryDto) {
    return this.prisma.media.findMany({
      where: query.tipo ? { tipo: query.tipo } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  async obtener(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });

    if (!media) {
      throw new NotFoundException(`No existe Media con id ${id}`);
    }

    return media;
  }

  /** `PATCH /admin/media/:id`: solo edita metadata (`alt_text`), nunca el archivo. */
  async actualizar(id: string, dto: UpdateMediaDto) {
    await this.obtener(id);

    return this.prisma.media.update({
      where: { id },
      data: { alt_text: dto.alt_text },
    });
  }

  /**
   * `DELETE /admin/media/:id` (UC-09): antes de borrar, verifica que la
   * imagen/archivo no esté referenciado desde ningún lado (`proyecto_imagen`,
   * `certificacion.logo_media_id`, `perfil.imagen_perfil_id`/`cv_media_id`).
   * Si está en uso, responde 409 en vez de romper esas referencias.
   */
  async eliminar(id: string) {
    await this.obtener(id);
    await this.asegurarNoEstaEnUso(id);

    await this.prisma.media.delete({ where: { id } });
  }

  /**
   * `PATCH /admin/media/:id/reemplazar` (UC-09): sube el nuevo archivo y
   * actualiza la MISMA fila `Media` (mismo `id`) con la nueva `url`/`s3_key`/
   * `tipo`/`ancho`/`alto`, para que cualquier referencia existente
   * (`imagen_perfil_id`, `logo_media_id`, `proyecto_imagen.media_id`, etc.)
   * siga apuntando al mismo `id` sin romperse.
   */
  async reemplazar(id: string, file: Express.Multer.File, carpeta?: string) {
    await this.obtener(id);

    const resultado = await this.storage.upload(file, carpeta);

    return this.prisma.media.update({
      where: { id },
      data: {
        url: resultado.url,
        s3_key: resultado.key,
        tipo: inferirTipo(file.mimetype),
        ancho: resultado.width,
        alto: resultado.height,
      },
    });
  }

  private async asegurarNoEstaEnUso(mediaId: string) {
    const [enProyectoImagen, comoLogoDeCertificacion, enPerfil] =
      await Promise.all([
        this.prisma.proyectoImagen.findFirst({
          where: { media_id: mediaId },
        }),
        this.prisma.certificacion.findFirst({
          where: { logo_media_id: mediaId },
        }),
        this.prisma.perfil.findFirst({
          where: {
            OR: [{ imagen_perfil_id: mediaId }, { cv_media_id: mediaId }],
          },
        }),
      ]);

    if (enProyectoImagen || comoLogoDeCertificacion || enPerfil) {
      throw new ConflictException(
        'No se puede eliminar: este archivo está en uso (proyecto, certificación o perfil). Reemplázalo en vez de borrarlo.',
      );
    }
  }
}
