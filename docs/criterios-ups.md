# UPS: trabajo por hora + por milla, con impuestos retenidos

Escritos ANTES de implementar (25-nov-2026). No se cambian tras ver resultados.

## Decisiones de Rey
- UPS paga por hora ($23) y por milla ($0.70). UPS sí retiene impuestos.
- RUTA debe mostrar lo de UPS ya sin los taxes (lo que de verdad le llega).
- La retención va SOLO sobre las horas; las millas son reembolso y no pagan taxes.
- Retención inicial 18 % (Florida: sin impuesto estatal; federal + FICA 7.65 %),
  ajustable con el primer cheque real.

## Criterios
1. **UPS como plataforma**: se puede elegir «UPS» al añadir un turno a mano. Las plataformas existentes y sus datos no cambian (los 244 tests previos siguen en verde).
2. **Cálculo** (test con el caso real del 25-nov: 13:00–18:15, 35 mi, $23/h, $0.70/mi, 18 %):
   - horas pagadas = 5.25; bruto horas = $120.75; retenido = $21.74 (redondeado al centavo); reembolso millas = $24.50.
   - lo que recibe (`ganancia`) = 120.75 − 21.74 + 24.50 = **$123.51** (±$0.01 por redondeo).
   - `propina` = 0. La retención no toca las millas.
3. **Sin pago a mano**: en UPS el formulario no pide pago ni propina; pide inicio, fin y millas, y muestra antes de guardar: bruto, retención, millas y lo que queda.
4. **Tarifas congeladas**: cada turno UPS guarda las tarifas y el % con que se calculó. Cambiar la configuración después NO cambia turnos ya guardados (test). Editar un turno UPS recalcula con SUS tarifas guardadas.
5. **Configuración**: tarifa/hora, tarifa/milla y % de retención editables (por defecto 23 / 0.70 / 18). Valores inválidos o negativos → error claro; % > 100 → error. Calculadora: con «bruto de horas del cheque» y «impuestos retenidos» calcula el % (retenidos ÷ bruto × 100, a 1 decimal).
6. **Validación**: UPS sin hora de inicio y fin → error claro (son las horas que paga).
7. **Millas propias**: un turno UPS conserva sus millas aunque ese día haya jornada con odómetro; las millas de la jornada se reparten entre los demás trabajos restando las de UPS (como Lyft) (test).
8. **Totales**: lo de UPS entra en ganado, neto, meta y resumen por app como «UPS» con el valor ya sin taxes.
9. **Verificación**: `npm test` en verde (244 previos + nuevos), `npm run build` sin errores, y prueba en pantalla simulada de iPhone del alta de un turno UPS con el caso del 25-nov.
