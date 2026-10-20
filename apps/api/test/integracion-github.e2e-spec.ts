import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

// La red segura resuelve el DNS antes de conectar: se fija una IP pública para
// que ningún test dependa de la red.
jest.mock('dns/promises', () => ({
  lookup: jest.fn().mockResolvedValue([{ address: '140.82.112.6', family: 4 }]),
}));

/**
 * UC-36 (Fase 7l): integración con GitHub, e2e contra la base real con
 * `fetch` interceptado (la API de GitHub nunca se contacta de verdad).
 *
 * Criterio de aceptación (docs/plan-portafolio.md): guardar el usuario y
 * pulsar "Sincronizar ahora" crea los proyectos que faltan y actualiza los
 * importados sin tocar los creados a mano; un repo privado nunca se importa.
 */
describe('Integración con GitHub (e2e, UC-36)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  const fetchOriginal = globalThis.fetch;
  let fetchMock: jest.Mock;
  let integracionPrevia: Awaited<
    ReturnType<PrismaService['integracionGithub']['findFirst']>
  >;

  const ID_BASE = 990_000_000;
  const REPOS = [
    repo(ID_BASE + 1, 'e2e-github-uno'),
    repo(ID_BASE + 2, 'e2e-github-privado', { private: true }),
    repo(ID_BASE + 3, 'e2e-github-fork', { fork: true }),
  ];

  function repo(id: number, name: string, extra: Record<string, unknown> = {}) {
    return {
      id,
      name,
      full_name: `usuario-e2e/${name}`,
      description: 'Repo de prueba e2e',
      html_url: `https://github.com/usuario-e2e/${name}`,
      homepage: null,
      private: false,
      fork: false,
      archived: false,
      language: 'TypeScript',
      topics: ['e2e-topic-github'],
      stargazers_count: 3,
      created_at: '2024-02-01T00:00:00Z',
      pushed_at: new Date().toISOString(),
      ...extra,
    };
  }

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
    integracionPrevia = await prisma.integracionGithub.findFirst();
    await prisma.integracionGithub.deleteMany();
    fetchMock = jest.fn(async () => {
      return new Response(JSON.stringify(REPOS), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          etag: 'W/"e2e"',
        },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(async () => {
    globalThis.fetch = fetchOriginal;
    const proyectos = await prisma.proyecto.findMany({
      where: { github_repo_id: { gte: BigInt(ID_BASE) } },
      select: { id: true },
    });
    const ids = proyectos.map((p) => p.id);
    await prisma.proyectoTecnologia.deleteMany({
      where: { proyecto_id: { in: ids } },
    });
    await prisma.proyecto.deleteMany({ where: { id: { in: ids } } });
    await prisma.tecnologia.deleteMany({
      where: { nombre: 'e2e-topic-github' },
    });
    await prisma.integracionGithub.deleteMany();
    if (integracionPrevia) {
      await prisma.integracionGithub.create({
        data: {
          usuario_admin_id: integracionPrevia.usuario_admin_id,
          usuario_github: integracionPrevia.usuario_github,
          activa: integracionPrevia.activa,
          intervalo_horas: integracionPrevia.intervalo_horas,
          publicar_automaticamente: integracionPrevia.publicar_automaticamente,
          incluir_forks: integracionPrevia.incluir_forks,
          incluir_archivados: integracionPrevia.incluir_archivados,
          destacar_nuevos: integracionPrevia.destacar_nuevos,
          ultima_sincronizacion_en: integracionPrevia.ultima_sincronizacion_en,
          ultimo_error: integracionPrevia.ultimo_error,
          etag: integracionPrevia.etag,
        },
      });
    }
    await app.close();
  });

  it('las tres rutas sin cookie responden 401', async () => {
    const http = request(app.getHttpServer());
    await http.get('/admin/integraciones/github').expect(401);
    await http
      .put('/admin/integraciones/github')
      .send({ usuario_github: 'a' })
      .expect(401);
    await http.post('/admin/integraciones/github/sincronizar').expect(401);
  });

  it('GET sin configurar devuelve null', async () => {
    const res = await agent.get('/admin/integraciones/github').expect(200);
    expect(res.body).toBeNull();
  });

  it('sincronizar sin integración responde 404', async () => {
    await agent.post('/admin/integraciones/github/sincronizar').expect(404);
  });

  it.each([
    [{ usuario_github: '-empieza' }],
    [{ usuario_github: 'termina-' }],
    [{ usuario_github: 'con espacio' }],
    [{ usuario_github: 'a'.repeat(40) }],
    [{ usuario_github: '' }],
    [{}],
    [{ usuario_github: 'ok', intervalo_horas: 0 }],
    [{ usuario_github: 'ok', intervalo_horas: 169 }],
    [{ usuario_github: 'ok', activa: 'si' }],
    [{ usuario_github: 'ok', etag: 'x' }],
  ])('PUT rechaza %j con 400', async (cuerpo) => {
    await agent.put('/admin/integraciones/github').send(cuerpo).expect(400);
  });

  it('PUT crea y luego actualiza; GET devuelve la forma documentada sin etag', async () => {
    const creada = await agent
      .put('/admin/integraciones/github')
      .send({ usuario_github: 'usuario-e2e', activa: false })
      .expect(200);
    expect(creada.body).toMatchObject({
      usuario_github: 'usuario-e2e',
      activa: false,
      intervalo_horas: 6,
      publicar_automaticamente: false,
      incluir_forks: false,
      incluir_archivados: false,
      destacar_nuevos: false,
      ultima_sincronizacion_en: null,
      ultimo_error: null,
    });
    expect(creada.body.etag).toBeUndefined();
    expect(creada.body.usuario_admin_id).toBeUndefined();

    const actualizada = await agent
      .put('/admin/integraciones/github')
      .send({ usuario_github: 'usuario-e2e', intervalo_horas: 12 })
      .expect(200);
    expect(actualizada.body.id).toBe(creada.body.id);
    expect(actualizada.body.intervalo_horas).toBe(12);

    const leida = await agent.get('/admin/integraciones/github').expect(200);
    expect(leida.body.usuario_github).toBe('usuario-e2e');
    expect(await prisma.integracionGithub.count()).toBe(1);
  });

  let idImportado: string;

  it('sincronizar crea los proyectos públicos, omite privado y fork, y los expone con origen', async () => {
    const res = await agent
      .post('/admin/integraciones/github/sincronizar')
      .expect(201);
    expect(res.body).toMatchObject({
      creados: 1,
      actualizados: 0,
      omitidos: 2,
      errores: [],
      publicado: false,
    });
    expect(typeof res.body.sincronizado_en).toBe('string');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      'https://api.github.com/users/usuario-e2e/repos',
    );
    expect(init.headers.Accept).toBe('application/vnd.github+json');
    expect(init.headers['X-GitHub-Api-Version']).toBe('2022-11-28');

    const lista = await agent.get('/admin/proyectos').expect(200);
    const importado = (lista.body as Record<string, any>[]).find(
      (p) => p.github_nombre_completo === 'usuario-e2e/e2e-github-uno',
    );
    expect(importado).toBeDefined();
    idImportado = importado!.id;
    expect(importado).toMatchObject({
      titulo: 'E2e github uno',
      origen: 'github',
      github_repo_id: String(ID_BASE + 1),
      github_lenguaje: 'TypeScript',
      github_estrellas: 3,
      sincronizar_github: true,
      estado: 'en_progreso',
      url_repositorio: 'https://github.com/usuario-e2e/e2e-github-uno',
    });
    expect(typeof importado!.github_actualizado_en).toBe('string');
    expect(
      (lista.body as Record<string, any>[]).some(
        (p) => String(p.github_repo_id) === String(ID_BASE + 2),
      ),
    ).toBe(false);

    const integracion = await agent
      .get('/admin/integraciones/github')
      .expect(200);
    expect(integracion.body.ultima_sincronizacion_en).not.toBeNull();
    expect(integracion.body.ultimo_error).toBeNull();
  });

  it('una segunda sincronización no duplica (todo omitido)', async () => {
    const res = await agent
      .post('/admin/integraciones/github/sincronizar')
      .expect(201);
    expect(res.body).toMatchObject({
      creados: 0,
      actualizados: 0,
      omitidos: 3,
    });
    expect(
      await prisma.proyecto.count({
        where: { github_repo_id: BigInt(ID_BASE + 1) },
      }),
    ).toBe(1);
  });

  it('el snapshot (preview) serializa el proyecto importado sin romper con BigInt', async () => {
    const res = await agent.post('/admin/versiones/preview').expect(201);
    const guardado = await prisma.versionSitio.findUnique({
      where: { id: res.body.id },
    });
    const proyectos = (guardado!.snapshot as Record<string, any>).proyectos;
    const p = proyectos.find((x: Record<string, any>) => x.id === idImportado);
    expect(p).toMatchObject({
      origen: 'github',
      github_repo_id: String(ID_BASE + 1),
      github_nombre_completo: 'usuario-e2e/e2e-github-uno',
    });
    await prisma.versionSitio.delete({ where: { id: res.body.id } });
  });

  it('PATCH de título o enlaces de un importado sincronizado responde 409; sincronizar_github y otros campos no', async () => {
    const r = await agent
      .patch(`/admin/proyectos/${idImportado}`)
      .send({ titulo: 'Otro título' })
      .expect(409);
    expect(JSON.stringify(r.body)).toContain(
      'Desactiva la sincronización con GitHub',
    );
    await agent
      .patch(`/admin/proyectos/${idImportado}`)
      .send({ url_demo: 'https://otro.example.com' })
      .expect(409);
    // Enviar el mismo valor no es un cambio.
    await agent
      .patch(`/admin/proyectos/${idImportado}`)
      .send({ titulo: 'E2e github uno' })
      .expect(200);
    await agent
      .patch(`/admin/proyectos/${idImportado}`)
      .send({ destacado: true })
      .expect(200);
  });

  it('origen y los campos github_* no son editables (whitelist, 400)', async () => {
    for (const cuerpo of [
      { origen: 'manual' },
      { github_repo_id: '1' },
      { github_estrellas: 99 },
      { github_lenguaje: 'Go' },
    ]) {
      await agent
        .patch(`/admin/proyectos/${idImportado}`)
        .send(cuerpo)
        .expect(400);
    }
  });

  it('tras apagar sincronizar_github el PATCH responde 200 y la sincronización no lo pisa', async () => {
    await agent
      .patch(`/admin/proyectos/${idImportado}`)
      .send({ sincronizar_github: false, titulo: 'Editado a mano' })
      .expect(200);
    const lista = await agent.get('/admin/proyectos').expect(200);
    const p = (lista.body as Record<string, any>[]).find(
      (x) => x.id === idImportado,
    );
    expect(p).toMatchObject({
      titulo: 'Editado a mano',
      sincronizar_github: false,
    });

    const res = await agent
      .post('/admin/integraciones/github/sincronizar')
      .expect(201);
    expect(res.body).toMatchObject({ creados: 0, actualizados: 0 });
    const despues = await prisma.proyecto.findUnique({
      where: { id: idImportado },
    });
    expect(despues!.titulo).toBe('Editado a mano');
  });

  it('un fallo de GitHub se informa y queda en ultimo_error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('no', { status: 404 }));
    const res = await agent
      .post('/admin/integraciones/github/sincronizar')
      .expect(201);
    expect(res.body.errores).toHaveLength(1);
    const integracion = await agent
      .get('/admin/integraciones/github')
      .expect(200);
    expect(integracion.body.ultimo_error).toContain('usuario-e2e');
  });

  // Fase 7m (#66): README de GitHub cacheado.
  describe('README (Fase 7m, #66)', () => {
    const MD = '# Hola\n\nPerfil de prueba e2e';

    it('las rutas del README sin cookie responden 401', async () => {
      const http = request(app.getHttpServer());
      await http.get('/admin/integraciones/github/readme').expect(401);
      await http
        .post('/admin/integraciones/github/readme/actualizar')
        .expect(401);
    });

    it.each([
      [{ readme_repositorio: 'sin-barra' }],
      [{ readme_repositorio: '-a/b' }],
      [{ readme_repositorio: 'a/b c' }],
      [{ readme_repositorio: 'a/' }],
      [{ readme_rama: 'con espacio' }],
      [{ readme_rama: '' }],
    ])('PUT rechaza %j con 400', async (extra) => {
      await agent
        .put('/admin/integraciones/github')
        .send({ usuario_github: 'usuario-e2e', ...extra })
        .expect(400);
    });

    it('PUT guarda readme_repositorio y readme_rama sin exponer markdown ni etag', async () => {
      const res = await agent
        .put('/admin/integraciones/github')
        .send({
          usuario_github: 'usuario-e2e',
          readme_repositorio: 'usuario-e2e/usuario-e2e',
          readme_rama: 'main',
        })
        .expect(200);
      expect(res.body).toMatchObject({
        readme_repositorio: 'usuario-e2e/usuario-e2e',
        readme_rama: 'main',
      });
      expect(res.body.readme_markdown).toBeUndefined();
      expect(res.body.readme_etag).toBeUndefined();
    });

    it('GET readme sin descargar devuelve la forma vacía', async () => {
      const res = await agent
        .get('/admin/integraciones/github/readme')
        .expect(200);
      expect(res.body).toEqual({
        repositorio: 'usuario-e2e/usuario-e2e',
        rama: 'main',
        markdown: null,
        actualizado_en: null,
        error: null,
      });
    });

    it('actualizar descarga con fetch interceptado y el GET devuelve el markdown', async () => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValueOnce(
        new Response(MD, {
          status: 200,
          headers: {
            'content-type': 'application/vnd.github.raw+json; charset=utf-8',
            etag: '"readme-e2e"',
          },
        }),
      );
      const res = await agent
        .post('/admin/integraciones/github/readme/actualizar')
        .expect(201);
      expect(res.body).toMatchObject({
        repositorio: 'usuario-e2e/usuario-e2e',
        rama: 'main',
        markdown: MD,
        error: null,
      });
      expect(typeof res.body.actualizado_en).toBe('string');

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe(
        'https://api.github.com/repos/usuario-e2e/usuario-e2e/readme?ref=main',
      );
      expect(init.headers.Accept).toBe('application/vnd.github.raw+json');

      const leido = await agent
        .get('/admin/integraciones/github/readme')
        .expect(200);
      expect(leido.body.markdown).toBe(MD);
    });

    it('un 404 de GitHub queda en error y responde 201 sin borrar el markdown', async () => {
      fetchMock.mockResolvedValueOnce(new Response('no', { status: 404 }));
      const res = await agent
        .post('/admin/integraciones/github/readme/actualizar')
        .expect(201);
      expect(res.body.error).toBe(
        'No existe el README en usuario-e2e/usuario-e2e@main',
      );
      expect(res.body.markdown).toBe(MD);
    });

    it('PUT sin readme_* conserva lo guardado (ausente = no se toca)', async () => {
      await agent
        .put('/admin/integraciones/github')
        .send({
          usuario_github: 'usuario-e2e',
          readme_repositorio: 'usuario-e2e/usuario-e2e',
        })
        .expect(200);
      fetchMock.mockResolvedValueOnce(
        new Response(MD, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        }),
      );
      await agent
        .post('/admin/integraciones/github/readme/actualizar')
        .expect(201);

      const res = await agent
        .put('/admin/integraciones/github')
        .send({ usuario_github: 'usuario-e2e', intervalo_horas: 8 })
        .expect(200);
      expect(res.body.readme_repositorio).toBe('usuario-e2e/usuario-e2e');
      const leido = await agent
        .get('/admin/integraciones/github/readme')
        .expect(200);
      expect(leido.body.markdown).toBe(MD);
    });

    it('readme_repositorio null limpia la caché', async () => {
      await agent
        .put('/admin/integraciones/github')
        .send({ usuario_github: 'usuario-e2e', readme_repositorio: null })
        .expect(200);
      const res = await agent
        .get('/admin/integraciones/github/readme')
        .expect(200);
      expect(res.body).toMatchObject({
        repositorio: null,
        markdown: null,
        actualizado_en: null,
        error: null,
      });
    });
  });
});
