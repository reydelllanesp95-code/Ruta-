# Lectura del odómetro — ajuste visual

Fila seleccionada blanca de 36 px, vecinos grises de 24 px al 35% de opacidad (además del degradado). Contorno rojo de 2 px sobre las ruedas, sin interceptar gestos. Lectura completa seleccionada o sugerida debajo. Se retira la insignia textual Flex; se mantiene Amazon Flex. Icono original pendiente, sin inventarlo.

## Validación

Salida real de tests:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> ruta@1.0.0 test
> vitest run


 RUN  v2.1.9 /workspace/scratch/bd38b2a8d3a3/Ruta-

 ✓ src/lib/__tests__/platforms.test.js (17 tests) 11ms
 ✓ src/lib/__tests__/cleaning.test.js (7 tests) 15ms
 ✓ src/lib/__tests__/vehicles.test.js (12 tests) 10ms
 ✓ src/lib/__tests__/parseRoutes.test.js (14 tests) 19ms
 ✓ src/lib/__tests__/fuel.test.js (13 tests) 57ms
 ✓ src/lib/__tests__/meals.test.js (7 tests) 65ms
 ✓ src/lib/__tests__/earnings.test.js (23 tests) 76ms
 ✓ src/lib/__tests__/maintenance.test.js (6 tests) 5ms
 ✓ src/lib/__tests__/homeTimes.test.js (9 tests) 15ms
 ✓ src/lib/__tests__/tolls.test.js (7 tests) 8ms
 ✓ src/lib/__tests__/config.test.js (5 tests) 6ms
 ✓ src/lib/__tests__/guidedShift.test.js (6 tests) 9ms
 ✓ src/lib/__tests__/shiftsCsv.test.js (3 tests) 7ms
 ✓ src/lib/__tests__/importFile.test.js (4 tests) 25ms
 ✓ src/lib/__tests__/shiftDraft.test.js (6 tests) 6ms
 ✓ src/lib/__tests__/odometer.test.js (6 tests) 4ms
 ✓ src/lib/__tests__/gatecodes.test.js (3 tests) 3ms

 Test Files  17 passed (17)
      Tests  148 passed (148)
   Start at  23:36:07
   Duration  1.14s (transform 471ms, setup 0ms, collect 1.31s, tests 342ms, environment 3ms, prepare 1.84s)

```

Salida real de build:

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
dist/assets/index-ciIVyT8T.js   285.49 kB │ gzip: 83.93 kB
✓ built in 2.52s

PWA v0.21.2
mode      generateSW
precache  8 entries (291.38 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

## Problemas encontrados

La banda central anterior estaba detrás de las superficies opacas de cada rueda. Ahora se pinta encima y no intercepta el gesto. Los números vecinos tenían el mismo tamaño y peso; ahora se distinguen por tamaño, peso y opacidad. La insignia provisional Flex duplicaba el nombre y ocupaba otra línea; retirada.

Rey confirmó que el gesto funciona en iPhone. La nueva apariencia aún debe comprobarse allí; no se afirma validación visual en Safari. Sin cambios de datos ni dependencias. Se conserva la advertencia npm sobre http-proxy.
