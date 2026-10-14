import { zodResolver } from '@hookform/resolvers/zod'
import {
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  Loader2,
  LockKeyhole,
  TriangleAlert,
} from 'lucide-react'
import { m } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { ImagenResponsive } from '@/components/publico/ImagenResponsive'
import { ProveedorMotion } from '@/components/publico/ProveedorMotion'
import { ThemeProvider, useTheme } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  clasificarErrorLogin,
  guardarEmailRecordado,
  inicialesDe,
  leerEmailRecordado,
} from '@/features/auth/errores-login'
import { loginSchema, type LoginFormValues } from '@/features/auth/login-schema'
import { useLogin } from '@/features/auth/useLogin'
import { useSitioPublicado } from '@/features/publico/usePublico'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { temaComoVariablesCss } from '@/lib/tema-css'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

const MENSAJES_ERROR = {
  credenciales: 'Email o contraseña incorrectos.',
  limite: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  red: 'No se pudo contactar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
} as const

/**
 * Pantalla de inicio de sesión del panel (UC-01, rediseño Fase 7f).
 *
 * `LoginPage` es lazy y vive fuera de `AdminLayout` (Fase 8), así que trae su
 * propio `ThemeProvider` (modo claro/oscuro del chrome del panel) y
 * `ProveedorMotion` (`LazyMotion`).
 */
export function LoginPage() {
  return (
    <ThemeProvider>
      <ProveedorMotion>
        <PantallaLogin />
      </ProveedorMotion>
    </ThemeProvider>
  )
}

function PantallaLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAdmin = useAuthStore((state) => state.setAdmin)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const login = useLogin()
  const { theme } = useTheme()
  const reducido = usePrefiereMovimientoReducido()
  const { data: snapshot } = useSitioPublicado()
  const sesionExpirada = searchParams.get('sesion') === 'expirada'

  const [emailRecordado] = useState(leerEmailRecordado)
  const [recordar, setRecordar] = useState(emailRecordado !== '')
  const [verPassword, setVerPassword] = useState(false)
  const [bloqMayus, setBloqMayus] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailRecordado, password: '' },
  })
  const { resetField } = form
  const formRef = useRef<HTMLFormElement>(null)
  // Fase 7f, UC-01: `setFocus` de RHF no enfocó el `<input>` en las pruebas (jsdom);
  // se enfoca por nombre sobre el propio formulario.
  const enfocar = useCallback((nombre: 'email' | 'password') => {
    const campo = formRef.current?.elements.namedItem(nombre)
    if (campo instanceof HTMLInputElement) campo.focus()
  }, [])

  // Fase 7f, UC-01: foco inicial en el email (o en la contraseña si ya hay
  // uno recordado).
  useEffect(() => {
    enfocar(emailRecordado ? 'password' : 'email')
  }, [enfocar, emailRecordado])

  const error = clasificarErrorLogin(login.error)

  // Tras un error la contraseña se vacía y recibe el foco; el aviso
  // (`role="alert"`) lo anuncia el lector de pantalla.
  useEffect(() => {
    if (!login.error) return
    resetField('password', { defaultValue: '' })
    enfocar('password')
  }, [login.error, resetField, enfocar])

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: (admin) => {
        guardarEmailRecordado(recordar ? values.email : null)
        setAdmin(admin)
        navigate('/admin', { replace: true })
      },
    })
  }

  const detectarBloqMayus = (evento: KeyboardEvent<HTMLInputElement>) => {
    setBloqMayus(evento.getModifierState('CapsLock'))
  }

  // Octava ronda (UC-01): con la sesión ya rehidratada (o iniciada) no tiene
  // sentido mostrar el formulario.
  if (isAuthenticated) return <Navigate to="/admin" replace />

  const perfil = snapshot?.perfil ?? null
  const nombre = perfil?.nombre_completo ?? null
  const iniciales = inicialesDe(nombre)
  const modoTema = theme === 'dark' ? 'oscuro' : 'claro'
  const pendiente = login.isPending

  return (
    <div className="grid min-h-svh grid-cols-1 grid-rows-[auto_1fr] lg:grid-rows-1 overflow-x-hidden bg-background text-foreground lg:grid-cols-2">
      <title>Iniciar sesión · Panel</title>
      <meta name="robots" content="noindex" />

      {/* Panel de marca: tema y fondo del sitio publicado (o los de por defecto). */}
      <aside
        data-testid="panel-marca"
        style={
          snapshot?.tema ? temaComoVariablesCss(snapshot.tema, modoTema) : undefined
        }
        className="relative min-w-0 overflow-hidden border-b bg-background text-foreground lg:flex lg:min-h-svh lg:items-end lg:border-b-0 lg:border-r"
      >
        {snapshot?.fondo ? (
          <FondoAnimado fondo={snapshot.fondo} modo="sitio" ambito="caja" />
        ) : null}
        <div className="relative z-10 px-6 py-5 lg:p-12">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Panel de administración del portafolio
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight lg:mt-4 lg:text-4xl">
            {nombre ?? 'Portafolio'}
          </p>
          {perfil?.titulo_profesional ? (
            <p className="mt-1 text-sm text-muted-foreground lg:text-lg">
              {perfil.titulo_profesional}
            </p>
          ) : null}
        </div>
      </aside>

      <main className="relative flex w-full min-w-0 items-center justify-center px-4 py-16 lg:min-h-svh">
        <div className="absolute inset-x-0 top-4 flex items-center justify-between gap-2 px-4">
          <Link
            to="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Volver al sitio
          </Link>
          <ThemeToggle />
        </div>

        <m.div
          initial={reducido ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mx-auto w-full min-w-0 max-w-sm"
        >
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-12 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {perfil?.imagen_perfil ? (
                  <ImagenResponsive
                    media={perfil.imagen_perfil}
                    alt={nombre ?? ''}
                    sizes="48px"
                    className="size-12 object-cover"
                  />
                ) : iniciales ? (
                  <span aria-hidden="true">{iniciales}</span>
                ) : (
                  <LockKeyhole className="size-5" aria-hidden="true" />
                )}
              </div>
              <CardTitle>Iniciar sesión</CardTitle>
              <CardDescription>
                Accede al panel de administración con tu email y contraseña.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  ref={formRef}
                  onSubmit={form.handleSubmit(onSubmit)}
                  noValidate
                  className="grid gap-4"
                >
                  {error ? (
                    <Alert variant="destructive" aria-live="polite">
                      {error.tipo === 'bloqueo' ? (
                        <TriangleAlert aria-hidden="true" />
                      ) : (
                        <CircleAlert aria-hidden="true" />
                      )}
                      <AlertDescription>
                        {error.tipo === 'bloqueo' ? (
                          <>
                            <p>{error.mensajeApi}</p>
                            <p>
                              El bloqueo dura unos minutos; vuelve a intentarlo
                              más tarde.
                            </p>
                          </>
                        ) : (
                          <p>{MENSAJES_ERROR[error.tipo]}</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : sesionExpirada ? (
                    <Alert aria-live="polite">
                      <Info aria-hidden="true" />
                      <AlertDescription>
                        <p>Tu sesión expiró. Inicia sesión de nuevo.</p>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="admin@example.com"
                            disabled={pendiente}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={verPassword ? 'text' : 'password'}
                              autoComplete="current-password"
                              className="pr-10"
                              disabled={pendiente}
                              onKeyDown={detectarBloqMayus}
                              onKeyUp={detectarBloqMayus}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2"
                            aria-label={
                              verPassword
                                ? 'Ocultar contraseña'
                                : 'Mostrar contraseña'
                            }
                            aria-pressed={verPassword}
                            disabled={pendiente}
                            onClick={() => setVerPassword((v) => !v)}
                          >
                            {verPassword ? (
                              <EyeOff aria-hidden="true" />
                            ) : (
                              <Eye aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                        {bloqMayus ? (
                          <p
                            role="status"
                            className="text-xs text-muted-foreground"
                          >
                            Bloq Mayús activado
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="login-recordar"
                      checked={recordar}
                      onCheckedChange={(v) => setRecordar(v === true)}
                      disabled={pendiente}
                    />
                    <Label
                      htmlFor="login-recordar"
                      className={cn('font-normal', pendiente && 'opacity-50')}
                    >
                      Recordar mi email
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={pendiente}>
                    {pendiente ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden="true" />
                        Ingresando…
                      </>
                    ) : (
                      'Ingresar'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </m.div>
      </main>
    </div>
  )
}
