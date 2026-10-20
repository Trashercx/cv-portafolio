import { useEffect, useState } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import type { IntegracionGithubPayload } from './types'
import {
  useActualizarReadmeGithub,
  useGuardarIntegracionGithub,
  useIntegracionGithub,
  useReadmeGithub,
} from './useIntegracionGithub'

const RAMA_POR_DEFECTO = 'main'

/** Formato `owner/repo` (espeja la validación del API, Fase 7m, #66). */
const REPOSITORIO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/
const RAMA = /^[\w./-]{1,255}$/

/**
 * Fase 7m (#66, UC-36): el README se renderiza como Markdown de solo lectura.
 * Solo se admiten `https:`, `mailto:` y anclas; todo lo demás (`javascript:`,
 * `data:`, rutas relativas) se descarta. El HTML crudo lo omite `skipHtml`.
 */
export function transformarUrlReadme(url: string): string {
  const valor = url.trim()
  if (valor.startsWith('#')) return valor
  try {
    const { protocol } = new URL(valor)
    return protocol === 'https:' || protocol === 'mailto:' ? valor : ''
  } catch {
    return ''
  }
}

/** Estilos propios con tokens del tema (sin `@tailwindcss/typography` ni colores fijos). */
const COMPONENTES_MARKDOWN: Components = {
  h1: (p) => <h1 className="mt-4 mb-2 border-b pb-1 text-xl font-semibold first:mt-0">{p.children}</h1>,
  h2: (p) => <h2 className="mt-4 mb-2 border-b pb-1 text-lg font-semibold first:mt-0">{p.children}</h2>,
  h3: (p) => <h3 className="mt-3 mb-1 text-base font-semibold first:mt-0">{p.children}</h3>,
  h4: (p) => <h4 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{p.children}</h4>,
  p: (p) => <p className="my-2 leading-relaxed">{p.children}</p>,
  ul: (p) => <ul className="my-2 list-disc pl-6">{p.children}</ul>,
  ol: (p) => <ol className="my-2 list-decimal pl-6">{p.children}</ol>,
  li: (p) => <li className="my-0.5">{p.children}</li>,
  blockquote: (p) => (
    <blockquote className="my-2 border-l-4 pl-3 text-muted-foreground">{p.children}</blockquote>
  ),
  hr: () => <hr className="my-4" />,
  a: ({ href, children }) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ src, alt }) =>
    typeof src === 'string' && src.startsWith('https:') ? (
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="my-2 inline-block max-w-full"
      />
    ) : null,
  code: ({ className, children }) => (
    <code className={`rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] ${className ?? ''}`}>
      {children}
    </code>
  ),
  pre: (p) => <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-sm">{p.children}</pre>,
  table: (p) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{p.children}</table>
    </div>
  ),
  th: (p) => <th className="border px-2 py-1 text-left font-semibold">{p.children}</th>,
  td: (p) => <td className="border px-2 py-1">{p.children}</td>,
}

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

function mensajeDe(error: unknown, defecto: string): string {
  return error instanceof ApiError ? error.message : defecto
}

/**
 * UC-36 (Fase 7m, #66): tarjeta "README del perfil" bajo la de GitHub en
 * `/admin/proyectos`. Configura repositorio y rama (sugerido `<usuario>/<usuario>`,
 * nunca fijo), actualiza el README a demanda y lo muestra renderizado y saneado.
 */
export function ReadmeGithub() {
  const integracionQuery = useIntegracionGithub()
  const integracion = integracionQuery.data
  const readmeQuery = useReadmeGithub()
  const guardar = useGuardarIntegracionGithub()
  const actualizar = useActualizarReadmeGithub()

  const [repositorio, setRepositorio] = useState('')
  const [rama, setRama] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // Los campos se rellenan desde la integración guardada (y se vuelven a rellenar tras guardar).
  const repositorioGuardado = integracion?.readme_repositorio ?? ''
  const ramaGuardada = integracion?.readme_rama ?? ''
  useEffect(() => {
    setRepositorio(repositorioGuardado)
    setRama(ramaGuardada)
  }, [repositorioGuardado, ramaGuardada])

  // `actualizar.data` es más reciente que la caché del GET justo tras pulsar el botón.
  const readme = actualizar.data ?? readmeQuery.data
  const usuario = integracion?.usuario_github?.trim()
  const sugerencia = usuario ? `${usuario}/${usuario}` : 'usuario/usuario'

  const onGuardar = () => {
    if (!integracion) return
    const repo = repositorio.trim()
    const ramaLimpia = rama.trim()
    if (repo && !REPOSITORIO.test(repo)) {
      setErrorForm('El repositorio debe tener el formato usuario/repositorio.')
      return
    }
    if (ramaLimpia && !RAMA.test(ramaLimpia)) {
      setErrorForm('La rama contiene caracteres no válidos.')
      return
    }
    setErrorForm(null)
    // PUT completo: reenvía lo ya guardado para no pisar el resto de la configuración.
    const payload: IntegracionGithubPayload = {
      usuario_github: integracion.usuario_github,
      activa: integracion.activa,
      intervalo_horas: integracion.intervalo_horas,
      publicar_automaticamente: integracion.publicar_automaticamente,
      incluir_forks: integracion.incluir_forks,
      incluir_archivados: integracion.incluir_archivados,
      destacar_nuevos: integracion.destacar_nuevos,
      readme_repositorio: repo || null,
      readme_rama: ramaLimpia || null,
    }
    guardar.mutate(payload)
  }

  const cambiosSinGuardar =
    repositorio.trim() !== repositorioGuardado || rama.trim() !== ramaGuardada
  const configurado = Boolean(integracion?.readme_repositorio)

  const cargando = integracionQuery.isLoading || readmeQuery.isLoading
  const errorCarga = integracionQuery.error ?? readmeQuery.error

  return (
    <Card>
      <CardHeader>
        <CardTitle>README del perfil</CardTitle>
        <CardDescription>
          Muestra aquí el README de tu perfil de GitHub (el repositorio que se llama igual que tu
          usuario). Es de solo lectura: el Markdown se sanea y nunca ejecuta HTML ni scripts.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {cargando ? <p className="text-sm text-muted-foreground">Cargando README…</p> : null}
        {errorCarga ? (
          <p role="alert" className="text-sm text-destructive">
            {mensajeDe(errorCarga, 'No se pudo cargar el README.')}
          </p>
        ) : null}

        {!cargando && !integracionQuery.error && !integracion ? (
          <p className="text-sm text-muted-foreground">
            Configura primero tu usuario de GitHub en la tarjeta de arriba.
          </p>
        ) : null}

        {integracion ? (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(evento) => {
              evento.preventDefault()
              onGuardar()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div className="grid gap-2">
                <Label htmlFor="readme-repositorio">Repositorio del README</Label>
                <Input
                  id="readme-repositorio"
                  autoComplete="off"
                  placeholder={sugerencia}
                  value={repositorio}
                  onChange={(evento) => setRepositorio(evento.target.value)}
                />
                {!repositorio.trim() ? (
                  <button
                    type="button"
                    className="w-fit text-xs text-primary underline underline-offset-2"
                    onClick={() => setRepositorio(sugerencia)}
                  >
                    Usar {sugerencia}
                  </button>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="readme-rama">Rama</Label>
                <Input
                  id="readme-rama"
                  autoComplete="off"
                  placeholder={RAMA_POR_DEFECTO}
                  value={rama}
                  onChange={(evento) => setRama(evento.target.value)}
                />
              </div>
            </div>

            {errorForm ? (
              <p role="alert" className="text-sm text-destructive">
                {errorForm}
              </p>
            ) : null}
            {guardar.error ? (
              <p role="alert" className="text-sm text-destructive">
                {mensajeDe(guardar.error, 'No se pudo guardar la configuración del README.')}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                // Actualizar usa lo ya guardado: hace falta guardar antes.
                disabled={!configurado || cambiosSinGuardar || actualizar.isPending}
                onClick={() => actualizar.mutate()}
              >
                {actualizar.isPending ? 'Actualizando…' : 'Actualizar README'}
              </Button>
              {cambiosSinGuardar && configurado ? (
                <span className="text-xs text-muted-foreground">
                  Guarda los cambios para actualizar.
                </span>
              ) : null}
            </div>
          </form>
        ) : null}

        {integracion && !cargando && !configurado ? (
          <p className="text-sm text-muted-foreground">
            Sin configurar: indica el repositorio (por ejemplo {sugerencia}) y pulsa Guardar.
          </p>
        ) : null}

        {configurado && readme?.error ? (
          <p role="alert" className="text-sm text-destructive">
            {readme.error}
          </p>
        ) : null}

        {configurado && readme?.markdown ? (
          <div className="grid gap-2">
            {readme.actualizado_en ? (
              <p className="text-xs text-muted-foreground">
                Última actualización: {formatearMomento(readme.actualizado_en)}
              </p>
            ) : null}
            <div
              data-testid="readme-renderizado"
              className="max-h-96 overflow-auto rounded-md bg-card p-4 text-sm text-card-foreground ring-1 ring-border"
            >
              <Markdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                urlTransform={transformarUrlReadme}
                components={COMPONENTES_MARKDOWN}
              >
                {readme.markdown}
              </Markdown>
            </div>
          </div>
        ) : null}

        {configurado && !readme?.markdown && !readme?.error && !cargando ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay README descargado. Pulsa «Actualizar README».
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
