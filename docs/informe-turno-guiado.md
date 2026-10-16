# Turno guiado — informe de revisión

Implementado en `feat/turno-guiado`, desde main `d549eb1`. No publicado en main.

## Cambios

- Odómetro con ruedas independientes 0–9 por gesto vertical y encaje CSS. Números grandes, teclado accesible y alternativa Escribir. Se conserva la precarga por carro. Sin acarreo entre ruedas.
- Una acción principal registra salida, inicio, fin y llegada. Horas visibles y corrección manual. Después de cada bloque se puede añadir otro o volver al bloque anterior.
- Una jornada conserva un carro y plataforma. El campo opcional `bloques` guarda inicio/fin/pago/propina de cada bloque; el registro agregado suma pagos y horas trabajadas, pero solo cuenta una vez millas y horas casa→casa. En el historial una jornada cuenta como un turno, aunque contenga varios bloques. No mezcla plataformas dentro de una jornada.
- Validación de bloques incompletos, pagos, solapamientos y límites de jornada; admite medianoche, con jornada menor de 24 horas. Turnos antiguos sin bloques mantienen su comportamiento.
- El borrador conserva etapas, bloques y pago. El historial y la edición conservan detalles de bloques. Sin cambios de claves ni schemaVersion. El respaldo JSON ya conserva objetos completos de rutas, incluidos los bloques opcionales.
- Tema negro/gris/rojo conservado. Insignia azul textual Flex provisional. Falta archivo del icono original. Sin implementación de voz.

## Validación

Salida real de `npm test`:

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> ruta@1.0.0 test
> vitest run


 RUN  v2.1.9 /workspace/scratch/bd38b2a8d3a3/Ruta-

 ✓ src/lib/__tests__/platforms.test.js (17 tests) 11ms
 ✓ src/lib/__tests__/meals.test.js (7 tests) 31ms
 ✓ src/lib/__tests__/fuel.test.js (13 tests) 33ms
 ✓ src/lib/__tests__/cleaning.test.js (7 tests) 19ms
 ✓ src/lib/__tests__/earnings.test.js (23 tests) 36ms
 ✓ src/lib/__tests__/parseRoutes.test.js (14 tests) 18ms
 ✓ src/lib/__tests__/vehicles.test.js (12 tests) 12ms
 ✓ src/lib/__tests__/tolls.test.js (7 tests) 10ms
 ✓ src/lib/__tests__/homeTimes.test.js (9 tests) 10ms
 ✓ src/lib/__tests__/maintenance.test.js (6 tests) 8ms
 ✓ src/lib/__tests__/config.test.js (5 tests) 9ms
 ✓ src/lib/__tests__/shiftsCsv.test.js (3 tests) 8ms
 ✓ src/lib/__tests__/guidedShift.test.js (6 tests) 11ms
 ✓ src/lib/__tests__/importFile.test.js (4 tests) 14ms
 ✓ src/lib/__tests__/shiftDraft.test.js (6 tests) 9ms
 ✓ src/lib/__tests__/odometer.test.js (6 tests) 4ms
 ✓ src/lib/__tests__/gatecodes.test.js (3 tests) 3ms

 Test Files  17 passed (17)
      Tests  148 passed (148)
   Start at  23:16:40
   Duration  1.21s (transform 508ms, setup 0ms, collect 1.38s, tests 246ms, environment 4ms, prepare 1.15s)

```

Salida real de `npm run build` (después del último cambio):

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
dist/assets/index-B2f1AhAV.css   11.69 kB │ gzip:  3.14 kB
dist/assets/index-B97CrLPx.js   285.08 kB │ gzip: 83.83 kB
✓ built in 2.30s

PWA v0.21.2
mode      generateSW
precache  8 entries (291.04 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

Prueba temporal del formulario con jsdom y Testing Library (dependencias instaladas con --no-save y sin modificar package-lock; test temporal retirado según el flujo existente):

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

 RUN  v2.1.9 /workspace/scratch/bd38b2a8d3a3/Ruta-

 ✓ src/lib/__tests__/guidedUI.test.jsx (3 tests) 802ms
   ✓ UI temporal turno guiado > abrir/cerrar sin tocar no crea turno; cambio de carro y rueda accesible 338ms
   ✓ UI temporal turno guiado > dos bloques, reapertura conserva pago y horas, guarda una sola jornada y permite editarla 325ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  23:16:26
   Duration  2.02s (transform 118ms, setup 0ms, collect 305ms, tests 802ms, environment 565ms, prepare 128ms)

```

Esta prueba cubrió apertura sin falso borrador, selección de carro, rueda por teclado, dos bloques, recuperación del pago tras reabrir, una sola jornada guardada, edición y vuelta al bloque anterior. Posteriormente se evitó recuperar un borrador vacío y se conservaron los botones Ahora para limpieza. El build final incluye estos ajustes; el flujo táctil requiere validación en el iPhone.

## Problemas encontrados

- El formulario guardaba `pago` en el borrador pero al recuperarlo solo leía `pagoBase`: corregido para conservar el pago.
- El odómetro precargado generaba un turno en curso sin intervención: corregido con una marca de edición compatible con borradores antiguos. Un borrador vacío tampoco conserva una fecha o precarga antigua al abrir otra vez.
- Vite falló al iniciar con --host 0.0.0.0 por uv_interface_addresses del entorno. Funciona con --host 127.0.0.1.
- No fue posible verificar apariencia ni gesto real en un navegador: Playwright no tenía Chromium y su descarga devolvió un ZIP incompleto. jsdom verifica estado del formulario, no física de desplazamiento ni Safari. Pendiente prueba táctil, encaje, tamaños y actualización PWA en iPhone.
- Git por HTTPS no tiene credenciales de escritura en este entorno; entrega de rama/PR mediante la conexión de GitHub.
- npm imprimió advertencias sobre http-proxy y dependencias heredadas. No se cambiaron dependencias permanentes ni se ocultaron advertencias.

## Pendiente para publicar

Revisión y OK de Rey para fusionar. Después: workflow Pages verde, abrir el icono existente de Ruta y Actualizar; no borrar el icono. Probar primero con valores sintéticos y conservar un respaldo JSON del dispositivo. Icono original y voz quedan pendientes por separado.
