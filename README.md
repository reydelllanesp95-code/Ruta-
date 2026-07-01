# Ruta · OnTrac

App para trabajar con OnTrac: **códigos de acceso** de la ruta y **seguimiento
de ganancias reales** (cada paquete = $1.70). Funciona en el teléfono, se
instala como app (PWA) y guarda todo localmente, sin internet.

## Qué hace

- **Códigos**: directorio buscable de códigos de acceso de las comunidades de la
  ruta, con filtros por zip, estado (vigente / no sirve / revisar) y notas.
- **Ganancias**: subes el CSV de tu ruta y la app calcula:
  - **paquetes** y **ganancia** (paquetes × tarifa, por defecto $1.70),
  - **paradas** (direcciones distintas) y **millas** (las escribes tú),
  - **totales por semana y por mes**.

## Cómo le envío una ruta

En **Ganancias → Importar ruta** subes un archivo:

1. **Lo normal: el CSV oficial de OnTrac** (el manifest que exporta la app de
   OnTrac). Cada fila es un paquete; la app agrupa por dirección para contar
   las paradas y saca la fecha del archivo automáticamente.
2. **A mano: la plantilla manual** (`plantillas/ruta-plantilla.csv`), una fila
   por parada con columnas `fecha, parada, direccion, paquetes`.

La app **detecta sola** cuál de los dos subiste. Ver `plantillas/COMO-USAR.md`
para el detalle. En `plantillas/` hay ejemplos listos para probar.

## Correr el proyecto

```bash
npm install
npm run dev      # desarrollo (http://localhost:5173)
npm run build    # build de producción en dist/
npm run preview  # previsualizar el build
npm test         # pruebas (Vitest)
```

## Instalar en el teléfono

Abre la URL del build en el navegador del teléfono y usa **"Agregar a pantalla
de inicio"**. Queda como una app y funciona sin conexión.

## Respaldo

En **Ganancias** puedes **Exportar respaldo** (un `.json` con todo: códigos +
rutas) e **Importar respaldo** para restaurarlo si cambias de teléfono.

## Estructura

```
src/
  App.jsx                      navegación (Códigos / Ganancias)
  components/
    GateCodeDirectory.jsx      directorio de códigos
    Earnings.jsx               sección de ganancias
    earnings/                  StatsCards, RouteCard, ImportDialog, resúmenes
  lib/
    storage.js                 localStorage + versionado + migración
    csv.js                     lector CSV robusto
    parseRoutes.js             orquestador de parsers
    parsers/ontrac.js          parser del CSV de OnTrac (1 fila = 1 paquete)
    parsers/manual.js          parser de la plantilla manual
    earnings.js                fechas, hash, validación, agregaciones
    backup.js                  exportar/importar respaldo JSON
    __tests__/                 pruebas (Vitest)
plantillas/                    ejemplos y plantilla + COMO-USAR.md
```

Todos los datos viven en `localStorage` del teléfono. No hay servidor.
