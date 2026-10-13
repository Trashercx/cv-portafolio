import { useEffect } from 'react'
import { urlAbsoluta, urlCanonicaActual } from '@/lib/seo'

type MetadatosPaginaProps = {
  titulo: string
  descripcion?: string
  /** URL de la imagen de compartición (Open Graph/Twitter); opcional. */
  imagen?: string | null
  /** `og:type`; `website` por defecto, `profile`/`article` según la página. */
  tipo?: 'website' | 'profile' | 'article'
}

/**
 * Metadatos por página del sitio público (Fase 6, UC-12/UC-13): `<title>`,
 * description, canonical, Open Graph y Twitter card. React 19 hoistea
 * `<title>`, `<meta>` y `<link>` al `<head>` aunque se rendericen dentro de
 * un componente, así que no hace falta react-helmet.
 *
 * Los metadatos genéricos de `index.html` llevan `data-meta-estatico`: al
 * montarse este componente se retiran, para no dejar dos `description`/
 * `og:type` en el `<head>` (React no deduplica contra nodos que no creó).
 *
 * La URL canónica es `origin + pathname` (sin query ni hash).
 */
export function MetadatosPagina({
  titulo,
  descripcion,
  imagen,
  tipo = 'website',
}: MetadatosPaginaProps) {
  useEffect(() => {
    document.head
      .querySelectorAll('[data-meta-estatico]')
      .forEach((nodo) => nodo.remove())
  }, [])

  const url = urlCanonicaActual()
  const imagenAbsoluta = imagen ? urlAbsoluta(imagen) : null

  return (
    <>
      <title>{titulo}</title>
      {descripcion ? <meta name="description" content={descripcion} /> : null}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={titulo} />
      {descripcion ? (
        <meta property="og:description" content={descripcion} />
      ) : null}
      <meta property="og:type" content={tipo} />
      <meta property="og:url" content={url} />
      {imagenAbsoluta ? (
        <meta property="og:image" content={imagenAbsoluta} />
      ) : null}
      <meta
        name="twitter:card"
        content={imagenAbsoluta ? 'summary_large_image' : 'summary'}
      />
      <meta name="twitter:title" content={titulo} />
      {descripcion ? (
        <meta name="twitter:description" content={descripcion} />
      ) : null}
      {imagenAbsoluta ? (
        <meta name="twitter:image" content={imagenAbsoluta} />
      ) : null}
    </>
  )
}
