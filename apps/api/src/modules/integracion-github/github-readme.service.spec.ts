import { NotFoundException } from '@nestjs/common';
import {
  descargarRecursoSeguro,
  RedSeguraError,
} from '../insignias/red-segura';
import { GithubReadmeService } from './github-readme.service';

jest.mock('../insignias/red-segura', () => ({
  ...jest.requireActual('../insignias/red-segura'),
  descargarRecursoSeguro: jest.fn(),
}));

const descargar = descargarRecursoSeguro as unknown as jest.Mock;
const ADMIN = 'admin-1';

function respuesta(
  texto: string,
  cabeceras: Record<string, string> = {},
  status = 200,
) {
  return {
    buffer: Buffer.from(texto),
    contentType: 'application/vnd.github.raw+json',
    urlFinal: 'https://api.github.com/x',
    status,
    cabeceras,
  };
}

function crear(inicial: Record<string, unknown> = {}) {
  const integracion: Record<string, unknown> = {
    id: 'int-1',
    usuario_admin_id: ADMIN,
    usuario_github: 'oscar',
    readme_repositorio: 'oscar/oscar',
    readme_rama: null,
    readme_markdown: null,
    readme_etag: null,
    readme_actualizado_en: null,
    readme_error: null,
    ...inicial,
  };
  const prisma = {
    integracionGithub: {
      findUnique: jest.fn(async () => integracion),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) =>
        Object.assign(integracion, data),
      ),
    },
  };
  const servicio = new GithubReadmeService(prisma as never);
  return { servicio, prisma, integracion };
}

describe('GithubReadmeService (Fase 7m, #66, UC-36)', () => {
  const tokenOriginal = process.env.GITHUB_TOKEN;
  beforeEach(() => {
    descargar.mockReset();
    delete process.env.GITHUB_TOKEN;
  });
  afterAll(() => {
    if (tokenOriginal) process.env.GITHUB_TOKEN = tokenOriginal;
  });

  it('obtener lee solo la caché y lanza 404 sin integración', async () => {
    const { servicio, prisma } = crear({ readme_markdown: '# x' });
    await expect(servicio.obtener(ADMIN)).resolves.toMatchObject({
      repositorio: 'oscar/oscar',
      markdown: '# x',
    });
    expect(descargar).not.toHaveBeenCalled();

    prisma.integracionGithub.findUnique.mockResolvedValueOnce(null as never);
    await expect(servicio.obtener(ADMIN)).rejects.toThrow(NotFoundException);
  });

  it('guarda markdown y etag, usa main por defecto y limpia el error', async () => {
    const { servicio, integracion } = crear({ readme_error: 'viejo' });
    descargar.mockResolvedValue(respuesta('# Hola', { etag: '"abc"' }));

    const r = await servicio.actualizar(ADMIN);

    expect(r).toMatchObject({ markdown: '# Hola', error: null });
    expect(r.actualizado_en).toBeInstanceOf(Date);
    expect(integracion.readme_etag).toBe('"abc"');
    const [url, opciones] = descargar.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/repos/oscar/oscar/readme?ref=main',
    );
    expect(opciones).toMatchObject({
      accept: 'application/vnd.github.raw+json',
      aceptar304: true,
      maxBytes: 1024 * 1024,
    });
    expect(opciones.cabeceras['X-GitHub-Api-Version']).toBe('2022-11-28');
    expect(opciones.cabeceras.Authorization).toBeUndefined();
    expect(opciones.cabeceras['If-None-Match']).toBeUndefined();
  });

  it('tipos admite el content-type raw de GitHub y textos planos', async () => {
    const { servicio } = crear();
    descargar.mockResolvedValue(respuesta('x'));
    await servicio.actualizar(ADMIN);
    const { tipos } = descargar.mock.calls[0][1];
    expect(tipos).toEqual(
      expect.arrayContaining([
        'application/vnd.github.raw+json',
        'text/plain',
        'text/markdown',
      ]),
    );
    expect(tipos).not.toContain('text/html');
  });

  it('usa la rama configurada (codificada) y envía token e If-None-Match', async () => {
    process.env.GITHUB_TOKEN = 'ghp_prueba';
    const { servicio } = crear({
      readme_rama: 'feature/x',
      readme_etag: '"previo"',
    });
    descargar.mockResolvedValue(respuesta('x'));

    await servicio.actualizar(ADMIN);

    const [url, opciones] = descargar.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/repos/oscar/oscar/readme?ref=feature%2Fx',
    );
    expect(opciones.cabeceras.Authorization).toBe('Bearer ghp_prueba');
    expect(opciones.cabeceras['If-None-Match']).toBe('"previo"');
  });

  it('304 solo actualiza la fecha y conserva el markdown', async () => {
    const { servicio, integracion } = crear({
      readme_markdown: '# viejo',
      readme_etag: '"e"',
    });
    descargar.mockResolvedValue(respuesta('', {}, 304));

    const r = await servicio.actualizar(ADMIN);

    expect(r.markdown).toBe('# viejo');
    expect(integracion.readme_etag).toBe('"e"');
    expect(r.actualizado_en).toBeInstanceOf(Date);
    expect(r.error).toBeNull();
  });

  it('404 deja un mensaje con repositorio y rama, sin lanzar', async () => {
    const { servicio } = crear({ readme_rama: 'dev' });
    descargar.mockRejectedValue(
      new RedSeguraError('El servidor respondió 404'),
    );

    const r = await servicio.actualizar(ADMIN);

    expect(r.error).toBe('No existe el README en oscar/oscar@dev');
  });

  it.each([403, 429])('%i queda como error de cuota', async (status) => {
    const { servicio } = crear();
    descargar.mockRejectedValue(
      new RedSeguraError(`El servidor respondió ${status}`),
    );
    const r = await servicio.actualizar(ADMIN);
    expect(r.error).toContain('límite de cuota');
  });

  it('cualquier otro error (p. ej. tipo no permitido) va a readme_error y conserva el markdown', async () => {
    const { servicio, integracion } = crear({ readme_markdown: '# previo' });
    descargar.mockRejectedValue(
      new RedSeguraError('Tipo de contenido no permitido (text/html)'),
    );
    const r = await servicio.actualizar(ADMIN);
    expect(r.error).toContain('Tipo de contenido no permitido');
    expect(integracion.readme_markdown).toBe('# previo');
  });

  it('sin repositorio configurado no descarga nada', async () => {
    const { servicio } = crear({ readme_repositorio: null });
    await servicio.actualizar(ADMIN);
    expect(descargar).not.toHaveBeenCalled();
  });
});
