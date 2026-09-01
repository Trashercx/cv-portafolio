import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/features/auth/useLogin'
import { loginSchema, type LoginFormValues } from '@/features/auth/login-schema'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'

export function LoginPage() {
  const navigate = useNavigate()
  const setAdmin = useAuthStore((state) => state.setAdmin)
  const login = useLogin()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: (admin) => {
        setAdmin(admin)
        navigate('/admin', { replace: true })
      },
    })
  }

  const errorMessage =
    login.error instanceof ApiError
      ? login.error.message
      : login.error
        ? 'Ocurrió un error inesperado. Intenta de nuevo.'
        : null

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>
            Accede al panel de administración con tu email y contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="grid gap-4"
            >
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
                        placeholder="admin@example.com"
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
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorMessage ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
