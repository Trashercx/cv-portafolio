import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Wrapper de `sonner` con estilo shadcn "new-york". El proyecto no usa
 * Next.js ni tiene un toggle de modo oscuro activo (ver `apps/web/src/index.css`,
 * el `.dark` existe como convención de shadcn pero no hay UI para
 * alternarlo) — por eso `theme` queda fijo en `"light"` en vez de depender
 * de `next-themes`, que aquí sería una dependencia innecesaria.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
