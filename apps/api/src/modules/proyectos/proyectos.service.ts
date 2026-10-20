import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AsociarImagenProyectoDto } from './dto/asociar-imagen-proyecto.dto';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { ReordenarImagenProyectoItemDto } from './dto/reordenar-imagen-proyecto-item.dto';
import { ReordenarProyectoItemDto } from './dto/reordenar-proyecto-item.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { INCLUDE_MEDIA_CON_VARIANTES } from '../media/media.select';

/** Relaciones incluidas en el detalle público y en el listado del panel admin. */
const INCLUDE_DETALLE = {
  tecnologias: { include: { tecnologia: true } },
  imagenes: {
    include: { media: { include: INCLUDE_MEDIA_CON_VARIANTES } },
    orderBy: { orden: 'asc' as const },
  },
};

/**
 * Fase 7l (UC-36): `github_repo_id` es BigInt en la base y `JSON.stringify`
 * (respuesta HTTP y snapshot JSONB) lanza con BigInt, así que todo proyecto
 * que sale de este servicio lo lleva como string (o null).
 */
export function serializarProyecto<T extends { github_repo_id: bigint | null }>(
  proyecto: T,
): Omit<T, 'github_repo_id'> & { github_repo_id: string | null } {
  return {
    ...proyecto,
    github_repo_id:
      proyecto.github_repo_id === null ? null : String(proyecto.github_repo_id),
  };
}

/** Campos que la sincronización con GitHub pisa y que, por tanto, se bloquean. */
const CAMPOS_SINCRONIZADOS = [
  'titulo',
  'descripcion',
  'url_repositorio',
  'url_demo',
] as const;

@Injectable()
export class ProyectosService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // UC-03: visitante (público, sin guard)
  // ---------------------------------------------------------------------

  /** `GET /proyectos`: lista respetando `orden`. */
  async listarPublico() {
    const proyectos = await this.prisma.proyecto.findMany({
      orderBy: { orden: 'asc' },
    });
    return proyectos.map(serializarProyecto);
  }

  /** `GET /proyectos/:id`: detalle con tecnologías e imágenes. */
  async obtenerPublico(id: string) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id },
      include: INCLUDE_DETALLE,
    });

    if (!proyecto) {
      throw new NotFoundException(`No existe un proyecto con id ${id}`);
    }

    return serializarProyecto(proyecto);
  }

  // ---------------------------------------------------------------------
  // UC-03: administración
  // ---------------------------------------------------------------------

  async listarAdmin() {
    const proyectos = await this.prisma.proyecto.findMany({
      orderBy: { orden: 'asc' },
      include: INCLUDE_DETALLE,
    });
    return proyectos.map(serializarProyecto);
  }

  async obtenerAdmin(id: string) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id },
      include: INCLUDE_DETALLE,
    });

    if (!proyecto) {
      throw new NotFoundException(`No existe un proyecto con id ${id}`);
    }

    return serializarProyecto(proyecto);
  }

  /**
   * `fecha_inicio`/`fecha_fin` llegan del DTO como string `YYYY-MM-DD`
   * (`@IsDateString()`, sin `@Type(() => Date)`): el cliente de Prisma 7
   * exige un ISO-8601 DateTime completo (con hora) para columnas `@db.Date`
   * y rechaza un string solo-fecha con "premature end of input", por eso se
   * convierten explícitamente a `Date` antes de llegar a Prisma.
   */
  async crear(usuarioAdminId: string, dto: CreateProyectoDto) {
    const creado = await this.prisma.proyecto.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        ...dto,
        fecha_inicio: new Date(dto.fecha_inicio),
        fecha_fin: dto.fecha_fin ? new Date(dto.fecha_fin) : undefined,
      },
    });
    return serializarProyecto(creado);
  }

  async actualizar(id: string, dto: UpdateProyectoDto) {
    const actual = await this.obtenerAdmin(id);

    // Fase 7l (UC-36): un importado que sigue sincronizado se reescribe en la
    // próxima sincronización; editarlo a mano sería perder el cambio en silencio.
    // Apagar `sincronizar_github` en el mismo PATCH sí lo permite.
    const seguiraSincronizado =
      dto.sincronizar_github ?? actual.sincronizar_github;
    if (actual.origen === 'github' && seguiraSincronizado) {
      const cambia = CAMPOS_SINCRONIZADOS.filter(
        (campo) => dto[campo] !== undefined && dto[campo] !== actual[campo],
      );
      if (cambia.length > 0) {
        throw new ConflictException(
          `Este proyecto se sincroniza con GitHub y no se puede editar a mano (${cambia.join(', ')}). Desactiva la sincronización con GitHub para editarlo a mano.`,
        );
      }
    }

    const actualizado = await this.prisma.proyecto.update({
      where: { id },
      data: {
        ...dto,
        fecha_inicio: dto.fecha_inicio ? new Date(dto.fecha_inicio) : undefined,
        fecha_fin: dto.fecha_fin ? new Date(dto.fecha_fin) : undefined,
      },
    });
    return serializarProyecto(actualizado);
  }

  async eliminar(id: string) {
    await this.obtenerAdmin(id);

    await this.prisma.proyecto.delete({ where: { id } });
  }

  /**
   * `PATCH /admin/proyectos/reordenar`: actualiza el `orden` de varios
   * proyectos en una sola transacción (todo o nada).
   */
  async reordenar(items: ReordenarProyectoItemDto[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.proyecto.update({
          where: { id: item.id },
          data: { orden: item.orden },
        }),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Tecnologías del proyecto (relación N:M vía proyecto_tecnologia)
  // ---------------------------------------------------------------------

  async agregarTecnologia(proyectoId: string, tecnologiaId: string) {
    await this.obtenerAdmin(proyectoId);
    await this.asegurarTecnologiaExiste(tecnologiaId);

    return this.prisma.proyectoTecnologia.upsert({
      where: {
        proyecto_id_tecnologia_id: {
          proyecto_id: proyectoId,
          tecnologia_id: tecnologiaId,
        },
      },
      update: {},
      create: { proyecto_id: proyectoId, tecnologia_id: tecnologiaId },
    });
  }

  async quitarTecnologia(proyectoId: string, tecnologiaId: string) {
    const { count } = await this.prisma.proyectoTecnologia.deleteMany({
      where: { proyecto_id: proyectoId, tecnologia_id: tecnologiaId },
    });

    if (count === 0) {
      throw new NotFoundException(
        'El proyecto no tiene asociada esa tecnología',
      );
    }
  }

  private async asegurarTecnologiaExiste(tecnologiaId: string) {
    const tecnologia = await this.prisma.tecnologia.findUnique({
      where: { id: tecnologiaId },
    });

    if (!tecnologia) {
      throw new NotFoundException(
        `No existe una tecnología con id ${tecnologiaId}`,
      );
    }
  }

  // ---------------------------------------------------------------------
  // Imágenes del proyecto (proyecto_imagen: proyecto <-> media, con orden)
  // ---------------------------------------------------------------------

  async agregarImagen(proyectoId: string, dto: AsociarImagenProyectoDto) {
    await this.obtenerAdmin(proyectoId);

    const media = await this.prisma.media.findUnique({
      where: { id: dto.media_id },
    });
    if (!media) {
      throw new BadRequestException(`No existe Media con id ${dto.media_id}`);
    }

    const yaAsociada = await this.prisma.proyectoImagen.findUnique({
      where: {
        proyecto_id_media_id: {
          proyecto_id: proyectoId,
          media_id: dto.media_id,
        },
      },
    });
    if (yaAsociada) {
      throw new ConflictException('Esa imagen ya está asociada al proyecto');
    }

    return this.prisma.proyectoImagen.create({
      data: {
        proyecto_id: proyectoId,
        media_id: dto.media_id,
        orden: dto.orden,
      },
    });
  }

  async quitarImagen(proyectoId: string, mediaId: string) {
    const { count } = await this.prisma.proyectoImagen.deleteMany({
      where: { proyecto_id: proyectoId, media_id: mediaId },
    });

    if (count === 0) {
      throw new NotFoundException('El proyecto no tiene asociada esa imagen');
    }
  }

  async reordenarImagenes(
    proyectoId: string,
    items: ReordenarImagenProyectoItemDto[],
  ) {
    await this.obtenerAdmin(proyectoId);

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.proyectoImagen.update({
          where: {
            proyecto_id_media_id: {
              proyecto_id: proyectoId,
              media_id: item.media_id,
            },
          },
          data: { orden: item.orden },
        }),
      ),
    );
  }
}
