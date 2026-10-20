import { NotFoundException } from '@nestjs/common';
import {
  descargarRecursoSeguro,
  RedSeguraError,
} from '../insignias/red-segura';
import { GithubSyncService, humanizarNombreRepo } from './github-sync.service';

jest.mock('../insignias/red-segura', () => ({
  ...jest.requireActual('../insignias/red-segura'),
  descargarRecursoSeguro: jest.fn(),
}));

const descargar = descargarRecursoSeguro as unknown as jest.Mock;

const ADMIN = 'admin-1';
const AHORA = Date.now();
const haceDias = (d: number) => new Date(AHORA - d * 86_400_000).toISOString();

function repo(sobrescribir: Record<string, unknown> = {}) {
  return {
    id: 1001,
    name: 'mi-api-rest',
    full_name: 'oscar/mi-api-rest',
    description: 'Una API',
    html_url: 'https://github.com/oscar/mi-api-rest',
    homepage: 'https://demo.example.com',
    private: false,
    fork: false,
    archived: false,
    language: 'TypeScript',
    topics: ['nestjs', 'prisma'],
    stargazers_count: 7,
    created_at: '2024-01-15T10:00:00Z',
    pushed_at: haceDias(10),
    ...sobrescribir,
  };
}

function pagina(
  repos: unknown[],
  cabeceras: Record<string, string> = {},
  status = 200,
) {
  return {
    buffer: Buffer.from(JSON.stringify(repos)),
    contentType: 'application/json',
    urlFinal: 'https://api.github.com/x',
    status,
    cabeceras,
  };
}

/** Prisma en memoria con solo lo que usa el servicio. */
function crearPrismaFalso(integracionInicial: Record<string, unknown> = {}) {
  const integracion: Record<string, unknown> = {
    id: 'int-1',
    usuario_admin_id: ADMIN,
    usuario_github: 'oscar',
    activa: true,
    intervalo_horas: 6,
    publicar_automaticamente: false,
    incluir_forks: false,
    incluir_archivados: false,
    destacar_nuevos: false,
    ultima_sincronizacion_en: null,
    ultimo_error: null,
    etag: null,
    ...integracionInicial,
  };
  const proyectos: Record<string, any>[] = [];
  const tecnologias = new Map<string, string>();
  const prisma = {
    integracionGithub: {
      findUnique: jest.fn(async () => integracion),
      findMany: jest.fn(async () => [integracion]),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) =>
        Object.assign(integracion, data),
      ),
    },
    proyecto: {
      findUnique: jest.fn(
        async ({ where }: { where: { github_repo_id: bigint } }) => {
          const p = proyectos.find(
            (x) => x.github_repo_id === where.github_repo_id,
          );
          return p
            ? {
                ...p,
                tecnologias: p.tecnologias_ids.map((id: string) => ({
                  tecnologia_id: id,
                })),
              }
            : null;
        },
      ),
      aggregate: jest.fn(async () => ({
        _max: { orden: proyectos.length ? proyectos.length : null },
      })),
      create: jest.fn(async ({ data }: { data: Record<string, any> }) => {
        const { tecnologias: rel, ...resto } = data;
        const p = {
          id: `p-${proyectos.length + 1}`,
          ...resto,
          tecnologias_ids: rel.create.map(
            (t: { tecnologia_id: string }) => t.tecnologia_id,
          ),
        };
        proyectos.push(p);
        return p;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const p = proyectos.find((x) => x.id === where.id)!;
          const { tecnologias: rel, ...resto } = data;
          Object.assign(p, resto);
          p.tecnologias_ids.push(
            ...rel.create.map(
              (t: { tecnologia_id: string }) => t.tecnologia_id,
            ),
          );
          return p;
        },
      ),
    },
    tecnologia: {
      upsert: jest.fn(async ({ where }: { where: { nombre: string } }) => {
        if (!tecnologias.has(where.nombre)) {
          tecnologias.set(where.nombre, `t-${where.nombre}`);
        }
        return { id: tecnologias.get(where.nombre)!, nombre: where.nombre };
      }),
    },
  };
  return { prisma, integracion, proyectos };
}

function crearServicio(integracionInicial: Record<string, unknown> = {}) {
  const falso = crearPrismaFalso(integracionInicial);
  const versiones = { publicar: jest.fn().mockResolvedValue({ id: 'v1' }) };
  const readme = {
    refrescar: jest.fn(async (i: unknown) => i),
  };
  const servicio = new GithubSyncService(
    falso.prisma as never,
    versiones as never,
    readme as never,
  );
  return { servicio, versiones, readme, ...falso };
}

describe('GithubSyncService (Fase 7l, UC-36)', () => {
  const tokenOriginal = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    descargar.mockReset();
    delete process.env.GITHUB_TOKEN;
  });
  afterAll(() => {
    if (tokenOriginal === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = tokenOriginal;
  });

  it('humaniza el nombre del repo', () => {
    expect(humanizarNombreRepo('mi-api-rest')).toBe('Mi api rest');
    expect(humanizarNombreRepo('portafolio_cv')).toBe('Portafolio cv');
  });

  it('lanza 404 si no hay integración configurada', async () => {
    const { servicio, prisma } = crearServicio();
    prisma.integracionGithub.findUnique.mockResolvedValueOnce(null as never);
    await expect(servicio.sincronizar(ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('crea el proyecto con el mapeo del contrato', async () => {
    const { servicio, proyectos, integracion } = crearServicio({
      destacar_nuevos: true,
    });
    descargar.mockResolvedValue(pagina([repo()], { etag: 'W/"e1"' }));

    const r = await servicio.sincronizar(ADMIN);

    expect(r).toMatchObject({
      creados: 1,
      actualizados: 0,
      omitidos: 0,
      errores: [],
      publicado: false,
    });
    expect(typeof r.sincronizado_en).toBe('string');
    expect(proyectos).toHaveLength(1);
    expect(proyectos[0]).toMatchObject({
      usuario_admin_id: ADMIN,
      titulo: 'Mi api rest',
      descripcion: 'Una API',
      url_repositorio: 'https://github.com/oscar/mi-api-rest',
      url_demo: 'https://demo.example.com/',
      estado: 'en_progreso',
      destacado: true,
      origen: 'github',
      sincronizar_github: true,
      github_repo_id: BigInt(1001),
      github_nombre_completo: 'oscar/mi-api-rest',
      github_lenguaje: 'TypeScript',
      github_estrellas: 7,
    });
    expect(proyectos[0].fecha_inicio).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(proyectos[0].github_actualizado_en).toBeInstanceOf(Date);
    // topics + language
    expect(proyectos[0].tecnologias_ids.sort()).toEqual(
      ['t-TypeScript', 't-nestjs', 't-prisma'].sort(),
    );
    expect(integracion.etag).toBe('W/"e1"');
    expect(integracion.ultimo_error).toBeNull();
    expect(integracion.ultima_sincronizacion_en).toBeInstanceOf(Date);
  });

  it('usa la descripción de respaldo, ignora un homepage http y marca finalizado un repo viejo', async () => {
    const { servicio, proyectos } = crearServicio();
    descargar.mockResolvedValue(
      pagina([
        repo({
          description: null,
          homepage: 'http://inseguro.test',
          pushed_at: haceDias(200),
          topics: [],
          language: null,
        }),
      ]),
    );
    await servicio.sincronizar(ADMIN);
    expect(proyectos[0]).toMatchObject({
      descripcion: 'Repositorio mi-api-rest en GitHub.',
      url_demo: null,
      estado: 'finalizado',
      destacado: false,
    });
    expect(proyectos[0].tecnologias_ids).toEqual([]);
  });

  it('pide a GitHub con la cabecera de versión, sin Authorization si no hay token', async () => {
    const { servicio } = crearServicio();
    descargar.mockResolvedValue(pagina([]));
    await servicio.sincronizar(ADMIN);
    const [url, opciones] = descargar.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/users/oscar/repos?type=owner&sort=updated&per_page=100&page=1',
    );
    expect(opciones.accept).toBe('application/vnd.github+json');
    expect(opciones.cabeceras['X-GitHub-Api-Version']).toBe('2022-11-28');
    expect(opciones.cabeceras.Authorization).toBeUndefined();
    expect(opciones.cabeceras['If-None-Match']).toBeUndefined();
  });

  it('envía Authorization: Bearer cuando existe GITHUB_TOKEN', async () => {
    process.env.GITHUB_TOKEN = 'ghp_prueba';
    const { servicio } = crearServicio();
    descargar.mockResolvedValue(pagina([]));
    await servicio.sincronizar(ADMIN);
    expect(descargar.mock.calls[0][1].cabeceras.Authorization).toBe(
      'Bearer ghp_prueba',
    );
  });

  it('actualiza un importado sin tocar el título ni el destacado, y no pierde tecnologías manuales', async () => {
    const { servicio, proyectos } = crearServicio({ destacar_nuevos: false });
    descargar.mockResolvedValue(pagina([repo()]));
    await servicio.sincronizar(ADMIN);
    // El administrador renombró (apagando antes la sincronización no hace falta
    // para este caso: el título nunca se reescribe) y lo destacó.
    proyectos[0].titulo = 'Mi API favorita';
    proyectos[0].destacado = true;
    proyectos[0].tecnologias_ids.push('t-manual');

    descargar.mockResolvedValue(
      pagina([
        repo({
          description: 'Descripción nueva',
          stargazers_count: 42,
          topics: ['nestjs', 'prisma', 'jest'],
        }),
      ]),
    );
    const r = await servicio.sincronizar(ADMIN);

    expect(r).toMatchObject({ creados: 0, actualizados: 1, omitidos: 0 });
    expect(proyectos).toHaveLength(1);
    expect(proyectos[0]).toMatchObject({
      titulo: 'Mi API favorita',
      destacado: true,
      descripcion: 'Descripción nueva',
      github_estrellas: 42,
    });
    expect(proyectos[0].tecnologias_ids).toEqual(
      expect.arrayContaining(['t-manual', 't-jest', 't-nestjs']),
    );
  });

  it('un repo sin cambios cuenta como omitido', async () => {
    const { servicio } = crearServicio();
    descargar.mockResolvedValue(pagina([repo()]));
    await servicio.sincronizar(ADMIN);
    const r = await servicio.sincronizar(ADMIN);
    expect(r).toMatchObject({ creados: 0, actualizados: 0, omitidos: 1 });
  });

  it('respeta un proyecto con sincronizar_github=false y uno manual con el mismo repo', async () => {
    const { servicio, proyectos } = crearServicio();
    descargar.mockResolvedValue(
      pagina([repo(), repo({ id: 1002, name: 'otro' })]),
    );
    await servicio.sincronizar(ADMIN);
    proyectos[0].sincronizar_github = false;
    proyectos[0].descripcion = 'Editada a mano';
    proyectos[1].origen = 'manual';
    proyectos[1].descripcion = 'Manual';

    descargar.mockResolvedValue(
      pagina([
        repo({ description: 'Pisaría' }),
        repo({ id: 1002, name: 'otro', description: 'Pisaría' }),
      ]),
    );
    const r = await servicio.sincronizar(ADMIN);

    expect(r).toMatchObject({ creados: 0, actualizados: 0, omitidos: 2 });
    expect(proyectos[0].descripcion).toBe('Editada a mano');
    expect(proyectos[1].descripcion).toBe('Manual');
  });

  it('omite privados, forks y archivados salvo que la configuración los incluya', async () => {
    const lista = [
      repo({ id: 1, name: 'privado', private: true }),
      repo({ id: 2, name: 'fork', fork: true }),
      repo({ id: 3, name: 'viejo', archived: true }),
      repo({ id: 4, name: 'normal' }),
    ];

    const a = crearServicio();
    descargar.mockResolvedValue(pagina(lista));
    const ra = await a.servicio.sincronizar(ADMIN);
    expect(ra).toMatchObject({ creados: 1, omitidos: 3 });
    expect(a.proyectos.map((p) => p.github_repo_id)).toEqual([BigInt(4)]);

    const b = crearServicio({ incluir_forks: true, incluir_archivados: true });
    descargar.mockResolvedValue(pagina(lista));
    const rb = await b.servicio.sincronizar(ADMIN);
    // El privado nunca se importa, ni con las dos opciones.
    expect(rb).toMatchObject({ creados: 3, omitidos: 1 });
    expect(b.proyectos.map((p) => p.github_repo_id)).not.toContain(BigInt(1));
  });

  it('sigue el Link rel="next" hasta agotar las páginas', async () => {
    const { servicio, proyectos } = crearServicio();
    descargar
      .mockResolvedValueOnce(
        pagina([repo({ id: 1, name: 'a' })], {
          link: '<https://api.github.com/user/1/repos?page=2>; rel="next", <https://api.github.com/user/1/repos?page=3>; rel="last"',
        }),
      )
      .mockResolvedValueOnce(pagina([repo({ id: 2, name: 'b' })]));
    const r = await servicio.sincronizar(ADMIN);
    expect(r.creados).toBe(2);
    expect(proyectos).toHaveLength(2);
    expect(descargar.mock.calls[1][0]).toBe(
      'https://api.github.com/user/1/repos?page=2',
    );
    // Solo la primera página es condicional.
    expect(descargar.mock.calls[1][1].aceptar304).toBe(false);
  });

  it('corta en 10 páginas y no sigue un next que apunta fuera de api.github.com', async () => {
    const a = crearServicio();
    descargar.mockImplementation(async () =>
      pagina([], { link: '<https://api.github.com/x?page=n>; rel="next"' }),
    );
    await a.servicio.sincronizar(ADMIN);
    expect(descargar).toHaveBeenCalledTimes(10);

    descargar.mockReset();
    descargar.mockResolvedValue(
      pagina([], { link: '<https://evil.test/x>; rel="next"' }),
    );
    await crearServicio().servicio.sincronizar(ADMIN);
    expect(descargar).toHaveBeenCalledTimes(1);
  });

  it('con 304 no cambia nada y solo actualiza la fecha de sincronización', async () => {
    const { servicio, proyectos, integracion, versiones } = crearServicio({
      etag: 'W/"e1"',
      publicar_automaticamente: true,
      ultimo_error: 'viejo',
    });
    descargar.mockResolvedValue(pagina([], {}, 304));
    const r = await servicio.sincronizar(ADMIN);
    expect(descargar.mock.calls[0][1].cabeceras['If-None-Match']).toBe(
      'W/"e1"',
    );
    expect(r).toMatchObject({
      creados: 0,
      actualizados: 0,
      omitidos: 0,
      publicado: false,
    });
    expect(proyectos).toHaveLength(0);
    expect(versiones.publicar).not.toHaveBeenCalled();
    expect(integracion.etag).toBe('W/"e1"');
    expect(integracion.ultimo_error).toBeNull();
    expect(integracion.ultima_sincronizacion_en).toBeInstanceOf(Date);
  });

  it('publica solo si está activada la publicación automática y hubo cambios', async () => {
    const con = crearServicio({ publicar_automaticamente: true });
    descargar.mockResolvedValue(pagina([repo()]));
    const r1 = await con.servicio.sincronizar(ADMIN);
    expect(r1.publicado).toBe(true);
    expect(con.versiones.publicar).toHaveBeenCalledWith(ADMIN);

    // Segunda vuelta sin cambios: no vuelve a publicar.
    const r2 = await con.servicio.sincronizar(ADMIN);
    expect(r2.publicado).toBe(false);
    expect(con.versiones.publicar).toHaveBeenCalledTimes(1);

    const sin = crearServicio({ publicar_automaticamente: false });
    descargar.mockResolvedValue(pagina([repo()]));
    const r3 = await sin.servicio.sincronizar(ADMIN);
    expect(r3.publicado).toBe(false);
    expect(sin.versiones.publicar).not.toHaveBeenCalled();
  });

  it('guarda ultimo_error si falla la descarga y lo limpia al sincronizar bien', async () => {
    const { servicio, integracion } = crearServicio({ etag: 'W/"e1"' });
    descargar.mockRejectedValueOnce(
      new RedSeguraError('El servidor respondió 404'),
    );
    const r = await servicio.sincronizar(ADMIN);
    expect(r.errores).toEqual(['No existe el usuario de GitHub "oscar"']);
    expect(integracion.ultimo_error).toBe(
      'No existe el usuario de GitHub "oscar"',
    );
    expect(r.creados).toBe(0);

    descargar.mockResolvedValue(pagina([repo()]));
    const r2 = await servicio.sincronizar(ADMIN);
    expect(r2.errores).toEqual([]);
    expect(integracion.ultimo_error).toBeNull();
  });

  it('un error en un repo no detiene a los demás y se informa', async () => {
    const { servicio, prisma, proyectos, integracion } = crearServicio();
    const crear = prisma.proyecto.create.getMockImplementation()!;
    prisma.proyecto.create.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    descargar.mockResolvedValue(
      pagina([repo({ id: 1, name: 'falla' }), repo({ id: 2, name: 'bien' })]),
    );
    const r = await servicio.sincronizar(ADMIN);
    expect(crear).toBeDefined();
    expect(r.creados).toBe(1);
    expect(r.errores).toEqual(['falla: boom']);
    expect(proyectos).toHaveLength(1);
    expect(integracion.ultimo_error).toContain('1 error(es)');
    // Con errores no se guarda el ETag.
    expect(integracion.etag).toBeNull();
  });

  describe('cron: sincronizarVencidas', () => {
    it('sincroniza las activas sin sincronizar o con el intervalo vencido, y omite el resto', async () => {
      descargar.mockResolvedValue(pagina([]));
      const horas = (h: number) => new Date(AHORA - h * 3_600_000);

      const nunca = crearServicio({ ultima_sincronizacion_en: null });
      await nunca.servicio.sincronizarVencidas(new Date(AHORA));
      expect(descargar).toHaveBeenCalledTimes(1);

      descargar.mockClear();
      const vencida = crearServicio({
        ultima_sincronizacion_en: horas(7),
        intervalo_horas: 6,
      });
      await vencida.servicio.sincronizarVencidas(new Date(AHORA));
      expect(descargar).toHaveBeenCalledTimes(1);

      descargar.mockClear();
      const vigente = crearServicio({
        ultima_sincronizacion_en: horas(2),
        intervalo_horas: 6,
      });
      await vigente.servicio.sincronizarVencidas(new Date(AHORA));
      expect(descargar).not.toHaveBeenCalled();
    });

    it('un fallo no se propaga (solo al log)', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.integracionGithub.update.mockRejectedValue(new Error('db caída'));
      descargar.mockResolvedValue(pagina([]));
      await expect(
        servicio.sincronizarVencidas(new Date(AHORA)),
      ).resolves.toBeUndefined();
    });
  });

  describe('README (Fase 7m, #66)', () => {
    it('sincronizar refresca el README si está configurado', async () => {
      const { servicio, readme } = crearServicio({
        readme_repositorio: 'oscar/oscar',
      });
      descargar.mockResolvedValue(pagina([]));
      const r = await servicio.sincronizar(ADMIN);
      expect(readme.refrescar).toHaveBeenCalledTimes(1);
      expect(r.errores).toEqual([]);
    });

    it('no lo refresca si no hay readme_repositorio', async () => {
      const { servicio, readme } = crearServicio();
      descargar.mockResolvedValue(pagina([]));
      await servicio.sincronizar(ADMIN);
      expect(readme.refrescar).not.toHaveBeenCalled();
    });

    it('un fallo del README va a errores sin afectar a los repos', async () => {
      const { servicio, readme } = crearServicio({
        readme_repositorio: 'oscar/oscar',
      });
      readme.refrescar.mockResolvedValue({
        readme_error: 'sin cuota',
      } as never);
      descargar.mockResolvedValue(pagina([repo()]));
      const r = await servicio.sincronizar(ADMIN);
      expect(r.creados).toBe(1);
      expect(r.errores).toEqual(['README: sin cuota']);
    });
  });
});
