import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegracionGithub } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { descargarRecursoSeguro } from '../insignias/red-segura';
import { mensajeDeErrorGithub } from './github-errores';

const API_GITHUB = 'https://api.github.com';
const RAMA_POR_DEFECTO = 'main';
const MAX_BYTES_README = 1024 * 1024;
/**
 * `Content-Type` que GitHub devuelve con `Accept: application/vnd.github.raw+json`
 * (comprobado: `application/vnd.github.raw+json; charset=utf-8`), más los
 * textos planos de respaldo.
 */
const TIPOS_README = [
  'application/vnd.github.raw+json',
  'application/vnd.github.raw',
  'application/vnd.github.v3.raw',
  'text/plain',
  'text/markdown',
];

/** Forma que ve el panel (issue #66): siempre desde la caché de la base. */
export interface ReadmeGithub {
  repositorio: string | null;
  rama: string | null;
  markdown: string | null;
  actualizado_en: Date | null;
  error: string | null;
}

function aVista(i: IntegracionGithub): ReadmeGithub {
  return {
    repositorio: i.readme_repositorio,
    rama: i.readme_rama,
    markdown: i.readme_markdown,
    actualizado_en: i.readme_actualizado_en,
    error: i.readme_error,
  };
}

/**
 * README de un repositorio de GitHub (UC-36, Fase 7m, issue #66). El Markdown
 * se guarda crudo en `integracion_github`; el saneado es del cliente. Toda
 * petición saliente pasa por `descargarRecursoSeguro`.
 */
@Injectable()
export class GithubReadmeService {
  constructor(private readonly prisma: PrismaService) {}

  private async integracion(usuarioAdminId: string) {
    const integracion = await this.prisma.integracionGithub.findUnique({
      where: { usuario_admin_id: usuarioAdminId },
    });
    if (!integracion) {
      throw new NotFoundException(
        'Configura primero el usuario de GitHub de la integración',
      );
    }
    return integracion;
  }

  /** `GET .../readme`: solo la caché, sin red. 404 si no hay integración. */
  async obtener(usuarioAdminId: string): Promise<ReadmeGithub> {
    return aVista(await this.integracion(usuarioAdminId));
  }

  /** `POST .../readme/actualizar`: refresca y devuelve la misma forma del GET. */
  async actualizar(usuarioAdminId: string): Promise<ReadmeGithub> {
    return aVista(await this.refrescar(await this.integracion(usuarioAdminId)));
  }

  /**
   * Refresca la caché del README. Nunca lanza por fallos de GitHub: quedan en
   * `readme_error` (la sincronización de repos no debe verse afectada). Sin
   * `readme_repositorio` configurado no hace nada.
   */
  async refrescar(integracion: IntegracionGithub): Promise<IntegracionGithub> {
    const repositorio = integracion.readme_repositorio;
    if (!repositorio) return integracion;
    const rama = integracion.readme_rama || RAMA_POR_DEFECTO;
    const token = process.env.GITHUB_TOKEN;

    try {
      const url =
        `${API_GITHUB}/repos/${repositorio}/readme` +
        `?ref=${encodeURIComponent(rama)}`;
      const r = await descargarRecursoSeguro(url, {
        accept: 'application/vnd.github.raw+json',
        cabeceras: {
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(integracion.readme_etag
            ? { 'If-None-Match': integracion.readme_etag }
            : {}),
        },
        aceptar304: true,
        maxBytes: MAX_BYTES_README,
        timeoutMs: 15_000,
        tipos: TIPOS_README,
      });

      const data =
        r.status === 304
          ? { readme_actualizado_en: new Date(), readme_error: null }
          : {
              readme_markdown: r.buffer.toString('utf8'),
              readme_etag: r.cabeceras.etag ?? null,
              readme_actualizado_en: new Date(),
              readme_error: null,
            };
      return await this.prisma.integracionGithub.update({
        where: { id: integracion.id },
        data,
      });
    } catch (error) {
      const mensaje = mensajeDeErrorGithub(
        error,
        `No existe el README en ${repositorio}@${rama}`,
      );
      return this.prisma.integracionGithub.update({
        where: { id: integracion.id },
        data: { readme_error: mensaje },
      });
    }
  }
}
