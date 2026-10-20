import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { INCLUDE_MEDIA_CON_VARIANTES } from '../media/media.select';
import { CreateExperienciaDto } from './dto/create-experiencia.dto';
import { ReordenarExperienciaItemDto } from './dto/reordenar-experiencia-item.dto';
import { UpdateExperienciaDto } from './dto/update-experiencia.dto';

/** Logo (con variantes) y tecnologías del catálogo, para admin y snapshot. */
const INCLUDE_EXPERIENCIA = {
  logo: { include: INCLUDE_MEDIA_CON_VARIANTES },
  tecnologias: { include: { tecnologia: true } },
};

/** Tipo mínimo de una fila con sus relaciones (evita acoplar a los tipos generados). */
interface FilaExperiencia {
  tecnologias: { tecnologia: { id: string; nombre: string } }[];
  [clave: string]: unknown;
}

/**
 * Aplana `tecnologias` de `{ tecnologia: { id, nombre } }[]` a
 * `{ id, nombre }[]` (orden alfabético), la forma que consumen el panel y el
 * snapshot.
 */
function aplanar<T extends FilaExperiencia>(fila: T) {
  return {
    ...fila,
    tecnologias: fila.tecnologias
      .map((t) => ({ id: t.tecnologia.id, nombre: t.tecnologia.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

/**
 * Las columnas `@db.Date` exigen un `Date` (el cliente de Prisma 7 rechaza
 * un `YYYY-MM-DD` solo-fecha); ver el mismo criterio en `proyectos.service`.
 */
function aFecha(valor: string): Date {
  return new Date(valor);
}

function claveDia(valor: Date | string): number {
  return new Date(valor).getTime();
}

/**
 * UC-19 (experiencia laboral, Fase 7l). El visitante nunca lee esta tabla:
 * `listarPublicas()` alimenta el snapshot y solo incluye las visibles.
 */
@Injectable()
export class ExperienciasService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /admin/experiencias`: ordenadas por `orden`. */
  async listar() {
    const filas = await this.prisma.experienciaLaboral.findMany({
      orderBy: { orden: 'asc' },
      include: INCLUDE_EXPERIENCIA,
    });
    return filas.map(aplanar);
  }

  async obtener(id: string) {
    const fila = await this.prisma.experienciaLaboral.findUnique({
      where: { id },
      include: INCLUDE_EXPERIENCIA,
    });

    if (!fila) {
      throw new NotFoundException(`No existe una experiencia con id ${id}`);
    }

    return aplanar(fila);
  }

  /**
   * Para el snapshot (UC-19, UC-12): solo `visible`, los puestos actuales
   * (`fecha_fin` nula) primero y luego `fecha_inicio` descendente. Sin campos
   * internos (`usuario_admin_id`, `logo_media_id`, `visible`, timestamps).
   */
  async listarPublicas() {
    const filas = await this.prisma.experienciaLaboral.findMany({
      where: { visible: true },
      include: INCLUDE_EXPERIENCIA,
    });

    return filas
      .sort((a, b) => {
        if (!a.fecha_fin !== !b.fecha_fin) return a.fecha_fin ? 1 : -1;
        return claveDia(b.fecha_inicio) - claveDia(a.fecha_inicio);
      })
      .map((fila) => {
        const {
          usuario_admin_id: _u,
          logo_media_id: _l,
          visible: _v,
          created_at: _c,
          updated_at: _a,
          ...publica
        } = aplanar(fila);
        void [_u, _l, _v, _c, _a];
        return publica;
      });
  }

  async crear(usuarioAdminId: string, dto: CreateExperienciaDto) {
    const { tecnologias, fecha_inicio, fecha_fin, descripcion, ...resto } = dto;

    this.validarFechas(fecha_inicio, fecha_fin);
    await this.asegurarMediaExiste(resto.logo_media_id);

    const ultima = await this.prisma.experienciaLaboral.aggregate({
      _max: { orden: true },
    });

    const id = await this.prisma.$transaction(async (tx) => {
      const nueva = await tx.experienciaLaboral.create({
        data: {
          ...resto,
          usuario_admin_id: usuarioAdminId,
          descripcion: descripcion ?? '',
          fecha_inicio: aFecha(fecha_inicio),
          fecha_fin: fecha_fin ? aFecha(fecha_fin) : null,
          orden: (ultima._max.orden ?? -1) + 1,
        },
      });
      if (tecnologias) {
        await this.reemplazarTecnologias(tx, nueva.id, tecnologias);
      }
      return nueva.id;
    });

    return this.obtener(id);
  }

  async actualizar(id: string, dto: UpdateExperienciaDto) {
    const actual = await this.prisma.experienciaLaboral.findUnique({
      where: { id },
    });
    if (!actual) {
      throw new NotFoundException(`No existe una experiencia con id ${id}`);
    }

    const { tecnologias, fecha_inicio, fecha_fin, ...resto } = dto;

    // Un PATCH parcial se valida contra el valor ya guardado (el validador
    // cruzado del DTO solo ve lo que viene en el cuerpo).
    this.validarFechas(
      fecha_inicio ?? actual.fecha_inicio.toISOString().slice(0, 10),
      fecha_fin === undefined
        ? actual.fecha_fin?.toISOString().slice(0, 10)
        : fecha_fin,
    );
    await this.asegurarMediaExiste(resto.logo_media_id);

    await this.prisma.$transaction(async (tx) => {
      await tx.experienciaLaboral.update({
        where: { id },
        data: {
          ...resto,
          fecha_inicio: fecha_inicio ? aFecha(fecha_inicio) : undefined,
          fecha_fin:
            fecha_fin === undefined
              ? undefined
              : fecha_fin === null
                ? null
                : aFecha(fecha_fin),
        },
      });
      if (tecnologias) {
        await this.reemplazarTecnologias(tx, id, tecnologias);
      }
    });

    return this.obtener(id);
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.experienciaLaboral.delete({ where: { id } });
  }

  /** `PATCH /admin/experiencias/reordenar`: todo o nada; un id inexistente es 404. */
  async reordenar(items: ReordenarExperienciaItemDto[]) {
    const ids = items.map((item) => item.id);
    const existentes = await this.prisma.experienciaLaboral.count({
      where: { id: { in: ids } },
    });
    if (existentes !== new Set(ids).size) {
      throw new NotFoundException('Alguna experiencia a reordenar no existe');
    }
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.experienciaLaboral.update({
          where: { id: item.id },
          data: { orden: item.orden },
        }),
      ),
    );
  }

  private validarFechas(inicio: string, fin?: string | null) {
    if (fin && claveDia(fin) < claveDia(inicio)) {
      throw new BadRequestException(
        'fecha_fin debe ser posterior o igual a fecha_inicio',
      );
    }
  }

  private async asegurarMediaExiste(mediaId?: string | null) {
    if (!mediaId) return;
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: { id: true },
    });
    if (!media) {
      throw new BadRequestException(`No existe Media con id ${mediaId}`);
    }
  }

  /**
   * Deja las tecnologías del puesto exactamente como la lista recibida:
   * upsert por nombre exacto en el catálogo `Tecnologia` y reemplazo de las
   * filas de `experiencia_tecnologia`.
   */
  private async reemplazarTecnologias(
    tx: Pick<PrismaService, 'tecnologia' | 'experienciaTecnologia'>,
    experienciaId: string,
    nombres: string[],
  ) {
    const unicos = [...new Set(nombres.filter((n) => n.length > 0))];
    const ids: string[] = [];
    for (const nombre of unicos) {
      const t = await tx.tecnologia.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      });
      ids.push(t.id);
    }
    await tx.experienciaTecnologia.deleteMany({
      where: { experiencia_id: experienciaId },
    });
    if (ids.length > 0) {
      await tx.experienciaTecnologia.createMany({
        data: ids.map((tecnologia_id) => ({
          experiencia_id: experienciaId,
          tecnologia_id,
        })),
      });
    }
  }
}
