import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-06 (Gestionar enlaces de redes), e2e contra la base de datos real. Se
 * agrupa con el catálogo de plataformas de red (soporte de UC-06, sembrado
 * por prisma/seed.ts) porque cada enlace referencia una plataforma existente.
 *
 * Criterio de aceptación (docs/plan-portafolio.md): "Cada enlace abre la red
 * social correcta y respeta el orden e ícono configurado."
 */
describe('Redes sociales (e2e, UC-06)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plataforma: any;

  const idsCreados: string[] = [];

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);

    // Del catálogo sembrado (prisma/seed.ts): LinkedIn, GitHub, Twitter/X, Correo, Sitio personal.
    plataforma = await prisma.plataformaRed.findFirstOrThrow();
  });

  afterAll(async () => {
    await prisma.redSocial.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  // -----------------------------------------------------------------------
  // 401
  // -----------------------------------------------------------------------

  it('GET /admin/redes-sociales sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/redes-sociales').expect(401);
  });

  it('POST /admin/redes-sociales sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/redes-sociales')
      .send({
        plataforma_id: randomUUID(),
        url: 'https://example.com',
        orden: 1,
      })
      .expect(401);
  });

  it('PATCH /admin/redes-sociales/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/redes-sociales/${randomUUID()}`)
      .send({ url: 'https://example.com' })
      .expect(401);
  });

  it('DELETE /admin/redes-sociales/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/redes-sociales/${randomUUID()}`)
      .expect(401);
  });

  it('GET /admin/plataformas-red sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .get('/admin/plataformas-red')
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 400
  // -----------------------------------------------------------------------

  it('POST /admin/redes-sociales rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/redes-sociales')
      .send({
        plataforma_id: plataforma.id,
        url: 'https://example.com',
        orden: 1,
        icono: 'no-declarado',
      })
      .expect(400);
  });

  // -----------------------------------------------------------------------
  // Caso feliz + criterio de aceptación de UC-06
  // -----------------------------------------------------------------------

  it('lista el catálogo de plataformas para el admin', async () => {
    const respuesta = await agent.get('/admin/plataformas-red').expect(200);
    expect(Array.isArray(respuesta.body)).toBe(true);
    expect(respuesta.body.length).toBeGreaterThan(0);
    expect(respuesta.body[0]).toHaveProperty('icono_defecto');
  });

  it('crea, lista (público, con plataforma e ícono), edita y elimina un enlace de red', async () => {
    const sufijo = Date.now();
    const urlOriginal = `https://example.com/perfil-${sufijo}`;

    const creada = await agent
      .post('/admin/redes-sociales')
      .send({ plataforma_id: plataforma.id, url: urlOriginal, orden: 9001 })
      .expect(201);
    idsCreados.push(creada.body.id);

    expect(creada.body.plataforma).toMatchObject({
      id: plataforma.id,
      nombre: plataforma.nombre,
      icono_defecto: plataforma.icono_defecto,
    });

    // Lista pública: incluye la plataforma (nombre + ícono) y respeta la URL configurada.
    const listaPublica = await request(app.getHttpServer())
      .get('/redes')
      .expect(200);
    const enListaPublica = listaPublica.body.find(
      (r: { id: string }) => r.id === creada.body.id,
    );
    expect(enListaPublica).toBeDefined();
    expect(enListaPublica.url).toBe(urlOriginal);
    expect(enListaPublica.plataforma.icono_defecto).toBe(
      plataforma.icono_defecto,
    );

    // Editar la URL se refleja en la lista pública.
    const urlEditada = `https://example.com/perfil-editado-${sufijo}`;
    await agent
      .patch(`/admin/redes-sociales/${creada.body.id}`)
      .send({ url: urlEditada })
      .expect(200);

    const listaTrasEditar = await request(app.getHttpServer())
      .get('/redes')
      .expect(200);
    expect(
      listaTrasEditar.body.find((r: { id: string }) => r.id === creada.body.id)
        .url,
    ).toBe(urlEditada);

    // Eliminar la saca de la lista pública.
    await agent.delete(`/admin/redes-sociales/${creada.body.id}`).expect(200);

    const listaTrasEliminar = await request(app.getHttpServer())
      .get('/redes')
      .expect(200);
    expect(
      listaTrasEliminar.body.some(
        (r: { id: string }) => r.id === creada.body.id,
      ),
    ).toBe(false);
  });
});
