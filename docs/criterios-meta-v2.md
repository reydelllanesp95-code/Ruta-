# Criterios previos — Meta semanal v2 (24-nov-2026)

Sustituye los umbrales de la meta v1 ($250/$700/$900). Fuente: el documento de
Rey «Actualiza la meta semanal de RUTA». Se fijan ANTES de programar; no se
tocan tras ver resultados.

## Criterios de aceptación (tests)

1. Fondo < $500, neta $500 → «Te faltan $260 para cubrir la deuda de la semana».
2. Neta exactamente $860 → inversión desbloqueada.
3. Neta $1,000 en fase 1 → consejo: $100 extra a la tarjeta de mayor APR.
4. Fondo en $500 y neta $760 → deuda cubierta, sin tramo de colchón.
5. Fondo en $420 → los primeros $80 van al fondo.
6. Cada hito avisa una sola vez por semana.
7. Semana floja + mes por delante del ritmo → mensaje de compensación.
8. El lunes la barra semanal vuelve a $0 y la semana anterior pasa al historial.
9. Cambiar un umbral en Ajustes recalcula sin recargar (se comprueba en el navegador).

## Suposiciones (decididas por Claude, declaradas a Rey)

- Neta = reparto − gasolina pagada − mantenimiento pagado − comidas − **peajes**
  (Rey pidió los peajes el 24-nov; el documento no los nombra).
- Fondo colchón: empieza a contar la semana del 23-nov-2026 con saldo inicial
  editable (por defecto $0), para que las semanas viejas no lo llenen solas.
- Si el fondo está casi lleno (p. ej. $450), el tramo de colchón es lo que falta
  ($50) y la deuda sube lo mismo: los hitos siguen en $760 / $860 / $900.
- Un uso del fondo cuenta desde su fecha: si baja de $500, el colchón vuelve esa
  misma semana.
- Lo que pase de $760 sin llegar a $860 no se invierte (inversión no
  desbloqueada): queda «sin asignar», salvo que aplique la compensación del mes.
- Plan de 5 meses: deuda total inicial de las tarjetas ÷ semanas del plan desde
  el inicio (editable, por defecto 23-nov-2026). Semanas por delante/detrás =
  (pagado con «Pagué» − lo que tocaba a hoy) ÷ pago semanal del plan.
- Fase 1 mientras quede saldo en alguna tarjeta de fase 1. Sin tarjetas
  apuntadas, el consejo dice «la tarjeta con mayor interés».
- Discover: meta = 3 semanas antes del fin de la promo.
- Compensación: se evalúa con la semana cerrada (tarjeta «Semana pasada") y el
  ritmo del mes al final de esa semana.
- Avisos: notificación del sistema solo con la app abierta y permiso dado
  (en iPhone, solo con RUTA instalada en la pantalla de inicio).
