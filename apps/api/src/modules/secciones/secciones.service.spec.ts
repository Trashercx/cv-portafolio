import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SeccionesService } from './secciones.service';

describe('SeccionesService (UC-07)', () => {
  let service: SeccionesService;
  let prisma: {
    seccion: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      seccion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeccionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SeccionesService);
  });

  describe('crear', () => {
    const heroConfiguracionValida = {
      titulo: 'Hola',
      subtitulo: 'Bienvenido',
      mostrar_foto_perfil: true,
      posicion_foto: 'centrada' as const,
      estilo_foto: 'con_marco' as const,
    };

    it('crea una sección hero con configuración válida', async () => {
      prisma.seccion.create.mockResolvedValue({ id: 'seccion-1' });

      await service.crear('admin-1', {
        tipo_seccion: 'hero',
        titulo_visible: 'Inicio',
        orden: 1,
        configuracion: heroConfiguracionValida,
      });

      expect(prisma.seccion.create).toHaveBeenCalledWith({
        data: {
          usuario_admin_id: 'admin-1',
          tipo_seccion: 'hero',
          titulo_visible: 'Inicio',
          orden: 1,
          visible: true,
          configuracion: heroConfiguracionValida,
        },
      });
    });

    it('rechaza configuración de hero a la que le falta un campo requerido', async () => {
      await expect(
        service.crear('admin-1', {
          tipo_seccion: 'hero',
          titulo_visible: 'Inicio',
          orden: 1,
          configuracion: { titulo: 'Hola' }, // falta "subtitulo" y los campos de foto
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.seccion.create).not.toHaveBeenCalled();
    });

    it('valida "skills" (direccion izquierda|derecha, velocidad lenta|media|rapida)', async () => {
      prisma.seccion.create.mockResolvedValue({ id: 'seccion-6' });

      await service.crear('admin-1', {
        tipo_seccion: 'skills',
        titulo_visible: 'Skills',
        orden: 7,
        configuracion: { direccion: 'izquierda', velocidad: 'media' },
      });

      expect(prisma.seccion.create).toHaveBeenCalled();
    });

    it('rechaza "skills" con una direccion fuera del catálogo', async () => {
      await expect(
        service.crear('admin-1', {
          tipo_seccion: 'skills',
          titulo_visible: 'Skills',
          orden: 7,
          configuracion: { direccion: 'arriba', velocidad: 'media' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza configuración con campos que no corresponden al tipo_seccion', async () => {
      await expect(
        service.crear('admin-1', {
          tipo_seccion: 'sobre-mi',
          titulo_visible: 'Sobre mí',
          orden: 2,
          configuracion: { mostrar_foto: true, campo_inventado: 'x' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('valida "proyectos" (cantidad_a_mostrar positivo, solo_destacados boolean)', async () => {
      prisma.seccion.create.mockResolvedValue({ id: 'seccion-2' });

      await service.crear('admin-1', {
        tipo_seccion: 'proyectos',
        titulo_visible: 'Proyectos',
        orden: 3,
        configuracion: { cantidad_a_mostrar: 6, solo_destacados: true },
      });

      expect(prisma.seccion.create).toHaveBeenCalled();
    });

    it('rechaza "proyectos" con cantidad_a_mostrar no positiva', async () => {
      await expect(
        service.crear('admin-1', {
          tipo_seccion: 'proyectos',
          titulo_visible: 'Proyectos',
          orden: 3,
          configuracion: { cantidad_a_mostrar: -1, solo_destacados: true },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('valida "certificaciones" solo con orden fecha|manual', async () => {
      prisma.seccion.create.mockResolvedValue({ id: 'seccion-3' });

      await service.crear('admin-1', {
        tipo_seccion: 'certificaciones',
        titulo_visible: 'Certificaciones',
        orden: 4,
        configuracion: { orden: 'manual' },
      });

      expect(prisma.seccion.create).toHaveBeenCalled();
    });

    it('rechaza "certificaciones" con un valor de orden fuera del catálogo', async () => {
      await expect(
        service.crear('admin-1', {
          tipo_seccion: 'certificaciones',
          titulo_visible: 'Certificaciones',
          orden: 4,
          configuracion: { orden: 'aleatorio' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('acepta "logros" sin categoria_filtro (es opcional)', async () => {
      prisma.seccion.create.mockResolvedValue({ id: 'seccion-4' });

      await service.crear('admin-1', {
        tipo_seccion: 'logros',
        titulo_visible: 'Logros',
        orden: 5,
        configuracion: {},
      });

      expect(prisma.seccion.create).toHaveBeenCalled();
    });

    it('valida "contacto" (mostrar_formulario boolean)', async () => {
      prisma.seccion.create.mockResolvedValue({ id: 'seccion-5' });

      await service.crear('admin-1', {
        tipo_seccion: 'contacto',
        titulo_visible: 'Contacto',
        orden: 6,
        configuracion: { mostrar_formulario: false },
      });

      expect(prisma.seccion.create).toHaveBeenCalled();
    });
  });

  describe('actualizarConfiguracion', () => {
    it('valida contra el tipo_seccion ya guardado en la fila', async () => {
      prisma.seccion.findUnique.mockResolvedValue({
        id: 'seccion-1',
        tipo_seccion: 'certificaciones',
      });
      prisma.seccion.update.mockResolvedValue({ id: 'seccion-1' });

      await service.actualizarConfiguracion('seccion-1', { orden: 'fecha' });

      expect(prisma.seccion.update).toHaveBeenCalledWith({
        where: { id: 'seccion-1' },
        data: { configuracion: { orden: 'fecha' } },
      });
    });

    it('rechaza configuración inválida para el tipo de la sección existente', async () => {
      prisma.seccion.findUnique.mockResolvedValue({
        id: 'seccion-1',
        tipo_seccion: 'certificaciones',
      });

      await expect(
        service.actualizarConfiguracion('seccion-1', {
          titulo: 'no corresponde a certificaciones',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.seccion.update).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la sección no existe', async () => {
      prisma.seccion.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizarConfiguracion('no-existe', { orden: 'fecha' }),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * Regresión (Sprint 8, code-review): `mostrar_foto_perfil`/`posicion_foto`/
     * `estilo_foto` se agregaron a `HeroConfiguracionDto` DESPUÉS de que ya
     * existieran secciones `hero` publicadas cuya `configuracion` (jsonb) no
     * los tiene, sin ningún backfill de datos. Si esos 3 campos fueran
     * requeridos, este PATCH "viejo" (solo título/subtítulo, como hacía
     * cualquier admin antes de Sprint 8) sería rechazado con 400 aunque
     * nunca tocó esos campos. Deben ser `@IsOptional()` con default de clase
     * para que este caso siga aceptándose.
     */
    it('acepta actualizar la configuración de una sección hero YA EXISTENTE sin los campos nuevos de foto (payload "viejo", anterior a Sprint 8)', async () => {
      prisma.seccion.findUnique.mockResolvedValue({
        id: 'seccion-hero-vieja',
        tipo_seccion: 'hero',
      });
      prisma.seccion.update.mockResolvedValue({ id: 'seccion-hero-vieja' });

      const configuracionVieja = {
        titulo: 'Título editado',
        subtitulo: 'Subtítulo editado',
      };

      await expect(
        service.actualizarConfiguracion(
          'seccion-hero-vieja',
          configuracionVieja,
        ),
      ).resolves.toBeDefined();

      expect(prisma.seccion.update).toHaveBeenCalledWith({
        where: { id: 'seccion-hero-vieja' },
        data: { configuracion: configuracionVieja },
      });
    });
  });

  describe('reordenar', () => {
    it('actualiza el orden de varias secciones en una transacción', async () => {
      await service.reordenar([
        { id: 'a', orden: 2 },
        { id: 'b', orden: 1 },
      ]);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const llamada = prisma.$transaction.mock.calls[0][0];
      expect(llamada).toHaveLength(2);
    });
  });

  describe('actualizarVisibilidad', () => {
    it('actualiza visible', async () => {
      prisma.seccion.findUnique.mockResolvedValue({ id: 'seccion-1' });
      prisma.seccion.update.mockResolvedValue({
        id: 'seccion-1',
        visible: false,
      });

      const resultado = await service.actualizarVisibilidad('seccion-1', {
        visible: false,
      });

      expect(prisma.seccion.update).toHaveBeenCalledWith({
        where: { id: 'seccion-1' },
        data: { visible: false },
      });
      expect(resultado.visible).toBe(false);
    });
  });
});
