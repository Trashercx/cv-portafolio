import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { INCLUDE_MEDIA_CON_VARIANTES } from '../media/media.select';
import { MediaService } from '../media/media.service';
import { CreateInsigniaDto } from './dto/create-insignia.dto';
import { UpdateInsigniaDto } from './dto/update-insignia.dto';
import {
  crearContextoExtraccion,
  EXTRACTORES,
  ExtractorNoAplica,
  VistaPreviaInsignia,
} from './extractores';
import {
  leerOpenBadgesHorneado,
  vistaDeHorneado,
} from './extractores/png-horneado';
import { extensionDeMime, TIPOS_IMAGEN, vistaVacia } from './extractores/utils';
import { descargarRecursoSeguro, RedSeguraError } from './red-segura';

const INCLUDE_IMAGEN = { imagen: { include: INCLUDE_MEDIA_CON_VARIANTES } };

const MIMES_ARCHIVO_INSIGNIA = ['image/png', 'image/svg+xml'];

function aFecha(valor: string | null | undefined): Date | null | undefined {
  if (valor === undefined) return undefined;
  return valor ? new Date(valor) : null;
}

/** Nombre de archivo ASCII derivado del nombre de la insignia. */
function slugArchivo(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'insignia'
  );
}

/**
 * UC-35 (Insignias importables, Fase 7d). CRUD del panel + importación por
 * enlace/código de embed/archivo. Todo acceso saliente pasa por
 * `descargarRecursoSeguro` (ver `red-segura.ts`).
 */
@Injectable()
export class InsigniasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /** `GET /admin/insignias`: ordenadas por `orden`, con la imagen resuelta. */
  async listar() {
    return this.prisma.insignia.findMany({
      orderBy: { orden: 'asc' },
      include: INCLUDE_IMAGEN,
    });
  }

  /**
   * Para el snapshot (UC-11/UC-12): solo las `visible`, por `orden`, con
   * `imagen` y sus variantes (misma forma que las demás medias del snapshot).
   */
  async listarVisibles() {
    return this.prisma.insignia.findMany({
      where: { visible: true },
      orderBy: { orden: 'asc' },
      include: INCLUDE_IMAGEN,
    });
  }

  async obtener(id: string) {
    const insignia = await this.prisma.insignia.findUnique({
      where: { id },
      include: INCLUDE_IMAGEN,
    });
    if (!insignia) {
      throw new NotFoundException(`No existe una insignia con id ${id}`);
    }
    return insignia;
  }

  /** `POST /admin/insignias`. */
  async crear(usuarioAdminId: string, dto: CreateInsigniaDto) {
    const imagenMediaId = await this.resolverImagen(
      usuarioAdminId,
      dto.nombre,
      dto,
    );

    const ultimo = await this.prisma.insignia.aggregate({
      _max: { orden: true },
    });

    return this.prisma.insignia.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        nombre: dto.nombre,
        emisor: dto.emisor,
        descripcion: dto.descripcion,
        proveedor: dto.proveedor ?? 'manual',
        id_externo: dto.id_externo,
        url_verificacion: dto.url_verificacion,
        url_origen: dto.url_origen,
        imagen_media_id: imagenMediaId as string,
        fecha_emision: aFecha(dto.fecha_emision),
        fecha_expiracion: aFecha(dto.fecha_expiracion),
        habilidades: dto.habilidades ?? [],
        orden: (ultimo._max.orden ?? -1) + 1,
        visible: dto.visible ?? true,
      },
      include: INCLUDE_IMAGEN,
    });
  }

  /** `PATCH /admin/insignias/:id`. */
  async actualizar(id: string, dto: UpdateInsigniaDto) {
    const actual = await this.obtener(id);

    const imagenMediaId = await this.resolverImagen(
      actual.usuario_admin_id,
      dto.nombre ?? actual.nombre,
      dto,
      false,
    );

    return this.prisma.insignia.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        emisor: dto.emisor,
        descripcion: dto.descripcion,
        proveedor: dto.proveedor,
        id_externo: dto.id_externo,
        url_verificacion: dto.url_verificacion,
        url_origen: dto.url_origen,
        imagen_media_id: imagenMediaId,
        fecha_emision: aFecha(dto.fecha_emision),
        fecha_expiracion: aFecha(dto.fecha_expiracion),
        habilidades: dto.habilidades,
        visible: dto.visible,
      },
      include: INCLUDE_IMAGEN,
    });
  }

  /** `DELETE /admin/insignias/:id`: NO borra la media (sigue en la biblioteca). */
  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.insignia.delete({ where: { id } });
  }

  /**
   * `PATCH /admin/insignias/reordenar`: la posición en `ids` pasa a ser
   * `orden`, en una sola transacción (todo o nada).
   */
  async reordenar(ids: string[]) {
    const existentes = await this.prisma.insignia.count({
      where: { id: { in: ids } },
    });
    if (existentes !== ids.length) {
      throw new NotFoundException('Alguna de las insignias no existe');
    }
    await this.prisma.$transaction(
      ids.map((id, orden) =>
        this.prisma.insignia.update({ where: { id }, data: { orden } }),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Importación (vista previa sin persistir)
  // ---------------------------------------------------------------------

  /**
   * `POST /admin/insignias/importar`: recorre la cadena de extractores; el
   * primero que acepta la entrada y reconoce el recurso extrae. Un fallo de
   * red o de política se devuelve en `avisos` con campos vacíos (nunca 5xx);
   * una entrada sin enlace, embed ni imagen es 400.
   */
  async importar(entrada: string): Promise<VistaPreviaInsignia> {
    const texto = entrada.trim();
    const candidatos = EXTRACTORES.filter((e) => e.acepta(texto));
    if (candidatos.length === 0) {
      throw new BadRequestException(
        'La entrada no contiene un enlace, un código de embed ni una imagen',
      );
    }

    const ctx = crearContextoExtraccion();
    const avisos: string[] = [];
    for (const extractor of candidatos) {
      try {
        return await extractor.extraer(texto, ctx);
      } catch (error) {
        if (error instanceof ExtractorNoAplica) continue;
        if (error instanceof RedSeguraError) {
          return vistaVacia('generico', texto, [
            `No se pudo importar: ${error.message}`,
          ]);
        }
        avisos.push(
          `Error al analizar el recurso: ${error instanceof Error ? error.message : 'desconocido'}`,
        );
      }
    }
    return vistaVacia('generico', texto, [
      ...avisos,
      'No se reconoció el recurso (ni insignia, ni imagen, ni página con metadatos). Completa los datos a mano.',
    ]);
  }

  /**
   * `POST /admin/insignias/importar-archivo`: sube el PNG/SVG a la biblioteca
   * (carpeta `insignias`) y, si trae Open Badges horneado, completa la vista
   * previa; si no, la vista queda vacía con la media ya creada.
   */
  async importarArchivo(
    file: Express.Multer.File,
    usuarioAdminId: string,
  ): Promise<VistaPreviaInsignia & { imagen_media_id: string }> {
    if (!MIMES_ARCHIVO_INSIGNIA.includes(file.mimetype)) {
      throw new BadRequestException('Solo se admiten archivos PNG o SVG');
    }

    const media = await this.mediaService.create(
      file,
      { carpeta: 'insignias', alt_text: file.originalname },
      usuarioAdminId,
    );
    const imagen = {
      url: media.url,
      ancho: media.ancho ?? undefined,
      alto: media.alto ?? undefined,
      formato: file.mimetype === 'image/svg+xml' ? 'svg' : 'png',
    };

    let vista: VistaPreviaInsignia;
    const horneado = leerOpenBadgesHorneado(file.buffer, file.mimetype);
    if (!horneado) {
      vista = vistaVacia('manual', null, [
        'El archivo no trae datos de Open Badges: completa los campos.',
      ]);
    } else {
      try {
        vista = await vistaDeHorneado(horneado, {
          ctx: crearContextoExtraccion(),
          urlOrigen: null,
          imagenRespaldo: media.url,
        });
      } catch (error) {
        vista = vistaVacia('open_badges', null, [
          `Se encontró Open Badges pero no se pudo leer: ${error instanceof Error ? error.message : 'error'}`,
        ]);
      }
    }
    // La imagen de la vista previa es SIEMPRE la del archivo subido.
    vista.imagen = imagen;
    return { ...vista, imagen_media_id: media.id };
  }

  // ---------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------

  /**
   * Resuelve `imagen_media_id`: valida el id recibido, o descarga
   * `imagen_url_remota` con red segura y la sube a la biblioteca. `requerida`
   * (crear) obliga a que haya una de las dos.
   */
  private async resolverImagen(
    usuarioAdminId: string,
    nombre: string,
    dto: { imagen_media_id?: string; imagen_url_remota?: string },
    requerida = true,
  ): Promise<string | undefined> {
    if (dto.imagen_media_id && dto.imagen_url_remota) {
      throw new BadRequestException(
        'Envía imagen_media_id o imagen_url_remota, no ambos',
      );
    }

    if (dto.imagen_url_remota) {
      try {
        const recurso = await descargarRecursoSeguro(dto.imagen_url_remota, {
          tipos: TIPOS_IMAGEN,
          accept: 'image/*',
        });
        const file = {
          fieldname: 'file',
          originalname: `${slugArchivo(nombre)}.${extensionDeMime(recurso.contentType)}`,
          encoding: '7bit',
          mimetype: recurso.contentType,
          size: recurso.buffer.length,
          buffer: recurso.buffer,
        } as Express.Multer.File;
        const media = await this.mediaService.create(
          file,
          { carpeta: 'insignias', alt_text: nombre },
          usuarioAdminId,
        );
        return media.id;
      } catch (error) {
        if (error instanceof RedSeguraError) {
          throw new BadRequestException(
            `No se pudo descargar la imagen: ${error.message}`,
          );
        }
        throw error;
      }
    }

    if (dto.imagen_media_id) {
      const media = await this.prisma.media.findUnique({
        where: { id: dto.imagen_media_id },
        select: { id: true },
      });
      if (!media) {
        throw new BadRequestException(
          `No existe Media con id ${dto.imagen_media_id}`,
        );
      }
      return media.id;
    }

    if (requerida) {
      throw new BadRequestException(
        'Falta la imagen: envía imagen_media_id o imagen_url_remota',
      );
    }
    return undefined;
  }
}
