import { MetricasService } from './metricas.service';
import { UmamiClient } from './umami.client';

const VARIABLES = [
  'UMAMI_API_URL',
  'UMAMI_WEBSITE_ID',
  'UMAMI_API_TOKEN',
  'UMAMI_USUARIO',
  'UMAMI_CONTRASENA',
] as const;

function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Responde según la ruta pedida a Umami. */
function umamiSimulado(stats: unknown) {
  return (entrada: unknown) => {
    const url = String(entrada);
    if (url.includes('/stats')) return Promise.resolve(json(stats));
    if (url.includes('type=url')) {
      return Promise.resolve(json([{ x: '/', y: 10 }]));
    }
    if (url.includes('type=referrer')) {
      return Promise.resolve(json([{ x: 'google.com', y: 4 }]));
    }
    if (url.includes('type=country')) {
      return Promise.resolve(json([{ x: 'PE', y: 7 }]));
    }
    if (url.includes('type=event')) {
      return Promise.resolve(
        json([
          { x: 'descargar_cv', y: 3 },
          { x: 'clic_red', y: 5 },
          { x: 'otro', y: 1 },
        ]),
      );
    }
    return Promise.resolve(json({}, 404));
  };
}

describe('MetricasService (Fase 8, UC-27)', () => {
  let servicio: MetricasService;
  let fetchSpy: jest.SpyInstance;
  const entornoOriginal: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const v of VARIABLES) entornoOriginal[v] = process.env[v];
  });

  beforeEach(() => {
    for (const v of VARIABLES) delete process.env[v];
    process.env.UMAMI_API_URL = 'https://umami.test/';
    process.env.UMAMI_WEBSITE_ID = 'sitio-1';
    process.env.UMAMI_API_TOKEN = 'tok';
    servicio = new MetricasService(new UmamiClient());
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  afterAll(() => {
    for (const v of VARIABLES) {
      if (entornoOriginal[v] === undefined) delete process.env[v];
      else process.env[v] = entornoOriginal[v];
    }
  });

  it('sin variables responde no_configurado y no llama a Umami', async () => {
    delete process.env.UMAMI_API_TOKEN;
    expect(await servicio.obtener(30)).toEqual({
      disponible: false,
      motivo: 'no_configurado',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forma { pageviews: { value } } con token Bearer', async () => {
    fetchSpy.mockImplementation(
      umamiSimulado({
        pageviews: { value: 100 },
        visits: { value: 40 },
        visitors: { value: 30 },
        bounces: { value: 10 },
        totaltime: { value: 4000 },
      }),
    );
    const r = await servicio.obtener(7);
    expect(r).toMatchObject({
      disponible: true,
      periodo: 7,
      resumen: {
        paginas_vistas: 100,
        visitas: 40,
        visitantes: 30,
        rebote_pct: 25,
        duracion_media_s: 100,
      },
      paginas: [{ ruta: '/', vistas: 10 }],
      referidos: [{ origen: 'google.com', visitas: 4 }],
      paises: [{ pais: 'PE', visitas: 7 }],
      eventos: { descargar_cv: 3, clic_red: 5 },
      eventos_detalle: [
        { nombre: 'descargar_cv', total: 3 },
        { nombre: 'clic_red', total: 5 },
        { nombre: 'otro', total: 1 },
      ],
    });
    if (r.disponible) {
      expect(new Date(r.hasta).getTime() - new Date(r.desde).getTime()).toBe(
        7 * 86_400_000,
      );
    }
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://umami.test/api/websites/sitio-1/');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer tok',
    );
  });

  it('forma { pageviews: number } y visits=0 no divide por cero', async () => {
    fetchSpy.mockImplementation(
      umamiSimulado({
        pageviews: 5,
        visits: 0,
        visitors: 0,
        bounces: 0,
        totaltime: 0,
      }),
    );
    const r = await servicio.obtener(30);
    expect(r).toMatchObject({
      disponible: true,
      resumen: { paginas_vistas: 5, rebote_pct: 0, duracion_media_s: 0 },
    });
  });

  it('timeout (abort a los 5 s) -> sin_respuesta', async () => {
    jest.useFakeTimers();
    fetchSpy.mockImplementation(
      (_url: unknown, init?: RequestInit) =>
        new Promise((_resolver, rechazar) => {
          init?.signal?.addEventListener('abort', () =>
            rechazar(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const promesa = servicio.obtener(30);
    await jest.advanceTimersByTimeAsync(5000);
    expect(await promesa).toEqual({
      disponible: false,
      motivo: 'sin_respuesta',
    });
  });

  it('timeout cubre también la lectura del cuerpo -> sin_respuesta', async () => {
    jest.useFakeTimers();
    fetchSpy.mockImplementation((_url: unknown, init?: RequestInit) => {
      // Cabeceras llegan, pero el cuerpo nunca; se corta solo al abortar.
      const cuerpo = new ReadableStream({
        start(controlador) {
          init?.signal?.addEventListener('abort', () =>
            controlador.error(new DOMException('aborted', 'AbortError')),
          );
        },
      });
      return Promise.resolve(new Response(cuerpo, { status: 200 }));
    });
    const promesa = servicio.obtener(30);
    await jest.advanceTimersByTimeAsync(5000);
    expect(await promesa).toEqual({
      disponible: false,
      motivo: 'sin_respuesta',
    });
  });

  it('usuario/contraseña: 5 peticiones concurrentes hacen un solo login', async () => {
    delete process.env.UMAMI_API_TOKEN;
    process.env.UMAMI_USUARIO = 'admin';
    process.env.UMAMI_CONTRASENA = 'secreto';
    const normal = umamiSimulado({
      pageviews: 1,
      visits: 1,
      visitors: 1,
      bounces: 0,
      totaltime: 9,
    });
    let logins = 0;
    fetchSpy.mockImplementation(async (entrada: unknown) => {
      if (String(entrada).endsWith('/api/auth/login')) {
        logins++;
        await new Promise((r) => setTimeout(r, 10));
        return json({ token: 'unico' });
      }
      return normal(entrada);
    });
    const r = await servicio.obtener(30);
    expect(r.disponible).toBe(true);
    expect(logins).toBe(1);
  });

  it('error de red o 5xx -> sin_respuesta', async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
    expect(await servicio.obtener(30)).toEqual({
      disponible: false,
      motivo: 'sin_respuesta',
    });
    servicio.invalidarCache();
    fetchSpy.mockResolvedValue(json({}, 500));
    expect(await servicio.obtener(30)).toEqual({
      disponible: false,
      motivo: 'sin_respuesta',
    });
  });

  it('401 con token fijo -> no_autorizado', async () => {
    fetchSpy.mockResolvedValue(json({}, 401));
    expect(await servicio.obtener(30)).toEqual({
      disponible: false,
      motivo: 'no_autorizado',
    });
  });

  it('usuario/contraseña: login, reintenta una vez ante 401 y luego no_autorizado', async () => {
    delete process.env.UMAMI_API_TOKEN;
    process.env.UMAMI_USUARIO = 'admin';
    process.env.UMAMI_CONTRASENA = 'secreto';
    let logins = 0;
    fetchSpy.mockImplementation((entrada: unknown) => {
      const url = String(entrada);
      if (url.endsWith('/api/auth/login')) {
        logins++;
        return Promise.resolve(json({ token: `t${logins}` }));
      }
      return Promise.resolve(json({}, 401));
    });
    expect(await servicio.obtener(30)).toEqual({
      disponible: false,
      motivo: 'no_autorizado',
    });
    // Login inicial + un relogin tras el primer 401 (las 5 peticiones corren en paralelo).
    expect(logins).toBeGreaterThanOrEqual(2);
  });

  it('usuario/contraseña: 401 transitorio se recupera con un nuevo login', async () => {
    delete process.env.UMAMI_API_TOKEN;
    process.env.UMAMI_USUARIO = 'admin';
    process.env.UMAMI_CONTRASENA = 'secreto';
    const normal = umamiSimulado({
      pageviews: 1,
      visits: 1,
      visitors: 1,
      bounces: 0,
      totaltime: 9,
    });
    let logins = 0;
    fetchSpy.mockImplementation((entrada: unknown, init?: RequestInit) => {
      const url = String(entrada);
      if (url.endsWith('/api/auth/login')) {
        logins++;
        return Promise.resolve(json({ token: `t${logins}` }));
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      // El primer token queda "vencido"; el segundo sirve.
      if (auth === 'Bearer t1') return Promise.resolve(json({}, 401));
      return normal(entrada);
    });
    const r = await servicio.obtener(30);
    expect(r.disponible).toBe(true);
  });

  it('login con credenciales inválidas -> no_autorizado', async () => {
    delete process.env.UMAMI_API_TOKEN;
    process.env.UMAMI_USUARIO = 'admin';
    process.env.UMAMI_CONTRASENA = 'mala';
    fetchSpy.mockResolvedValue(json({ error: 'x' }, 401));
    expect(await servicio.obtener(30)).toEqual({
      disponible: false,
      motivo: 'no_autorizado',
    });
  });

  it('cachea 60 s por periodo y se puede invalidar', async () => {
    fetchSpy.mockImplementation(
      umamiSimulado({
        pageviews: 1,
        visits: 1,
        visitors: 1,
        bounces: 0,
        totaltime: 1,
      }),
    );
    await servicio.obtener(30);
    const llamadas = fetchSpy.mock.calls.length;
    await servicio.obtener(30);
    expect(fetchSpy.mock.calls.length).toBe(llamadas);

    await servicio.obtener(7);
    expect(fetchSpy.mock.calls.length).toBe(llamadas * 2);

    servicio.invalidarCache();
    await servicio.obtener(30);
    expect(fetchSpy.mock.calls.length).toBe(llamadas * 3);
  });
});
