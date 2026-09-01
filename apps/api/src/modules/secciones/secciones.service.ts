import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CONFIGURACION_DTO_POR_TIPO,
  TIPOS_SECCION,
  TipoSeccion,
} from './dto/configuracion';
import { ActualizarVisibilidadSeccionDto } from './dto/actualizar-visibilidad-seccion.dto';
import { CreateSeccionDto } from './dto/create-seccion.dto';
import { ReordenarSeccionItemDto } from './dto/reordenar-seccion-item.dto';
import { UpdateSeccionDto } from './dto/update-seccion.dto';

@Injectable()
export class SeccionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /admin/secciones`: lista ordenada por `orden`. */
  async listar() {
    return this.prisma.seccion.findMany({ orderBy: { orden: 'asc' } });
  }

  async obtener(id: string) {
    const seccion = await this.prisma.seccion.findUnique({ where: { id } });

    if (!seccion) {
      throw new NotFoundException(`No existe una sección con id ${id}`);
    }

    return seccion;
  }

  async crear(usuarioAdminId: string, dto: CreateSeccionDto) {
    await this.validarConfiguracion(dto.tipo_seccion, dto.configuracion);

    return this.prisma.seccion.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        tipo_seccion: dto.tipo_seccion,
        titulo_visible: dto.titulo_visible,
        orden: dto.orden,
        visible: dto.visible ?? true,
        configuracion: dto.configuracion as Prisma.InputJsonValue,
      },
    });
  }

  async actualizar(id: string, dto: UpdateSeccionDto) {
    await this.obtener(id);

    return this.prisma.seccion.update({
      where: { id },
      data: { titulo_visible: dto.titulo_visible },
    });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.seccion.delete({ where: { id } });
  }

  /**
   * `PATCH /admin/secciones/reordenar`: actualiza el `orden` de varias
   * secciones en una sola transacción (todo o nada), igual patrón que
   * `ProyectosService.reordenar`.
   */
  async reordenar(items: ReordenarSeccionItemDto[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.seccion.update({
          where: { id: item.id },
          data: { orden: item.orden },
        }),
      ),
    );
  }

  /** `PATCH /admin/secciones/:id/visibilidad`. */
  async actualizarVisibilidad(
    id: string,
    dto: ActualizarVisibilidadSeccionDto,
  ) {
    await this.obtener(id);

    return this.prisma.seccion.update({
      where: { id },
      data: { visible: dto.visible },
    });
  }

  /**
   * `PATCH /admin/secciones/:id/configuracion` (UC-07): valida `configuracion`
   * contra el DTO correspondiente al `tipo_seccion` YA guardado en esa fila
   * (el tipo de sección no se puede cambiar por esta vía, ver
   * `UpdateSeccionDto`). Un `configuracion` con campos que no correspondan al
   * tipo se rechaza con 400, nunca se acepta como JSON libre.
   */
  async actualizarConfiguracion(id: string, configuracion: unknown) {
    const seccion = await this.obtener(id);

    await this.validarConfiguracion(
      seccion.tipo_seccion as TipoSeccion,
      configuracion,
    );

    return this.prisma.seccion.update({
      where: { id },
      data: { configuracion: configuracion as Prisma.InputJsonValue },
    });
  }

  /**
   * Valida un `configuracion` contra el DTO de `class-validator` que le
   * corresponde a `tipoSeccion` (uno de los 6 tipos de bloque, ver
   * `dto/configuracion/index.ts`). Reproduce a mano el comportamiento del
   * `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`) porque
   * `configuracion` es JSON dinámico y no se puede tipar como un DTO fijo
   * en la firma del controlador.
   */
  private async validarConfiguracion(
    tipoSeccion: TipoSeccion,
    configuracion: unknown,
  ) {
    if (!TIPOS_SECCION.includes(tipoSeccion)) {
      throw new BadRequestException(`tipo_seccion desconocido: ${tipoSeccion}`);
    }

    if (
      typeof configuracion !== 'object' ||
      configuracion === null ||
      Array.isArray(configuracion)
    ) {
      throw new BadRequestException('configuracion debe ser un objeto');
    }

    const DtoClase = CONFIGURACION_DTO_POR_TIPO[tipoSeccion];
    const instancia = plainToInstance(DtoClase, configuracion);

    const errores = await validate(instancia, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errores.length > 0) {
      const mensajes = errores.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );
      throw new BadRequestException({
        message: mensajes,
        error: `configuracion inválida para tipo_seccion "${tipoSeccion}"`,
      });
    }
  }
}
