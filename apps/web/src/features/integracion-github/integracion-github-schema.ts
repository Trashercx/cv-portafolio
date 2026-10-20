import { z } from 'zod'

/** Nombre de usuario de GitHub: alfanumérico y guiones simples, sin guion al inicio/fin, hasta 39 caracteres. */
const USUARIO_GITHUB = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

/** Espeja `GuardarIntegracionGithubDto` (Fase 7l, UC-36). El intervalo se acota a 1–168 h (una semana). */
export const integracionGithubSchema = z.object({
  usuario_github: z
    .string()
    .trim()
    .min(1, 'El usuario de GitHub es obligatorio')
    .regex(USUARIO_GITHUB, 'Usuario de GitHub inválido'),
  activa: z.boolean(),
  intervalo_horas: z
    .number({ error: 'Indica un número de horas' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 hora')
    .max(168, 'Máximo 168 horas (una semana)'),
  publicar_automaticamente: z.boolean(),
  incluir_forks: z.boolean(),
  incluir_archivados: z.boolean(),
  destacar_nuevos: z.boolean(),
})

export type IntegracionGithubFormValues = z.infer<typeof integracionGithubSchema>
