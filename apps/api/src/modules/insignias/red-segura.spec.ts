import { lookup } from 'dns/promises';
import {
  descargarRecursoSeguro,
  esIpPrivada,
  RedSeguraError,
  USER_AGENT_INSIGNIAS,
} from './red-segura';

jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

const lookupMock = lookup as unknown as jest.Mock;
const PUBLICA = [{ address: '93.184.216.34', family: 4 }];

function respuesta(
  cuerpo: string | null,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(cuerpo, {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

describe('esIpPrivada (Fase 7d, UC-35)', () => {
  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '224.0.0.1',
    '::1',
    '::',
    'fc00::1',
    'fd00::1',
    'fe80::1',
    'fe80::1%eth0',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:a00:1',
    '64:ff9b::a00:1',
    'ff02::1',
    'no-es-una-ip',
  ])('%s es privada', (ip) => {
    expect(esIpPrivada(ip)).toBe(true);
  });

  it.each([
    '93.184.216.34',
    '8.8.8.8',
    '172.15.0.1',
    '172.32.0.1',
    '169.253.1.1',
    '1.1.1.1',
    '2606:4700:4700::1111',
    '2001:db8::1',
    '::ffff:8.8.8.8',
  ])('%s es pública', (ip) => {
    expect(esIpPrivada(ip)).toBe(false);
  });
});

describe('descargarRecursoSeguro (Fase 7d, UC-35)', () => {
  const fetchOriginal = globalThis.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    lookupMock.mockReset().mockResolvedValue(PUBLICA);
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = fetchOriginal;
  });

  it('descarga por https y devuelve buffer, contentType y urlFinal', async () => {
    fetchMock.mockResolvedValue(
      respuesta('hola', {
        headers: { 'content-type': 'Text/Plain; charset=utf-8' },
      }),
    );
    const r = await descargarRecursoSeguro('https://ejemplo.test/a');
    expect(r.buffer.toString()).toBe('hola');
    expect(r.contentType).toBe('text/plain');
    expect(r.urlFinal).toBe('https://ejemplo.test/a');
    const init = fetchMock.mock.calls[0][1];
    expect(init.redirect).toBe('manual');
    expect(init.credentials).toBe('omit');
    expect(init.headers['User-Agent']).toBe(USER_AGENT_INSIGNIAS);
  });

  it('rechaza http', async () => {
    await expect(
      descargarRecursoSeguro('http://ejemplo.test/a'),
    ).rejects.toThrow(RedSeguraError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza credenciales embebidas y URLs inválidas', async () => {
    await expect(
      descargarRecursoSeguro('https://u:p@ejemplo.test/'),
    ).rejects.toThrow(RedSeguraError);
    await expect(descargarRecursoSeguro('no es url')).rejects.toThrow(
      RedSeguraError,
    );
  });

  it.each([
    'https://127.0.0.1/a',
    'https://10.0.0.1/a',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/a',
    'https://[fd00::1]/a',
  ])('rechaza la IP literal privada %s sin llamar a fetch', async (url) => {
    await expect(descargarRecursoSeguro(url)).rejects.toThrow(
      /no está permitido/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza un dominio que resuelve a una IP privada (aunque haya otra pública)', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '10.1.2.3', family: 4 },
    ]);
    await expect(descargarRecursoSeguro('https://malo.test/')).rejects.toThrow(
      /no está permitido/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un fallo de DNS es un error controlado', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(descargarRecursoSeguro('https://nada.test/')).rejects.toThrow(
      /resolver/,
    );
  });

  it('sigue redirecciones revalidando cada destino', async () => {
    fetchMock
      .mockResolvedValueOnce(
        respuesta(null, { status: 302, headers: { location: '/b' } }),
      )
      .mockResolvedValueOnce(
        respuesta('fin', { headers: { 'content-type': 'text/plain' } }),
      );
    const r = await descargarRecursoSeguro('https://ejemplo.test/a');
    expect(r.urlFinal).toBe('https://ejemplo.test/b');
    expect(lookupMock).toHaveBeenCalledTimes(2);
  });

  it('rechaza una redirección a una IP privada', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(null, {
        status: 301,
        headers: { location: 'https://169.254.169.254/latest' },
      }),
    );
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a'),
    ).rejects.toThrow(/no está permitido/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza una redirección a http y una redirección a un dominio privado', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(null, { status: 302, headers: { location: 'http://x.test/' } }),
    );
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a'),
    ).rejects.toThrow(/https/);

    fetchMock.mockResolvedValueOnce(
      respuesta(null, {
        status: 302,
        headers: { location: 'https://interno.test/' },
      }),
    );
    lookupMock
      .mockResolvedValueOnce(PUBLICA)
      .mockResolvedValueOnce([{ address: '192.168.0.5', family: 4 }]);
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a'),
    ).rejects.toThrow(/no está permitido/);
  });

  it('corta tras 3 redirecciones', async () => {
    fetchMock.mockImplementation(async () =>
      respuesta(null, { status: 302, headers: { location: '/otra' } }),
    );
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a'),
    ).rejects.toThrow(/redirecciones/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('corta al superar maxBytes leyendo el stream (sin content-length)', async () => {
    const trozo = new Uint8Array(400);
    let leidos = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        leidos++;
        controller.enqueue(trozo);
        if (leidos > 100) controller.close();
      },
    });
    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    );
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a', { maxBytes: 1000 }),
    ).rejects.toThrow(/tamaño máximo/);
    expect(leidos).toBeLessThan(10);
  });

  it('rechaza por content-length declarado mayor a maxBytes', async () => {
    fetchMock.mockResolvedValue(
      respuesta('x', { headers: { 'content-length': '5000' } }),
    );
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a', { maxBytes: 1000 }),
    ).rejects.toThrow(/tamaño máximo/);
  });

  it('rechaza un content-type fuera de `tipos` y respuestas no 2xx', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta('x', { headers: { 'content-type': 'text/html' } }),
    );
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a', {
        tipos: ['image/png'],
      }),
    ).rejects.toThrow(/Tipo de contenido/);

    fetchMock.mockResolvedValueOnce(respuesta('no', { status: 404 }));
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a'),
    ).rejects.toThrow(/404/);
  });

  it('un timeout es un error controlado', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a', { timeoutMs: 20 }),
    ).rejects.toThrow(/tiempo de espera/);
  });

  it('un error de red de fetch se envuelve en RedSeguraError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      descargarRecursoSeguro('https://ejemplo.test/a'),
    ).rejects.toThrow(RedSeguraError);
  });
});
