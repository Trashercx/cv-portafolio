// Fase 8 (UC-34) — API simulada para Lighthouse CI (.github/workflows/lighthouse.yml).
//
// Servidor `node:http` sin dependencias que responde las rutas PÚBLICAS del
// API (UC-12 a UC-14) a partir del snapshot de prueba
// `scripts/fixtures/sitio-demo.json`, para que `vite preview` sirva un sitio
// con contenido realista (hero con imagen, proyectos, galería...) sin
// levantar Nest ni Postgres en el runner. Las imágenes del fixture apuntan a
// `http://127.0.0.1:4010/img/<archivo>.svg`, que este mismo servidor sirve
// desde `scripts/fixtures/img/`.
//
// Uso: `npm run api-simulada --workspace apps/web` (o `node scripts/api-simulada.mjs`),
// puerto por `PORT` (default 4010). El build de web debe hacerse con
// `VITE_API_URL=http://127.0.0.1:4010`.
//
// Además de las rutas que consume el sitio, expone `/seo/metadatos`,
// `/sitemap.xml` y `/robots.txt` con una versión mínima del contrato de la
// Fase 8 (docs/plan-tecnico.md), para poder probar en local la plantilla de
// nginx (SSI + proxy) sin el API real. No es una implementación de
// referencia: el API real vive en apps/api/src/modules/seo.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUERTO = Number(process.env.PORT ?? 4010)
// Solo loopback por defecto (CI y desarrollo). `HOST=0.0.0.0` para correrla
// dentro de un contenedor y probar la plantilla de nginx contra ella.
const HOST = process.env.HOST ?? '127.0.0.1'
const RAIZ_FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const RUTA_SNAPSHOT = join(RAIZ_FIXTURES, 'sitio-demo.json')
const DIR_IMG = join(RAIZ_FIXTURES, 'img')

const snapshot = JSON.parse(await readFile(RUTA_SNAPSHOT, 'utf8'))

/** Cabeceras comunes: CORS abierto porque el sitio público pide sin credenciales (`conCredenciales: false`). */
const CABECERAS_BASE = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Ruta-Publica',
  'X-Api-Simulada': '1',
}

function responderJson(res, estado, cuerpo, extra = {}) {
  const datos = JSON.stringify(cuerpo)
  res.writeHead(estado, {
    ...CABECERAS_BASE,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(datos),
    ...extra,
  })
  res.end(datos)
}

function responderTexto(res, estado, cuerpo, contentType, extra = {}) {
  res.writeHead(estado, {
    ...CABECERAS_BASE,
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(cuerpo),
    ...extra,
  })
  res.end(cuerpo)
}

function noEncontrado(res, ruta) {
  responderJson(res, 404, { statusCode: 404, message: `No existe ${ruta}`, error: 'Not Found' })
}

const escaparHtml = (valor) =>
  String(valor).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Fragmento SSI mínimo (contrato 8.1) según la ruta pública recibida en X-Ruta-Publica. */
function fragmentoMetadatos(rutaPublica) {
  const ruta = rutaPublica.split(/[?#]/)[0] || '/'
  const perfil = snapshot.perfil
  let titulo = 'Portafolio'
  let descripcion = ''
  let noindex = false
  const coincidencia = ruta.match(/^\/proyecto\/([^/]+)$/)
  if (ruta === '/' && perfil) {
    titulo = `${perfil.nombre_completo} — ${perfil.titulo_profesional}`
    descripcion = perfil.resumen_bio
  } else if (coincidencia) {
    const proyecto = snapshot.proyectos.find((p) => p.id === coincidencia[1])
    if (proyecto) {
      titulo = proyecto.titulo
      descripcion = proyecto.descripcion
    } else {
      titulo = 'Página no encontrada'
      noindex = true
    }
  } else if (ruta.startsWith('/admin')) {
    titulo = 'Panel de administración'
    noindex = true
  }
  const lineas = [`<title data-meta-estatico>${escaparHtml(titulo)}</title>`]
  if (descripcion) {
    lineas.push(`<meta name="description" content="${escaparHtml(descripcion)}" data-meta-estatico>`)
    lineas.push(`<meta property="og:title" content="${escaparHtml(titulo)}" data-meta-estatico>`)
    lineas.push(`<meta property="og:description" content="${escaparHtml(descripcion)}" data-meta-estatico>`)
  }
  if (noindex) lineas.push('<meta name="robots" content="noindex" data-meta-estatico>')
  return `${lineas.join('\n')}\n`
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PUERTO}`)
  const ruta = url.pathname

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CABECERAS_BASE)
    return res.end()
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return responderJson(res, 405, { statusCode: 405, message: 'Método no permitido' })
  }

  if (ruta === '/health') return responderJson(res, 200, { status: 'ok', simulada: true })

  // UC-12: snapshot completo de la "versión publicada".
  if (ruta === '/sitio') return responderJson(res, 200, snapshot)

  // UC-13: detalle contra el snapshot.
  const proyecto = ruta.match(/^\/proyectos\/([^/]+)$/)
  if (proyecto) {
    const encontrado = snapshot.proyectos.find((p) => p.id === proyecto[1])
    return encontrado ? responderJson(res, 200, encontrado) : noEncontrado(res, ruta)
  }
  const certificacion = ruta.match(/^\/certificaciones\/([^/]+)$/)
  if (certificacion) {
    const encontrada = snapshot.certificaciones.find((c) => c.id === certificacion[1])
    return encontrada ? responderJson(res, 200, encontrada) : noEncontrado(res, ruta)
  }

  // UC-14: redes y CV. El fixture no incluye un PDF real: 204 en vez del 302.
  if (ruta === '/redes') return responderJson(res, 200, snapshot.redes_sociales)
  if (ruta === '/cv') {
    res.writeHead(204, CABECERAS_BASE)
    return res.end()
  }

  // Imágenes del fixture (SVG). `basename` evita cualquier intento de salir de img/.
  if (ruta.startsWith('/img/')) {
    const archivo = basename(decodeURIComponent(ruta.slice('/img/'.length)))
    if (!archivo.endsWith('.svg')) return noEncontrado(res, ruta)
    const rutaArchivo = join(DIR_IMG, archivo)
    try {
      // Una sola lectura, sin `stat` previo: evita la carrera que marca CodeQL.
      const cuerpo = await readFile(rutaArchivo)
      res.writeHead(200, {
        ...CABECERAS_BASE,
        'Content-Type': 'image/svg+xml',
        'Content-Length': cuerpo.length,
        // Caché larga como la de S3/CloudFront en producción: así Lighthouse
        // no penaliza "Serve static assets with an efficient cache policy".
        'Cache-Control': 'public, max-age=31536000, immutable',
      })
      return res.end(cuerpo)
    } catch {
      return noEncontrado(res, ruta)
    }
  }

  // Fase 8 (8.1): versión mínima de las rutas de SEO, para probar nginx en local.
  if (ruta === '/seo/metadatos') {
    const rutaPublica = String(req.headers['x-ruta-publica'] ?? '/')
    return responderTexto(res, 200, fragmentoMetadatos(rutaPublica), 'text/html; charset=utf-8', {
      'Cache-Control': 'no-cache',
    })
  }
  if (ruta === '/sitemap.xml') {
    const origen = process.env.FRONTEND_ORIGIN ?? 'http://localhost:4173'
    const urls = [
      `<url><loc>${origen}/</loc></url>`,
      ...snapshot.proyectos.map((p) => `<url><loc>${origen}/proyecto/${p.id}</loc></url>`),
      ...snapshot.certificaciones.map((c) => `<url><loc>${origen}/certificacion/${c.id}</loc></url>`),
      ...snapshot.logros.map((l) => `<url><loc>${origen}/logro/${l.id}</loc></url>`),
    ]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
    return responderTexto(res, 200, xml, 'application/xml; charset=utf-8', {
      'Cache-Control': 'public, max-age=3600',
    })
  }
  if (ruta === '/robots.txt') {
    const origen = process.env.FRONTEND_ORIGIN ?? 'http://localhost:4173'
    return responderTexto(
      res,
      200,
      `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${origen}/sitemap.xml\n`,
      'text/plain; charset=utf-8',
      { 'Cache-Control': 'public, max-age=3600' },
    )
  }

  return noEncontrado(res, ruta)
})

servidor.listen(PUERTO, HOST, () => {
  console.log(
    `[api-simulada] escuchando en http://${HOST}:${PUERTO} — ${snapshot.proyectos.length} proyectos, ${snapshot.secciones.length} secciones (fixture ${basename(RUTA_SNAPSHOT)})`,
  )
})

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    servidor.close(() => process.exit(0))
  })
}
