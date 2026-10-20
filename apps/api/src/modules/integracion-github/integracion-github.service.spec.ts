import { IntegracionGithubService } from './integracion-github.service';

describe('IntegracionGithubService.guardar, README (Fase 7m, #66, UC-36)', () => {
  function crear(actual: Record<string, unknown> | null) {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = {
      integracionGithub: {
        findUnique: jest.fn(async () => actual),
        upsert,
      },
    };
    return { upsert, servicio: new IntegracionGithubService(prisma as never) };
  }
  const update = (upsert: jest.Mock) =>
    (upsert.mock.calls[0][0] as { update: Record<string, unknown> }).update;

  const guardada = { readme_repositorio: 'a/a', readme_rama: 'main' };

  it('readme_* ausente no toca la caché ni los campos', async () => {
    const { upsert, servicio } = crear(guardada);
    await servicio.guardar('u', { usuario_github: 'a', intervalo_horas: 8 });
    const u = update(upsert);
    expect(u).not.toHaveProperty('readme_markdown');
    expect(u.readme_repositorio).toBeUndefined();
    expect(u.readme_rama).toBeUndefined();
  });

  it('null en readme_repositorio limpia repositorio y toda la caché', async () => {
    const { upsert, servicio } = crear(guardada);
    await servicio.guardar('u', {
      usuario_github: 'a',
      readme_repositorio: null,
    });
    expect(update(upsert)).toMatchObject({
      readme_repositorio: null,
      readme_markdown: null,
      readme_etag: null,
      readme_actualizado_en: null,
      readme_error: null,
    });
  });

  it('cambiar el repositorio invalida la caché; repetir el mismo no', async () => {
    const a = crear(guardada);
    await a.servicio.guardar('u', {
      usuario_github: 'a',
      readme_repositorio: 'b/b',
    });
    expect(update(a.upsert)).toMatchObject({ readme_markdown: null });

    const b = crear(guardada);
    await b.servicio.guardar('u', {
      usuario_github: 'a',
      readme_repositorio: 'a/a',
    });
    expect(update(b.upsert)).not.toHaveProperty('readme_markdown');
  });
});
