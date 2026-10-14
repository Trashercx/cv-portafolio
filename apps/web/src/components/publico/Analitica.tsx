import { useEffect } from 'react'

/**
 * Inyecta el tracker de Umami una sola vez (Fase 8, 8.4; UC-27). Solo se monta
 * en rutas públicas (`App.tsx`); el lienzo del editor no lo ve porque
 * renderiza en un iframe sin `App`. No renderiza nada. Deduplica por
 * `data-website-id` para sobrevivir a StrictMode y a remontajes entre
 * navegaciones. Sin ambas variables de build no hace nada.
 */
export function Analitica() {
  const url = import.meta.env.VITE_UMAMI_URL
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID

  useEffect(() => {
    if (!url || !websiteId) return
    const existente = Array.from(
      document.head.querySelectorAll<HTMLScriptElement>('script[data-website-id]'),
    ).some((s) => s.getAttribute('data-website-id') === websiteId)
    if (existente) return

    const script = document.createElement('script')
    script.defer = true
    script.src = `${url}/script.js`
    script.setAttribute('data-website-id', websiteId)
    document.head.appendChild(script)
  }, [url, websiteId])

  return null
}
