# Odómetro inicial fijo y llegada junto al final

En turnos nuevos de reparto, al registrar salida el odómetro inicial se presenta fijo. Corregir abre las ruedas y Fijar odómetro inicial vuelve a cerrarlas. Reabrir el borrador conserva la lectura fija. Si falta una lectura se indica Sin registrar, sin inventar un número.

Llegué a casa aparece inmediatamente debajo del odómetro final; nunca en la zona del inicial. Inicio/fin y Añadir otro bloque siguen en la parte superior. Los registros guardados siguen teniendo su edición explícita. Sin cambios de almacenamiento, cálculos o dependencias.

## Resultados reales

Prueba temporal del formulario, retirada tras ejecutarla según el flujo existente:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v2.1.9 /workspace/scratch/bd38b2a8d3a3/Ruta-

 ✓ src/lib/__tests__/odometerStagesUI.test.jsx (2 tests) 654ms
   ✓ fija la lectura al salir, admite corrección y se recupera fija 462ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  23:41:20
   Duration  1.88s (transform 120ms, setup 0ms, collect 351ms, tests 654ms, environment 545ms, prepare 143ms)

```

Tests del proyecto:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> ruta@1.0.0 test
> vitest run


 RUN  v2.1.9 /workspace/scratch/bd38b2a8d3a3/Ruta-

 ✓ src/lib/__tests__/platforms.test.js (17 tests) 14ms
 ✓ src/lib/__tests__/meals.test.js (7 tests) 52ms
 ✓ src/lib/__tests__/fuel.test.js (13 tests) 45ms
 ✓ src/lib/__tests__/vehicles.test.js (12 tests) 12ms
 ✓ src/lib/__tests__/cleaning.test.js (7 tests) 28ms
 ✓ src/lib/__tests__/earnings.test.js (23 tests) 58ms
 ✓ src/lib/__tests__/parseRoutes.test.js (14 tests) 26ms
 ✓ src/lib/__tests__/homeTimes.test.js (9 tests) 12ms
 ✓ src/lib/__tests__/maintenance.test.js (6 tests) 6ms
 ✓ src/lib/__tests__/tolls.test.js (7 tests) 27ms
 ✓ src/lib/__tests__/guidedShift.test.js (6 tests) 15ms
 ✓ src/lib/__tests__/config.test.js (5 tests) 18ms
 ✓ src/lib/__tests__/importFile.test.js (4 tests) 55ms
 ✓ src/lib/__tests__/shiftsCsv.test.js (3 tests) 10ms
 ✓ src/lib/__tests__/shiftDraft.test.js (6 tests) 8ms
 ✓ src/lib/__tests__/odometer.test.js (6 tests) 5ms
 ✓ src/lib/__tests__/gatecodes.test.js (3 tests) 3ms

 Test Files  17 passed (17)
      Tests  148 passed (148)
   Start at  23:41:31
   Duration  1.80s (transform 721ms, setup 0ms, collect 1.90s, tests 395ms, environment 5ms, prepare 2.46s)

```

Build:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> ruta@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1614 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                0.14 kB
dist/manifest.webmanifest         0.47 kB
dist/index.html                   0.89 kB │ gzip:  0.49 kB
dist/assets/index-A1RIiamf.css   11.63 kB │ gzip:  3.13 kB
dist/assets/index-BC99NL5E.js   286.74 kB │ gzip: 84.10 kB
✓ built in 2.86s

PWA v0.21.2
mode      generateSW
precache  8 entries (292.61 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

## Problemas encontrados

El primer intento de la prueba temporal encontró dos textos iguales: lectura fija inicial y sugerencia final, que comparten valor legítimamente antes de introducir la lectura final. Se corrigió el selector de prueba para comprobar específicamente la tarjeta fija; no se cambió el criterio ni se eliminó la aserción.

La verificación jsdom comprueba estado, recuperación y orden DOM, no apariencia en Safari. La apariencia debe confirmarse en iPhone. Se conserva la advertencia npm sobre http-proxy.

Icono original de Flex pendiente de archivo adjunto; no se sustituye por un dibujo o una marca inventada.
