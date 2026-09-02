import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-07 (Editar estructura visual, drag-and-drop). Todas las rutas son de
 * administración (sin vista pública todavía, ver `secciones.controller.ts`).
 *
 * Criterio de aceptación (docs/plan-portafolio.md): "Al reordenar o
 * mostrar/ocultar una sección en el editor, el cambio se ve igual en la
 * vista previa [...]". Se prueba reordenar/visibilidad contra el estado
 * persistido, y la validación de `configuracion` por `tipo_seccion`.
 */
describe('Secciones (e2e, UC-07)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const idsCreados: string[] = [];

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
  });

  afterAll(async () => {
    await prisma.seccion.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  // -----------------------------------------------------------------------
  // 401
  // -----------------------------------------------------------------------

  it('GET /admin/secciones sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/secciones').expect(401);
  });

  it('POST /admin/secciones sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'hero',
        titulo_visible: 'Inicio',
        orden: 1,
        configuracion: { titulo: 'a', subtitulo: 'b' },
      })
      .expect(401);
  });

  it('PATCH /admin/secciones/:id/configuracion sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/secciones/${randomUUID()}/configuracion`)
      .send({ titulo: 'a' })
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 400
  // -----------------------------------------------------------------------

  it('POST /admin/secciones rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'hero',
        titulo_visible: 'Inicio',
        orden: 1,
        configuracion: { titulo: 'a', subtitulo: 'b' },
        campo_invalido: true,
      })
      .expect(400);
  });

  it('POST /admin/secciones rechaza tipo_seccion desconocido', async () => {
    await agent
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'no-existe',
        titulo_visible: 'X',
        orden: 1,
        configuracion: {},
      })
      .expect(400);
  });

  it('POST /admin/secciones rechaza configuracion inválida para el tipo_seccion (hero sin subtitulo)', async () => {
    await agent
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'hero',
        titulo_visible: 'Inicio',
        orden: 1,
        configuracion: { titulo: 'Hola' },
      })
      .expect(400);
  });

  it('POST /admin/secciones rechaza configuracion con campos fuera del tipo (sobre-mi con campo extra)', async () => {
    await agent
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'sobre-mi',
        titulo_visible: 'Sobre mí',
        orden: 2,
        configuracion: { mostrar_foto: true, campo_extra: 'no debería pasar' },
      })
      .expect(400);
  });

  // -----------------------------------------------------------------------
  // Caso feliz + criterio de aceptación de UC-07
  // -----------------------------------------------------------------------

  it('crea, lista, reordena, oculta/muestra, actualiza configuración y elimina una sección', async () => {
    const sufijo = Date.now();

    const heroConfiguracionBase = {
      titulo: 'Hola',
      subtitulo: 'Bienvenido',
      mostrar_foto_perfil: true,
      posicion_foto: 'centrada',
      estilo_foto: 'con_marco',
    };

    const seccionA = await agent
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'hero',
        titulo_visible: `Hero e2e ${sufijo}`,
        orden: 9001,
        configuracion: heroConfiguracionBase,
      })
      .expect(201);
    idsCreados.push(seccionA.body.id);
    expect(seccionA.body.visible).toBe(true);

    const seccionB = await agent
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'contacto',
        titulo_visible: `Contacto e2e ${sufijo}`,
        orden: 9002,
        configuracion: { mostrar_formulario: true },
      })
      .expect(201);
    idsCreados.push(seccionB.body.id);

    // Listado ordenado por `orden`.
    const listado1 = await agent.get('/admin/secciones').expect(200);
    const idsDePrueba = new Set(idsCreados);
    const ordenObservado1 = listado1.body
      .filter((s: { id: string }) => idsDePrueba.has(s.id))
      .map((s: { id: string }) => s.id);
    expect(ordenObservado1).toEqual([seccionA.body.id, seccionB.body.id]);

    // Reordenar invierte el orden.
    await agent
      .patch('/admin/secciones/reordenar')
      .send([
        { id: seccionA.body.id, orden: 9003 },
        { id: seccionB.body.id, orden: 9000 },
      ])
      .expect(200);

    const listado2 = await agent.get('/admin/secciones').expect(200);
    const ordenObservado2 = listado2.body
      .filter((s: { id: string }) => idsDePrueba.has(s.id))
      .map((s: { id: string }) => s.id);
    expect(ordenObservado2).toEqual([seccionB.body.id, seccionA.body.id]);

    // Visibilidad.
    const ocultada = await agent
      .patch(`/admin/secciones/${seccionA.body.id}/visibilidad`)
      .send({ visible: false })
      .expect(200);
    expect(ocultada.body.visible).toBe(false);

    // Configuración: válida para el tipo ya guardado (hero).
    const heroConfiguracionNueva = {
      ...heroConfiguracionBase,
      titulo: 'Título nuevo',
      subtitulo: 'Subtítulo nuevo',
    };
    const configuracionActualizada = await agent
      .patch(`/admin/secciones/${seccionA.body.id}/configuracion`)
      .send(heroConfiguracionNueva)
      .expect(200);
    expect(configuracionActualizada.body.configuracion).toEqual(
      heroConfiguracionNueva,
    );

    // Configuración: inválida para el tipo ya guardado (contacto espera mostrar_formulario boolean).
    await agent
      .patch(`/admin/secciones/${seccionB.body.id}/configuracion`)
      .send({ mostrar_formulario: 'si' })
      .expect(400);

    // Edición general (titulo_visible).
    const editada = await agent
      .patch(`/admin/secciones/${seccionA.body.id}`)
      .send({ titulo_visible: `Hero editado ${sufijo}` })
      .expect(200);
    expect(editada.body.titulo_visible).toBe(`Hero editado ${sufijo}`);

    // Eliminar.
    await agent.delete(`/admin/secciones/${seccionB.body.id}`).expect(200);

    const listado3 = await agent.get('/admin/secciones').expect(200);
    const idsRestantes = listado3.body.map((s: { id: string }) => s.id);
    expect(idsRestantes).not.toContain(seccionB.body.id);
    expect(idsRestantes).toContain(seccionA.body.id);
  });

  // -----------------------------------------------------------------------
  // Regresión (Sprint 8, code-review): `mostrar_foto_perfil`/`posicion_foto`/
  // `estilo_foto` se agregaron a `HeroConfiguracionDto` DESPUÉS de que ya
  // existieran secciones `hero` publicadas cuya `configuracion` (jsonb) no
  // los tiene. Deben ser opcionales para que un PATCH "viejo" (solo
  // título/subtítulo, como cualquier admin antes de Sprint 8) sobre una de
  // esas filas siga aceptándose, sin exigir backfill de datos.
  // -----------------------------------------------------------------------

  it('PATCH /admin/secciones/:id/configuracion acepta una sección hero YA EXISTENTE (creada antes de Sprint 8, sin los campos nuevos de foto) actualizada con un payload "viejo"', async () => {
    const sufijo = Date.now();
    const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
      where: { email: process.env.ADMIN_EMAIL },
    });

    // Simula una fila persistida ANTES de Sprint 8: se crea directo contra
    // Prisma (no vía POST /admin/secciones, que hoy sí validaría/permitiría
    // los campos nuevos) con `configuracion` sin mostrar_foto_perfil/
    // posicion_foto/estilo_foto.
    const seccionHeroVieja = await prisma.seccion.create({
      data: {
        usuario_admin_id: admin.id,
        tipo_seccion: 'hero',
        titulo_visible: `Hero legado e2e ${sufijo}`,
        orden: 9700,
        visible: true,
        configuracion: {
          titulo: 'Hola legado',
          subtitulo: 'Bienvenido legado',
        },
      },
    });
    idsCreados.push(seccionHeroVieja.id);

    const configuracionEditadaSinCamposNuevos = {
      titulo: 'Título editado sin campos de foto',
      subtitulo: 'Subtítulo editado sin campos de foto',
    };

    const respuesta = await agent
      .patch(`/admin/secciones/${seccionHeroVieja.id}/configuracion`)
      .send(configuracionEditadaSinCamposNuevos)
      .expect(200);

    expect(respuesta.body.configuracion).toEqual(
      configuracionEditadaSinCamposNuevos,
    );
  });
});
