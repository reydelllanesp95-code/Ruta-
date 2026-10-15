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
