# Criterios previos — Gasolina pagada en todo RUTA + peajes en la barra (24-nov-2026)

Rey: el precio del galón cambia cada día y el MPG nunca es el mismo, así que
la gasolina estimada no vale. Todo RUTA usa la gasolina que de verdad paga
(llenados con $), sin distinguir la de casa. Los peajes también restan en la
barra de la meta.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Semana/mes/año: la gasolina restada = lo pagado en ese rango, repartido
   por semanas lunes→domingo.
2. Día (y cada turno): la gasolina pagada de su semana se reparte según las
   millas trabajadas: semana con $100 pagados, 60 mi el lunes y 40 mi el
   martes → lunes $60, martes $40; la suma de los días = la semana.
3. Semana sin millas apuntadas: su gasolina se reparte por días (1/7 cada
   uno), así una semana entera sigue restando todo lo pagado.
4. La barra de la meta resta también los peajes: $800 − $150 de gastos −
   $20 de peajes = $630.
5. El MPG y el precio del galón dejan de usarse: salen de Ajustes.
6. Tests y build en verde; con el respaldo de Rey, la semana 16–22 nov resta
   exactamente la gasolina pagada esa semana ($113.91).
