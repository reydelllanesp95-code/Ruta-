# Criterios previos — Barra de meta semanal (deuda + inversión) (24-nov-2026)

Especificación de Rey. Decisiones tomadas con él antes de programar:
- Semana lunes→domingo en TODA la app (antes sábado→viernes): el pago le
  llega el martes, así que la semana cierra el domingo, el lunes ve el
  resumen y el martes mueve el dinero. Barra y Resumen siempre coinciden.
- La gasolina que resta la barra es la PAGADA (llenados con $), no la
  estimada por millas. El mantenimiento y las comidas, los apuntados.
  (El Neto de Resumen sigue con la gasolina estimada; la barra lo dice.)

Neta de la meta = reparto (Flex, Spark, Lyft, Otro) − gasolina pagada −
mantenimiento pagado − comidas, de lunes a domingo.

Criterios (tests escritos ANTES de implementar; no se tocan tras ver
resultados):

1. Ganancias $800 y gastos $150 → neta $650 → tramo 2; el texto dice
   «Te faltan $50 para invertir».
2. Neta exactamente $700 → tramo 3.
3. El lunes la barra vuelve a $0 y la semana anterior queda en el historial.
4. Cambiar un umbral recalcula la barra (función pura con los umbrales; en la
   app, sin recargar).
5. Una propina pendiente no cuenta hasta registrarse; se muestran aparte
   cuántas hay «por llegar».

Además: tramos y colores 1 rojo <250, 2 amarillo 250–700, 3 verde ≥700,
4 dorado ≥900; textos de la especificación; inversión 95 % largo plazo /
5 % trading; umbrales en Ajustes; barra compacta en Hoy y grande en Resumen
con historial de 8 semanas; tarjeta «Semana pasada» con «Hecho» (solo
registro). No se sube la versión del esquema: los campos nuevos son
opcionales y los datos viejos se leen igual (ver informe).
