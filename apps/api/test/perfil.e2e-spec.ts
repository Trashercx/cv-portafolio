import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-02 (Gestionar perfil personal), e2e contra la base de datos real.
 * Criterio de aceptación (docs/plan-portafolio.md): "Los cambios guardados
 * aparecen reflejados en la sección 'Sobre mí' del sitio publicado." En
 * Sprint 1, sin snapshot publicado todavía (UC-12, Sprint 4), el proxy de
 * ese criterio es: lo que se guarda vía `PUT /admin/perfil` se lee de
 * vuelta exactamente igual en `GET /admin/perfil`.
 */
describe('Perfil admin (e2e, UC-02)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let perfilOriginal: any;

  const dtoValido = {
    nombre_completo: 'Ada Lovelace',
    titulo_profesional: 'Ingeniera de Software',
    resumen_bio: 'Bio de prueba generada por el e2e de UC-02.',
    ubicacion: 'Remoto',
  };

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);

    const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
      where: { email: process.env.ADMIN_EMAIL as string },
    });
    perfilOriginal = await prisma.perfil.findUnique({
      where: { usuario_admin_id: admin.id },
    });
  });

  afterAll(async () => {
    // Deja la tabla `perfil` en el estado en el que la encontramos.
    if (perfilOriginal) {
      await prisma.perfil.update({
        where: { id: perfilOriginal.id },
        data: {
          nombre_completo: perfilOriginal.nombre_completo,
          titulo_profesional: perfilOriginal.titulo_profesional,
          resumen_bio: perfilOriginal.resumen_bio,
          imagen_perfil_id: perfilOriginal.imagen_perfil_id,
          cv_media_id: perfilOriginal.cv_media_id,
          ubicacion: perfilOriginal.ubicacion,
        },
      });
    } else {
      const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
        where: { email: process.env.ADMIN_EMAIL as string },
      });
      await prisma.perfil.deleteMany({
        where: { usuario_admin_id: admin.id },
      });
    }

    await app.close();
  });

  it('GET /admin/perfil sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/perfil').expect(401);
  });

  it('PUT /admin/perfil sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .put('/admin/perfil')
      .send(dtoValido)
      .expect(401);
  });

  it('rechaza campos fuera del DTO (whitelist/forbidNonWhitelisted)', async () => {
    await agent
      .put('/admin/perfil')
      .send({ ...dtoValido, rol: 'super-admin' })
      .expect(400);
  });

  it('guarda el perfil y lo refleja al leerlo de nuevo (UC-02)', async () => {
    const respuestaGuardado = await agent
      .put('/admin/perfil')
      .send(dtoValido)
      .expect(200);

    expect(respuestaGuardado.body).toMatchObject(dtoValido);

    const respuestaLectura = await agent.get('/admin/perfil').expect(200);

    expect(respuestaLectura.body).toMatchObject(dtoValido);
  });

  it('un segundo guardado actualiza (upsert) en vez de duplicar', async () => {
    const dtoActualizado = { ...dtoValido, ubicacion: 'Lima, Perú' };

    await agent.put('/admin/perfil').send(dtoActualizado).expect(200);

    const respuestaLectura = await agent.get('/admin/perfil').expect(200);
    expect(respuestaLectura.body.ubicacion).toBe('Lima, Perú');

    const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
      where: { email: process.env.ADMIN_EMAIL as string },
    });
    const filas = await prisma.perfil.findMany({
      where: { usuario_admin_id: admin.id },
    });
    expect(filas).toHaveLength(1);
  });
});
