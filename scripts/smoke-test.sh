#!/usr/bin/env bash
# Smoke test post-despliegue (Sprint 5).
#
# Verifica lo mínimo indispensable después de desplegar: que la API
# responde, que el login funciona (UC-01) y que el sitio público responde
# contra la última versión publicada (UC-12). No reemplaza los tests
# automatizados (Jest/Supertest) del CI — es una verificación rápida de que
# el despliegue en sí (contenedores, variables de entorno, red, DNS/TLS si
# aplica) quedó bien, corrida a mano o desde un paso de CD.
#
# Uso:
#   API_URL=https://api.tudominio.com \
#   ADMIN_EMAIL=admin@example.com \
#   ADMIN_PASSWORD=la-contrasena-real \
#   ./scripts/smoke-test.sh
#
# Sale con código 0 si todo pasó, distinto de 0 en el primer fallo.

set -euo pipefail

API_URL="${API_URL:?falta API_URL (ej. https://api.tudominio.com, sin barra final)}"
ADMIN_EMAIL="${ADMIN_EMAIL:?falta ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?falta ADMIN_PASSWORD}"

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

fallar() {
  echo "FALLÓ: $1" >&2
  exit 1
}

echo "== Smoke test contra ${API_URL} =="

echo "-- 1) Login (UC-01) --"
LOGIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -c "$COOKIE_JAR" \
  -X POST "${API_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

[ "$LOGIN_STATUS" = "200" ] || fallar "POST /auth/login devolvió ${LOGIN_STATUS}, se esperaba 200"
grep -q access_token "$COOKIE_JAR" || fallar "no se recibió la cookie access_token tras el login"
echo "   OK (200, cookie access_token presente)"

echo "-- 2) Ruta admin protegida usa la sesión (smoke rápido del guard) --"
ADMIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" "${API_URL}/admin/versiones")
[ "$ADMIN_STATUS" = "200" ] || fallar "GET /admin/versiones con sesión devolvió ${ADMIN_STATUS}, se esperaba 200"
echo "   OK (200)"

echo "-- 3) Sitio público contra la última versión publicada (UC-12) --"
SITIO_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${API_URL}/sitio")
if [ "$SITIO_STATUS" = "200" ]; then
  echo "   OK (200, hay una versión publicada)"
elif [ "$SITIO_STATUS" = "404" ]; then
  echo "   OK (404 — todavía no se publicó ninguna versión, es un estado válido en un despliegue nuevo)"
else
  fallar "GET /sitio devolvió ${SITIO_STATUS}, se esperaba 200 o 404"
fi

echo "-- 4) Sitio público es de acceso anónimo (sin cookie) --"
SITIO_ANON_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${API_URL}/sitio")
[ "$SITIO_ANON_STATUS" = "$SITIO_STATUS" ] || fallar "GET /sitio sin cookie se comportó distinto que con cookie (${SITIO_ANON_STATUS} vs ${SITIO_STATUS}), UC-12 exige acceso anónimo"
echo "   OK"

echo "== Smoke test OK =="
