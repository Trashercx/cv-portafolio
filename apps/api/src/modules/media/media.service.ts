import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sharp } from './sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { ListarMediaQueryDto } from './dto/listar-media-query.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { INCLUDE_MEDIA_CON_VARIANTES } from './media.select';
import {
  ResultadoGeneracion,
  VariantesImagenService,
} from './variantes-imagen.service';
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
    private readonly variantes: VariantesImagenService,
  ) {}

  async create(
    file: Express.Multer.File,
    dto: CreateMediaDto,
    usuarioAdminId: string,
  ) {
    const resultado = await this.storage.upload(file, dto.carpeta);

    const creada = await this.prisma.media.create({
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

    // Fase 8 (UC-34): variantes webp/avif; nunca hacen fallar la subida.
    await this.variantes.generar(
      creada.id,
      file.buffer,
      resultado.key,
      file.mimetype,
    );

    return this.obtener(creada.id);
  }

  // ---------------------------------------------------------------------
  // UC-09: biblioteca multimedia completa
  // ---------------------------------------------------------------------

  /** `GET /admin/media`: lista completa, con filtro opcional por `tipo`. */
  async listar(query: ListarMediaQueryDto) {
    return this.prisma.media.findMany({
      where: query.tipo ? { tipo: query.tipo } : undefined,
      orderBy: { created_at: 'desc' },
      include: INCLUDE_MEDIA_CON_VARIANTES,
    });
  }

  async obtener(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: INCLUDE_MEDIA_CON_VARIANTES,
    });

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
      include: INCLUDE_MEDIA_CON_VARIANTES,
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

    // Fase 8: borra los objetos de las variantes (las filas caen en cascada).
    await this.variantes.eliminarDe(id);
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

    await this.prisma.media.update({
      where: { id },
      data: {
        url: resultado.url,
        s3_key: resultado.key,
        tipo: inferirTipo(file.mimetype),
        ancho: resultado.width,
        alto: resultado.height,
      },
    });

    // Fase 8: las variantes viejas corresponden al archivo anterior.
    await this.variantes.eliminarDe(id);
    await this.variantes.generar(id, file.buffer, resultado.key, file.mimetype);

    return this.obtener(id);
  }

  /**
   * `POST /admin/media/:id/variantes` (Fase 8, UC-34): regenera las variantes
   * de una media descargando su original.
   */
  async regenerarVariantes(id: string): Promise<ResultadoGeneracion> {
    const media = await this.obtener(id);

    if (media.tipo !== 'imagen') {
      return { generadas: 0, omitida: true };
    }

    const buffer = await this.storage.descargar(media.s3_key);
    const mimetype = await this.detectarMime(buffer);
    if (!mimetype || !this.variantes.esRasterizable(mimetype)) {
      return { generadas: 0, omitida: true };
    }

    await this.variantes.eliminarDe(id);
    const { generadas, omitida, error } = await this.variantes.generar(
      id,
      buffer,
      media.s3_key,
      mimetype,
    );
    return error
      ? { generadas: 0, omitida: false, error }
      : { generadas, omitida };
  }

  /**
   * `POST /admin/media/variantes/regenerar` (Fase 8): rellena las imágenes
   * existentes sin variantes, una por una (acota memoria y CPU).
   */
  async regenerarFaltantes() {
    const pendientes = await this.prisma.media.findMany({
      where: { tipo: 'imagen', variantes: { none: {} } },
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });

    let procesadas = 0;
    let omitidas = 0;
    const errores: { id: string; motivo: string }[] = [];

    for (const { id } of pendientes) {
      try {
        const resultado = await this.regenerarVariantes(id);
        if (resultado.omitida) omitidas++;
        else if (resultado.error) {
          errores.push({ id, motivo: resultado.error });
        } else if (resultado.generadas > 0) procesadas++;
        else errores.push({ id, motivo: 'No se generó ninguna variante' });
      } catch (error) {
        errores.push({
          id,
          motivo: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { procesadas, omitidas, errores };
  }

  /** Deduce el mimetype real del buffer con sharp (la fila no lo guarda). */
  private async detectarMime(buffer: Buffer): Promise<string | null> {
    try {
      const { format } = await sharp(buffer).metadata();
      const porFormato: Record<string, string> = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        tiff: 'image/tiff',
        heif: 'image/avif',
        avif: 'image/avif',
      };
      return (format && porFormato[format]) ?? null;
    } catch {
      return null;
    }
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
