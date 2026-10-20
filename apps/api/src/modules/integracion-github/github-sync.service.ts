import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegracionGithub } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  descargarRecursoSeguro,
  RedSeguraError,
} from '../insignias/red-segura';
import { GithubReadmeService } from './github-readme.service';
import { mensajeDeErrorGithub } from './github-errores';
import { VersionesSitioService } from '../versiones-sitio/versiones-sitio.service';

/** Máximo de páginas de 100 repos por sincronización (1000 repos). */
const MAX_PAGINAS = 10;
/** Un repo con `pushed_at` más reciente que esto se considera "en progreso". */
const DIAS_EN_PROGRESO = 90;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const API_GITHUB = 'https://api.github.com';

/** Subconjunto de la respuesta de `GET /users/:u/repos` que usamos. */
interface RepoGithub {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  created_at: string;
  pushed_at: string | null;
}

/** Resultado de una sincronización (UC-36). */
export interface ResultadoSincronizacion {
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: string[];
  publicado: boolean;
  sincronizado_en: string;
}

/** `name` del repo a título legible: guiones a espacios e inicial mayúscula. */
export function humanizarNombreRepo(nombre: string): string {
  const texto = nombre.replace(/[-_]+/g, ' ').trim() || nombre;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Sincronización de repositorios públicos de GitHub como proyectos (UC-36,
 * Fase 7l). Toda petición saliente pasa por `descargarRecursoSeguro`. Nunca
 * toca los proyectos manuales ni borra nada: un repo que desaparece o pasa a
 * privado simplemente deja de actualizarse.
 */
@Injectable()
export class GithubSyncService {
  private readonly logger = new Logger(GithubSyncService.name);
  /** Administradores con una sincronización en curso (manual o por cron). */
  private readonly enCurso = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly versionesSitio: VersionesSitioService,
    private readonly readme: GithubReadmeService,
  ) {}

  /**
   * Cron cada hora: sincroniza las integraciones activas cuyo
   * `intervalo_horas` venció. Los errores van solo al log.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sincronizarVencidas(ahora: Date = new Date()): Promise<void> {
    const activas = await this.prisma.integracionGithub.findMany({
      where: { activa: true },
    });
    for (const integracion of activas) {
      const vence = integracion.ultima_sincronizacion_en
        ? integracion.ultima_sincronizacion_en.getTime() +
          integracion.intervalo_horas * 60 * 60 * 1000
        : 0;
      if (vence > ahora.getTime()) continue;
      if (this.enCurso.has(integracion.usuario_admin_id)) continue;
      try {
        const r = await this.sincronizar(integracion.usuario_admin_id);
        this.logger.log(
          `GitHub (cron): ${r.creados} creados, ${r.actualizados} actualizados, ${r.omitidos} omitidos, ${r.errores.length} errores`,
        );
      } catch (error) {
        this.logger.error(
          `GitHub (cron): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /** Sincroniza ahora (manual o desde el cron). 404 si no hay integración. */
  async sincronizar(usuarioAdminId: string): Promise<ResultadoSincronizacion> {
    const integracion = await this.prisma.integracionGithub.findUnique({
      where: { usuario_admin_id: usuarioAdminId },
    });
    if (!integracion) {
      throw new NotFoundException(
        'Configura primero el usuario de GitHub de la integración',
      );
    }
    if (this.enCurso.has(usuarioAdminId)) {
      throw new ConflictException('Ya hay una sincronización en curso');
    }
    this.enCurso.add(usuarioAdminId);
    try {
      return await this.ejecutar(integracion);
    } finally {
      this.enCurso.delete(usuarioAdminId);
    }
  }

  private async ejecutar(
    integracion: IntegracionGithub,
  ): Promise<ResultadoSincronizacion> {
    const resultado: ResultadoSincronizacion = {
      creados: 0,
      actualizados: 0,
      omitidos: 0,
      errores: [],
      publicado: false,
      sincronizado_en: new Date().toISOString(),
    };

    let repos: RepoGithub[];
    let etagNuevo: string | null;
    try {
      const descarga = await this.descargarRepos(integracion);
      if (descarga === 'sin_cambios') {
        await this.refrescarReadme(integracion, resultado);
        await this.prisma.integracionGithub.update({
          where: { id: integracion.id },
          data: {
            ultima_sincronizacion_en: new Date(resultado.sincronizado_en),
            ultimo_error: null,
          },
        });
        return resultado;
      }
      ({ repos, etag: etagNuevo } = descarga);
    } catch (error) {
      const mensaje = this.mensajeDeError(error, integracion.usuario_github);
      resultado.errores.push(mensaje);
      await this.prisma.integracionGithub.update({
        where: { id: integracion.id },
        data: {
          ultima_sincronizacion_en: new Date(resultado.sincronizado_en),
          ultimo_error: mensaje,
        },
      });
      return resultado;
    }

    for (const repo of repos) {
      try {
        const destino = await this.procesarRepo(integracion, repo);
        resultado[destino]++;
      } catch (error) {
        resultado.errores.push(
          `${repo.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (
      integracion.publicar_automaticamente &&
      resultado.creados + resultado.actualizados > 0
    ) {
      try {
        await this.versionesSitio.publicar(integracion.usuario_admin_id);
        resultado.publicado = true;
      } catch (error) {
        resultado.errores.push(
          `No se pudo publicar la versión: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    await this.refrescarReadme(integracion, resultado);

    await this.prisma.integracionGithub.update({
      where: { id: integracion.id },
      data: {
        ultima_sincronizacion_en: new Date(resultado.sincronizado_en),
        ultimo_error:
          resultado.errores.length > 0
            ? `${resultado.errores.length} error(es) en la última sincronización: ${resultado.errores[0]}`
            : null,
        // Con errores no se guarda el ETag: el próximo 304 saltaría el reintento.
        etag: resultado.errores.length > 0 ? null : etagNuevo,
      },
    });
    return resultado;
  }

  /**
   * Fase 7m (#66, UC-36): refresca el README si está configurado. Su fallo no
   * afecta a los repos: va a `errores` del resultado (y a `readme_error`).
   */
  private async refrescarReadme(
    integracion: IntegracionGithub,
    resultado: ResultadoSincronizacion,
  ): Promise<void> {
    if (!integracion.readme_repositorio) return;
    try {
      const actualizada = await this.readme.refrescar(integracion);
      if (actualizada.readme_error) {
        resultado.errores.push(`README: ${actualizada.readme_error}`);
      }
    } catch (error) {
      resultado.errores.push(
        `README: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Descarga todas las páginas de repos del usuario. Solo la primera página
   * lleva `If-None-Match`; un 304 ahí significa que nada cambió.
   */
  private async descargarRepos(
    integracion: IntegracionGithub,
  ): Promise<'sin_cambios' | { repos: RepoGithub[]; etag: string | null }> {
    const token = process.env.GITHUB_TOKEN;
    const cabecerasBase: Record<string, string> = {
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let url: string | null =
      `${API_GITHUB}/users/${encodeURIComponent(integracion.usuario_github)}` +
      '/repos?type=owner&sort=updated&per_page=100&page=1';
    const repos: RepoGithub[] = [];
    let etag: string | null = null;

    for (let pagina = 1; url && pagina <= MAX_PAGINAS; pagina++) {
      const primera = pagina === 1;
      const r = await descargarRecursoSeguro(url, {
        accept: 'application/vnd.github+json',
        cabeceras: {
          ...cabecerasBase,
          ...(primera && integracion.etag
            ? { 'If-None-Match': integracion.etag }
            : {}),
        },
        aceptar304: primera,
        maxBytes: 5 * 1024 * 1024,
        timeoutMs: 15_000,
      });
      if (r.status === 304) return 'sin_cambios';
      if (primera) etag = r.cabeceras.etag ?? null;

      const restante = Number(r.cabeceras['x-ratelimit-remaining']);
      if (Number.isFinite(restante) && restante <= 5) {
        this.logger.warn(
          `Cuota de la API de GitHub casi agotada (${restante})`,
        );
      }

      const datos: unknown = JSON.parse(r.buffer.toString('utf8'));
      if (!Array.isArray(datos)) {
        throw new RedSeguraError('GitHub devolvió una respuesta inesperada');
      }
      repos.push(...(datos as RepoGithub[]));
      url = this.siguientePagina(r.cabeceras.link);
    }
    return { repos, etag };
  }

  /** URL del `rel="next"` del `Link`, solo si apunta a la API de GitHub. */
  private siguientePagina(link: string | undefined): string | null {
    if (!link) return null;
    for (const parte of link.split(',')) {
      const m = parte.match(/<([^>]+)>\s*;\s*rel="next"/);
      if (m && m[1].startsWith(`${API_GITHUB}/`)) return m[1];
    }
    return null;
  }

  private mensajeDeError(error: unknown, usuario: string): string {
    return mensajeDeErrorGithub(
      error,
      `No existe el usuario de GitHub "${usuario}"`,
    );
  }

  /** Crea o actualiza el proyecto de un repo; devuelve en qué contador cae. */
  private async procesarRepo(
    integracion: IntegracionGithub,
    repo: RepoGithub,
  ): Promise<'creados' | 'actualizados' | 'omitidos'> {
    if (repo.private) return 'omitidos';
    if (repo.fork && !integracion.incluir_forks) return 'omitidos';
    if (repo.archived && !integracion.incluir_archivados) return 'omitidos';

    const existente = await this.prisma.proyecto.findUnique({
      where: { github_repo_id: BigInt(repo.id) },
      include: { tecnologias: { include: { tecnologia: true } } },
    });
    if (
      existente &&
      (existente.origen !== 'github' || !existente.sincronizar_github)
    ) {
      return 'omitidos';
    }

    const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : null;
    const reciente =
      pushedAt !== null &&
      Date.now() - pushedAt.getTime() < DIAS_EN_PROGRESO * MS_POR_DIA;
    const descripcion =
      repo.description?.trim() || `Repositorio ${repo.name} en GitHub.`;
    // `fecha_inicio` y `estado` solo se fijan al crear: el formulario los deja
    // editar a mano y una sincronización no debe revertirlos (revisión 7l).
    const soloAlCrear = {
      fecha_inicio: new Date(repo.created_at),
      estado: reciente ? 'en_progreso' : 'finalizado',
    };
    const datos = {
      descripcion,
      url_repositorio: repo.html_url,
      url_demo: this.urlDemo(repo.homepage),
      github_nombre_completo: repo.full_name,
      github_lenguaje: repo.language,
      github_estrellas: repo.stargazers_count,
      github_actualizado_en: pushedAt,
    };

    const nombresTecnologias = this.nombresTecnologias(repo);
    const tecnologiaIds = await Promise.all(
      nombresTecnologias.map(async (nombre) => {
        const t = await this.prisma.tecnologia.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        });
        return t.id;
      }),
    );

    if (!existente) {
      const ultimo = await this.prisma.proyecto.aggregate({
        _max: { orden: true },
      });
      await this.prisma.proyecto.create({
        data: {
          usuario_admin_id: integracion.usuario_admin_id,
          titulo: humanizarNombreRepo(repo.name),
          destacado: integracion.destacar_nuevos,
          orden: (ultimo._max.orden ?? 0) + 1,
          origen: 'github',
          sincronizar_github: true,
          github_repo_id: BigInt(repo.id),
          ...soloAlCrear,
          ...datos,
          tecnologias: {
            create: tecnologiaIds.map((tecnologia_id) => ({ tecnologia_id })),
          },
        },
      });
      return 'creados';
    }

    // Las tecnologías solo se suman: las que el administrador añadió a mano se respetan.
    const yaAsociadas = new Set(
      existente.tecnologias.map((t) => t.tecnologia_id),
    );
    const nuevas = tecnologiaIds.filter((id) => !yaAsociadas.has(id));
    const cambio =
      existente.descripcion !== datos.descripcion ||
      existente.url_repositorio !== datos.url_repositorio ||
      existente.url_demo !== datos.url_demo ||
      existente.github_nombre_completo !== datos.github_nombre_completo ||
      existente.github_lenguaje !== datos.github_lenguaje ||
      existente.github_estrellas !== datos.github_estrellas ||
      existente.github_actualizado_en?.getTime() !==
        datos.github_actualizado_en?.getTime() ||
      nuevas.length > 0;
    if (!cambio) return 'omitidos';

    await this.prisma.proyecto.update({
      where: { id: existente.id },
      data: {
        ...datos,
        tecnologias: {
          create: nuevas.map((tecnologia_id) => ({ tecnologia_id })),
        },
      },
    });
    return 'actualizados';
  }

  /** `homepage` solo si es una URL https válida. */
  private urlDemo(homepage: string | null): string | null {
    if (!homepage) return null;
    try {
      const u = new URL(homepage.trim());
      return u.protocol === 'https:' ? u.toString() : null;
    } catch {
      return null;
    }
  }

  /** `topics` + `language`, sin repetir (sin distinguir mayúsculas). */
  private nombresTecnologias(repo: RepoGithub): string[] {
    const vistos = new Map<string, string>();
    for (const n of [...(repo.topics ?? []), repo.language ?? '']) {
      const nombre = n.trim();
      if (nombre && !vistos.has(nombre.toLowerCase())) {
        vistos.set(nombre.toLowerCase(), nombre);
      }
    }
    return [...vistos.values()];
  }
}
