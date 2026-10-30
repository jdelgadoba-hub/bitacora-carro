# Bitácora del Carro — reglas del proyecto

PWA estática (GitHub Pages) que guarda los datos solo en el dispositivo (IndexedDB). Sin servidor, sin dependencias de terceros en la app, sin conexiones externas.

## Política de seguridad (obligatoria, pedida por el dueño)

**Ningún cambio se publica sin pentest previo y con cero hallazgos abiertos.** Antes de cada `git push` a `main`:

1. **Revisión adversarial del cambio**: identificar la superficie nueva (entradas, importación de respaldos, cálculos, renderizado) y atacarla.
2. **Agregar pruebas de ataque** en `tests/` para la superficie nueva y sumarlas a `tests/run.sh` con aserciones.
3. **Ejecutar `tests/run.sh`**. Debe terminar en `RESULTADO: TODO OK`. Con cualquier `FALLA`, no se publica.
4. **Revisión visual** en ancho de teléfono (claro y oscuro): nada se sale de la pantalla.
5. Subir `VERSION` en `sw.js` para que los teléfonos reciban la versión nueva.
6. Informar al dueño: qué se probó, hallazgos encontrados y cómo se corrigieron, riesgo residual.

## Reglas de código que no se rompen

- Nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` ni `new Function`: el DOM se construye con `el()` y `textContent`.
- Nunca scripts inline, librerías externas ni conexiones a otros dominios; la CSP de `index.html` no se relaja.
- Todo dato importado pasa por `sanitize()` (tipos conocidos, IDs únicos, fechas reales, km ≤ 2.000.000, costos ≤ 1e9).
- Tablas de búsqueda con prototipo nulo o `Map`, nunca objetos planos indexados con datos del usuario.
- Fechas futuras e intervalos absurdos no alimentan promedios ni presupuestos.
- Exportaciones CSV neutralizan fórmulas (`= + - @`).

## Ejecutar las pruebas

```
cd tests && npm install && ./run.sh
# CHROMIUM_PATH=/ruta/chromium ./run.sh   si no se usa el navegador de Playwright
```

`tests/` se publica junto con la app en GitHub Pages; no contiene secretos ni datos reales.
