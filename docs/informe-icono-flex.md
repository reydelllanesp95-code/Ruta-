# Icono original de Flex

Imagen obtenida de la ficha oficial de Amazon Flex de AMZN Mobile LLC en el App Store, mediante metadatos Apple. Ver docs/icono-flex-source.md para procedencia. Archivo original JPEG 512×512 sin modificar, inspeccionado visualmente: fondo azul y trazos blancos coincidentes con la referencia de Rey.

El selector usa el icono a 24×24 con nombre visible y mantiene el rojo de selección. Imagen decorativa con alt vacío, dimensiones explícitas y disponibilidad offline mediante includeAssets. No hay cambios de datos ni dependencias.

## Validación real

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> ruta@1.0.0 test
> vitest run


 RUN  v2.1.9 /workspace/scratch/bd38b2a8d3a3/Ruta-

 ✓ src/lib/__tests__/platforms.test.js (17 tests) 14ms
 ✓ src/lib/__tests__/meals.test.js (7 tests) 32ms
 ✓ src/lib/__tests__/fuel.test.js (13 tests) 32ms
 ✓ src/lib/__tests__/cleaning.test.js (7 tests) 19ms
 ✓ src/lib/__tests__/earnings.test.js (23 tests) 36ms
 ✓ src/lib/__tests__/vehicles.test.js (12 tests) 11ms
 ✓ src/lib/__tests__/parseRoutes.test.js (14 tests) 26ms
 ✓ src/lib/__tests__/maintenance.test.js (6 tests) 6ms
 ✓ src/lib/__tests__/config.test.js (5 tests) 5ms
 ✓ src/lib/__tests__/tolls.test.js (7 tests) 17ms
 ✓ src/lib/__tests__/homeTimes.test.js (9 tests) 8ms
 ✓ src/lib/__tests__/shiftsCsv.test.js (3 tests) 7ms
 ✓ src/lib/__tests__/guidedShift.test.js (6 tests) 12ms
 ✓ src/lib/__tests__/importFile.test.js (4 tests) 36ms
 ✓ src/lib/__tests__/shiftDraft.test.js (6 tests) 7ms
 ✓ src/lib/__tests__/odometer.test.js (6 tests) 4ms
 ✓ src/lib/__tests__/gatecodes.test.js (3 tests) 3ms

 Test Files  17 passed (17)
      Tests  148 passed (148)
   Start at  00:03:49
   Duration  1.20s (transform 535ms, setup 0ms, collect 1.38s, tests 275ms, environment 4ms, prepare 1.95s)

```

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
dist/assets/index-Di-w0q0F.css   11.66 kB │ gzip:  3.13 kB
dist/assets/index-CZJfFI_Q.js   286.99 kB │ gzip: 84.19 kB
✓ built in 2.76s

PWA v0.21.2
mode      generateSW
precache  9 entries (292.88 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

Comprobado que dist/sw.js incluye amazon-flex.jpg en el precache.

## Problemas encontrados

La solicitud anterior de no copiar de internet queda sustituida por la instrucción explícita de Rey de buscar el logo. Se usa el archivo de Apple, sin recrearlo. No se generó ninguna imagen.

Se conserva la advertencia npm de http-proxy. Comprobación visual del icono original hecha; apariencia del selector en iPhone pendiente de Rey.
