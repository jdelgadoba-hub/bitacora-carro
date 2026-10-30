#!/usr/bin/env bash
# Batería de seguridad y regresión. Obligatoria antes de cada publicación (ver CLAUDE.md).
# Uso: tests/run.sh      Requisitos: node, python3, playwright (npm i) y Chromium
#      (CHROMIUM_PATH=/ruta/al/chromium si no usa el de Playwright).
set -u
cd "$(dirname "$0")"
PORT="${PORT:-8766}"; export PORT
python3 -m http.server "$PORT" -d .. >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
fail=0
check(){ # check "<descripción>" "<salida>" "<patrón esperado>"
  if grep -qE -- "$3" <<<"$2"; then echo "  OK    $1"; else echo "  FALLA $1"; fail=1; fi; }
none(){  # none "<descripción>" "<salida>" "<patrón que NO debe aparecer>"
  if grep -qE -- "$3" <<<"$2"; then echo "  FALLA $1"; fail=1; else echo "  OK    $1"; fi; }

echo "== Revisión estática =="
S=$(grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" ../app.js ../sw.js || true)
none "sin funciones que inyectan HTML/código" "$S" "."
E=$(grep -noE "https?://[^\"' )]+" ../app.js ../sw.js ../index.html ../manifest.webmanifest || true)
none "sin conexiones a dominios externos" "$E" "."
check "CSP estricta presente" "$(cat ../index.html)" "default-src 'self'; script-src 'self';[^\"]*connect-src 'self'[^\"]*object-src 'none'"
none "sin scripts inline" "$(grep -n '<script>' ../index.html || true)" "."

echo "== Ataques =="
O=$(node evil.js 2>&1);  check "XSS en servicios bloqueado"         "$O" "pwned: 0 \| proto polluted: 0"
                         check "fórmulas CSV neutralizadas"         "$O" "'=HYPERLINK"
                         check "conexión externa bloqueada por CSP" "$O" "fetch externo: bloqueado"
                         check "sin errores JS"                     "$O" "errores JS: \[\]"
O=$(node evil2.js 2>&1); check "lecturas maliciosas: sin XSS"       "$O" "pwned: 0 \| proto: 0 \| <img> inyectados: 0"
                         check "ID repetido no borra el vehículo"   "$O" "vehículo intacto: Carro"
                         check "30.000 lecturas sin colapsar"       "$O" "vehículo intacto: Volumen"
                         none  "sin errores JS"                     "$O" "errores: \[[^]]"
O=$(node evil3.js 2>&1); check "nombres con código en frecuencias"  "$O" "pwned: 0 \| <img> inyectados: 0"
                         none  "datos absurdos no inflan cifras"    "$O" "[0-9]{1,3}(\.[0-9]{3}){2,},?[0-9]*/año"
                         check "sin errores JS"                     "$O" "errores: \[\]"
O=$(node frame.js 2>&1); check "anti-clickjacking"                  "$O" "Abre la Bitácora directamente"

echo "== Regresión funcional =="
O=$(node test.js 2>&1);  check "guardar y recargar"                 "$O" "after reload: El Corolla"
                         check "sin errores ni desborde"            "$O" "overflow: false"
O=$(node odo2.js 2>&1);  check "odómetro: corrección confirmada"    "$O" "4\) menor confirmado -> 8.600km"
O=$(node km.js 2>&1);    check "km/mes y km/año exactos"            "$O" "stats: 2.007Km / mes24.066Km / año18.000Total 2026"
                         check "presupuesto exacto"                 "$O" "\\\$866.374"
O=$(node yr.js 2>&1);    check "aviso de cierre en diciembre"       "$O" "Cierre de año: registra el km el 31 de diciembre"
                         check "cambio de año a 2027"               "$O" "selector de año: 2026,2027 \(elegido 2027\)"
                         none  "sin errores JS"                     "$O" "errores: \[[^]]"

echo
if [ $fail -eq 0 ]; then echo "RESULTADO: TODO OK — se puede publicar."; else echo "RESULTADO: HAY FALLAS — NO publicar."; fi
exit $fail
