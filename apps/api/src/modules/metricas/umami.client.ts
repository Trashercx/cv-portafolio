import { Injectable, Logger } from '@nestjs/common';

/** Motivos por los que Umami no entrega datos (Fase 8, UC-27). */
export type MotivoUmami = 'sin_respuesta' | 'no_autorizado';

export class UmamiError extends Error {
  constructor(
    readonly motivo: MotivoUmami,
    detalle: string,
  ) {
    super(detalle);
    this.name = 'UmamiError';
  }
}

export type TipoMetrica = 'url' | 'referrer' | 'country' | 'event';

export interface UmamiStats {
  pageviews: number;
  visits: number;
  visitors: number;
  bounces: number;
  totaltime: number;
}

export interface UmamiMetrica {
  x: string;
  y: number;
}

const TIMEOUT_MS = 5000;

/**
 * Fase 8, UC-27: cliente mínimo de la API de Umami con `fetch` nativo y
 * timeout de 5 s. Autenticación por `UMAMI_API_TOKEN` (Bearer) o por
 * `UMAMI_USUARIO` + `UMAMI_CONTRASENA` (`POST /api/auth/login`, token en
 * memoria; ante 401 se vuelve a iniciar sesión una sola vez). Las variables
 * se leen en cada llamada para que los tests puedan cambiarlas.
 */
@Injectable()
export class UmamiClient {
  private readonly logger = new Logger(UmamiClient.name);
  private tokenSesion: string | null = null;

  private get apiUrl(): string {
    return (process.env.UMAMI_API_URL ?? '').trim().replace(/\/+$/, '');
  }

  private get websiteId(): string {
    return (process.env.UMAMI_WEBSITE_ID ?? '').trim();
  }

  /** `true` si hay URL, sitio y alguna forma de credencial. */
  estaConfigurado(): boolean {
    const credencial =
      !!process.env.UMAMI_API_TOKEN?.trim() ||
      (!!process.env.UMAMI_USUARIO?.trim() &&
        !!process.env.UMAMI_CONTRASENA?.trim());
    return !!this.apiUrl && !!this.websiteId && credencial;
  }

  /** Olvida el token de sesión cacheado (tests). */
  reiniciarSesion(): void {
    this.tokenSesion = null;
  }

  async obtenerStats(desde: number, hasta: number): Promise<UmamiStats> {
    const crudo = await this.pedir<Record<string, unknown>>(
      `/api/websites/${encodeURIComponent(this.websiteId)}/stats`,
      { startAt: String(desde), endAt: String(hasta) },
    );
    // Umami 2.x: `{ pageviews: { value } }`; versiones previas: `{ pageviews: n }`.
    const valor = (campo: string): number => {
      const v = crudo?.[campo];
      const n =
        v !== null && typeof v === 'object'
          ? Number((v as { value?: unknown }).value)
          : Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      pageviews: valor('pageviews'),
      visits: valor('visits'),
      visitors: valor('visitors'),
      bounces: valor('bounces'),
      totaltime: valor('totaltime'),
    };
  }

  async obtenerMetricas(
    tipo: TipoMetrica,
    desde: number,
    hasta: number,
  ): Promise<UmamiMetrica[]> {
    const crudo = await this.pedir<unknown>(
      `/api/websites/${encodeURIComponent(this.websiteId)}/metrics`,
      {
        type: tipo,
        startAt: String(desde),
        endAt: String(hasta),
        limit: '10',
      },
    );
    if (!Array.isArray(crudo)) return [];
    return crudo.map((fila: { x?: unknown; y?: unknown }) => ({
      x: String(fila?.x ?? ''),
      y: Number(fila?.y) || 0,
    }));
  }

  private async pedir<T>(
    ruta: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = `${this.apiUrl}${ruta}?${new URLSearchParams(params).toString()}`;
    const tokenFijo = process.env.UMAMI_API_TOKEN?.trim();

    for (let intento = 0; intento < 2; intento++) {
      const token = tokenFijo || (await this.obtenerTokenSesion());
      const respuesta = await this.fetchConTimeout(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (respuesta.status === 401 || respuesta.status === 403) {
        // Token fijo: no hay forma de renovarlo. Sesión: un reintento.
        if (tokenFijo || intento === 1) {
          throw new UmamiError(
            'no_autorizado',
            `Umami respondió ${respuesta.status}`,
          );
        }
        this.tokenSesion = null;
        continue;
      }
      return this.leerJson<T>(respuesta);
    }
    throw new UmamiError('no_autorizado', 'Umami rechazó la sesión');
  }

  private async obtenerTokenSesion(): Promise<string> {
    if (this.tokenSesion) return this.tokenSesion;

    const respuesta = await this.fetchConTimeout(
      `${this.apiUrl}/api/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: process.env.UMAMI_USUARIO,
          password: process.env.UMAMI_CONTRASENA,
        }),
      },
    );
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new UmamiError('no_autorizado', 'Credenciales de Umami inválidas');
    }
    const cuerpo = await this.leerJson<{ token?: string }>(respuesta);
    if (!cuerpo?.token) {
      throw new UmamiError('sin_respuesta', 'Login de Umami sin token');
    }
    this.tokenSesion = cuerpo.token;
    return cuerpo.token;
  }

  private async leerJson<T>(respuesta: Response): Promise<T> {
    if (!respuesta.ok) {
      throw new UmamiError(
        'sin_respuesta',
        `Umami respondió ${respuesta.status}`,
      );
    }
    try {
      return (await respuesta.json()) as T;
    } catch {
      throw new UmamiError(
        'sin_respuesta',
        'Umami devolvió una respuesta no JSON',
      );
    }
  }

  private async fetchConTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controlador.signal });
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Umami no respondió: ${motivo}`);
      throw new UmamiError('sin_respuesta', motivo);
    } finally {
      clearTimeout(temporizador);
    }
  }
}
