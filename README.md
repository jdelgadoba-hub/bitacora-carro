# Bitácora del Carro

App web instalable (PWA) para llevar el mantenimiento de tus vehículos: cambios de aceite, bandas, filtros, frenos, piezas, costos y kilometraje.

## Privacidad

- **Tus datos se guardan solo en tu teléfono**, en el almacenamiento interno del navegador (IndexedDB).
- Este repositorio y GitHub Pages solo contienen el **código**. No hay servidor, base de datos, analítica ni conexiones externas: la política de seguridad de contenido (CSP) de `index.html` bloquea cualquier conexión a otros dominios.
- Los respaldos son archivos `.json` que tú guardas donde quieras (iCloud Drive, Google Drive, OneDrive).

## Instalar en el iPhone

1. Abre la URL de GitHub Pages en **Safari**.
2. Toca **Compartir** → **Agregar a pantalla de inicio**.
3. Abre la app siempre desde ese ícono. Los datos del ícono y los de Safari son espacios separados.

## Respaldos (importante)

iOS puede borrar los datos de una app web si el teléfono se queda sin espacio, y se borran si eliminas el ícono. Por eso:

- **Respaldar** → menú Compartir → *Guardar en Archivos* → elige iCloud Drive, Google Drive u OneDrive.
- **Restaurar** → selecciona el archivo `.json`. Reemplaza los datos actuales del dispositivo.
- La app te avisa si llevas 30 días o más sin respaldar.

## Kilometraje y presupuesto

- Cada lectura del odómetro queda en el historial. Registra el km **una vez al mes** (por ejemplo, el último día); también puedes cargar lecturas de fechas pasadas.
- La app calcula los **km por mes** (entre dos lecturas, reparte los km según los días), el **promedio mensual**, la **proyección anual** y el total del año.
- **Cambios de aceite al año**: siempre visible. Usa tu intervalo (el "próximo km" que pongas al registrar el cambio) o el sugerido de 5.000 km / 6 meses, marcado como tal.
- **Resumen por año**: km, cambios de aceite, servicios y gasto de cada año. Al llegar el 1 de enero, el año anterior queda cerrado ahí y en el selector de año; el promedio sigue usando los últimos 12 meses, así que no se "reinicia". En diciembre la app pide la lectura del 31 para cerrar el año exacto.
- El **presupuesto anual** multiplica cuántas veces al año te toca cada servicio (según tu promedio de km y el intervalo que definiste) por su último costo.

## Publicar actualizaciones

Cada vez que cambies archivos, sube el valor de `VERSION` en `sw.js` (por ejemplo `bc-v2`) para que los teléfonos descarguen la versión nueva.

## Intervalos sugeridos

Los intervalos que se rellenan automáticamente (por ejemplo, aceite cada 5.000 km o 6 meses) son **genéricos y editables**. Usa siempre los del manual de tu vehículo.
