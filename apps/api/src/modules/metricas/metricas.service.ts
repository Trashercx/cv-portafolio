import { Injectable, Logger } from '@nestjs/common';
import { UmamiClient, UmamiError } from './umami.client';

export type MotivoNoDisponible =
  'no_configurado' | 'sin_respuesta' | 'no_autorizado';

export interface MetricasDisponibles {
  disponible: true;
  periodo: number;
  desde: string;
  hasta: string;
  resumen: {
    paginas_vistas: number;
    visitas: number;
    visitantes: number;
    rebote_pct: number;
    duracion_media_s: number;
  };
  paginas: { ruta: string; vistas: number }[];
  referidos: { origen: string; visitas: number }[];
  paises: { pais: string; visitas: number }[];
  eventos: { descargar_cv: number; clic_red: number };
  eventos_detalle: { nombre: string; total: number }[];
}

export interface MetricasNoDisponibles {
  disponible: false;
  motivo: MotivoNoDisponible;
}

export type RespuestaMetricas = MetricasDisponibles | MetricasNoDisponibles;

const CACHE_MS = 60_000;
const DIA_MS = 86_400_000;

/**
 * Fase 8, UC-27: proxy tolerante a fallos de las métricas de Umami para el
 * panel. Nunca lanza: ante cualquier error responde `disponible: false` con
 * el motivo (criterio de UC-27: nunca un 5xx hacia el panel). Caché en
 * memoria de 60 s por periodo (solo respuestas exitosas).
 */
@Injectable()
export class MetricasService {
  private readonly logger = new Logger(MetricasService.name);
  private readonly cache = new Map<
    number,
    { expira: number; valor: MetricasDisponibles }
  >();

  constructor(private readonly umami: UmamiClient) {}

  /** Vacía la caché y la sesión de Umami (tests). */
  invalidarCache(): void {
    this.cache.clear();
    this.umami.reiniciarSesion();
  }

  async obtener(periodo = 30): Promise<RespuestaMetricas> {
    if (!this.umami.estaConfigurado()) {
      return { disponible: false, motivo: 'no_configurado' };
    }

    const enCache = this.cache.get(periodo);
    if (enCache && enCache.expira > Date.now()) return enCache.valor;

    try {
      const valor = await this.consultar(periodo);
      this.cache.set(periodo, { expira: Date.now() + CACHE_MS, valor });
      return valor;
    } catch (error) {
      if (error instanceof UmamiError) {
        this.logger.warn(
          `Métricas no disponibles (${error.motivo}): ${error.message}`,
        );
        return { disponible: false, motivo: error.motivo };
      }
      this.logger.warn(
        `Error inesperado al consultar métricas: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { disponible: false, motivo: 'sin_respuesta' };
    }
  }

  private async consultar(periodo: number): Promise<MetricasDisponibles> {
    const hasta = Date.now();
    const desde = hasta - periodo * DIA_MS;

    const [stats, urls, referidos, paises, eventos] = await Promise.all([
      this.umami.obtenerStats(desde, hasta),
      this.umami.obtenerMetricas('url', desde, hasta),
      this.umami.obtenerMetricas('referrer', desde, hasta),
      this.umami.obtenerMetricas('country', desde, hasta),
      this.umami.obtenerMetricas('event', desde, hasta),
    ]);

    const totalEvento = (nombre: string) =>
      eventos.find((e) => e.x === nombre)?.y ?? 0;

    return {
      disponible: true,
      periodo,
      desde: new Date(desde).toISOString(),
      hasta: new Date(hasta).toISOString(),
      resumen: {
        paginas_vistas: stats.pageviews,
        visitas: stats.visits,
        visitantes: stats.visitors,
        rebote_pct:
          stats.visits > 0
            ? Math.round((stats.bounces / stats.visits) * 100)
            : 0,
        duracion_media_s:
          stats.visits > 0 ? Math.round(stats.totaltime / stats.visits) : 0,
      },
      paginas: urls.map((f) => ({ ruta: f.x, vistas: f.y })),
      referidos: referidos.map((f) => ({ origen: f.x, visitas: f.y })),
      paises: paises.map((f) => ({ pais: f.x, visitas: f.y })),
      eventos: {
        descargar_cv: totalEvento('descargar_cv'),
        clic_red: totalEvento('clic_red'),
      },
      eventos_detalle: eventos.map((f) => ({ nombre: f.x, total: f.y })),
    };
  }
}
