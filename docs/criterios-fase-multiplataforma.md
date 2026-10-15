# Fase: multiplataforma (Amazon Flex + Spark Driver)

Criterios de éxito escritos ANTES de implementar. No se cambian después de ver resultados.

## Alcance
- Plataformas: OnTrac (archivada, solo historial), Amazon Flex, Spark Driver, Otro.
- Registro manual de turnos (sin CSV): plataforma, fecha, hora inicio, hora fin, millas, pago, propina, nota.
- Fuera de alcance: propinas pendientes de Spark, calculadora de ofertas, impuestos/CSV contable.

## Criterios
1. **Datos viejos intactos**: rutas OnTrac guardadas antes (sin campo `plataforma`) se cargan sin migración, se cuentan como OnTrac y sus totales (bruto, neto, millas, paquetes) no cambian. Test automatizado con rutas en el formato actual.
2. **Sin cambio de esquema**: `SCHEMA_VERSION` sigue en 1; los campos nuevos son opcionales. Un respaldo exportado antes se restaura igual.
3. **Turno manual**: se puede crear un turno de Flex o Spark; `ganancia = pago + propina`; la validación rechaza texto, negativos, plataforma inválida y pago vacío.
4. **Horas**: `horas` se calcula de inicio/fin; si fin < inicio se asume que cruza medianoche; sin horas → `null` (no 0).
5. **$/hora neto**: se calcula solo con registros que tienen horas (neto de esos registros / sus horas). Si no hay horas, se muestra "—", nunca $0 ni NaN.
6. **Propinas**: total de propinas por semana/mes/total visible.
7. **Por plataforma**: totales (bruto, neto, horas, $/hora) separados por plataforma.
8. **Importar CSV de OnTrac sigue funcionando** (tests existentes en verde).
9. **Verificación**: `npm test` en verde (75 tests previos + nuevos), `npm run build` sin errores, y revisión visual de la pantalla con datos de ejemplo.
10. **Producción**: no se fusiona a `main` (eso publica en GitHub Pages) sin confirmación explícita de Rey.

---

# Fase B: vehículos, odómetro, peajes e importación de turnos

Escritos antes de implementar (15-oct-2026). No se cambian tras ver resultados.

## B1. Vehículos (Kia Sorento + Hyundai Tucson)
1. Cada registro (turno, ruta, llenado, mantenimiento) pertenece a un vehículo; si no tiene campo `vehiculo` (datos viejos) es el Kia. Sin migración ni cambio de `SCHEMA_VERSION`.
2. Cada vehículo tiene su MPG asumido y su mantenimiento $/milla; el MPG real se calcula SOLO con los llenados de ese vehículo.
3. Un llenado del Tucson con odómetro menor que el último del Kia se acepta (la validación compara solo con el mismo vehículo).
4. El costo (gas + mantenimiento) de cada turno usa el vehículo de ese turno. Test: mismo turno en Kia y en Tucson da costos distintos y correctos a mano.
5. Los totales de las rutas OnTrac viejas no cambian (mismo test de la Fase 1 sigue en verde).
6. El costo/milla histórico de mantenimiento se calcula por vehículo (nunca mezcla odómetros de dos carros).

## B2. Odómetro en el turno
7. Odómetro inicio/fin opcional; si están los dos y fin > inicio, millas = fin − inicio. Fin ≤ inicio → error claro.

## B3. Peajes (SunPass / E-PASS)
8. Se puede añadir un peaje a mano (fecha, monto, agencia, lugar) y se resta del neto de la semana y del mes, igual que la comida.
9. Importar CSV de peajes: detecta columnas de fecha y monto por nombres comunes; filas sin fecha o monto válido se omiten y se informa cuántas; montos negativos (pagos/recargas) no se cuentan como peaje. Duplicados (misma fecha, hora, monto y lugar) no se importan dos veces.
10. Marcado como NO VERIFICADO contra un archivo real de SunPass/E-PASS hasta que Rey suba uno.

## B4. Importar turnos desde CSV
11. Plantilla descargable `plataforma,fecha,inicio,fin,pago,propina,millas,vehiculo,nota`. Cada fila válida crea un turno; filas inválidas se omiten con su número de fila y motivo. (Permite el flujo foto → Claude → CSV.)

## Verificación
12. `npm test` en verde (92 previos + nuevos), `npm run build` OK, prueba de pantalla simulada (jsdom, temporal) del flujo de vehículo y peaje.
13. No se publica en `main` sin OK explícito de Rey.

---

# Fase C: salida y llegada a casa (horas reales puerta a puerta)

Escritos antes de implementar (15-oct-2026). No se cambian tras ver resultados.

1. El turno admite, opcionales, hora de **salida de casa** y de **llegada a casa** (HH:MM). Las dos o ninguna; una sola → error claro.
2. `horasReales` = de salida a llegada (si llegada < salida, cruza medianoche). Si el turno también tiene horas de bloque, las horas reales deben ser ≥ las del bloque; si no → error claro.
3. El **neto/hora** usa las horas reales cuando existen; si no, las del bloque. Turnos guardados antes (sin estos campos) dan exactamente el mismo neto/hora que antes (test).
4. La tarjeta del turno muestra salida → bloque → llegada, las horas reales y las del bloque. Las tarjetas de semana/mes muestran las horas reales.
5. Importar CSV: columnas opcionales `salida,llegada`; un CSV con la plantilla anterior (sin ellas) sigue importando igual (test).
6. `npm test` en verde (114 previos + nuevos) y `npm run build` OK.

---

# Fase D: turno en curso que no se pierde

Problema real (15-oct-2026): al minimizar la app un rato, el iPhone la cierra y el formulario del turno vuelve vacío; Rey tuvo que meter los datos varias veces.

Escritos antes de implementar. No se cambian tras ver resultados.

1. Lo que se escribe en un turno NUEVO se guarda en el teléfono a cada cambio (borrador). Si la app se cierra y se vuelve a abrir, el formulario aparece abierto con todo lo escrito (test con almacenamiento simulado: escribir → desmontar → montar de nuevo → los datos siguen).
2. Botón **"Ahora"** junto a cada hora (salí de casa, inicio, fin, llegué a casa) que pone la hora actual con un toque.
3. Al guardar el turno, el borrador se borra. Cancelar NO lo borra (se puede retomar); hay un botón explícito "Descartar borrador" que pide confirmación.
4. Editar un turno ya guardado no toca el borrador.
5. Si el almacenamiento falla o el borrador está corrupto, la app no se rompe: arranca con el formulario vacío.
6. `npm test` en verde (123 previos + nuevos) y `npm run build` OK.
