# Criterios previos — Ganancia por hora y millas de Lyft (24-nov-2026)

Rey (voz): ver qué días y horas le rinden más en Flex y Lyft; que las millas
de Lyft de la captura se le den a Lyft y el resto del odómetro a Flex.
La captura de Lyft trae «Kilómetros reservados / manejados durante el tiempo
reservado: 86,79 mi» (en millas, y el tiempo reservado incluye ir a recoger).

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Por hora: un bloque de Flex el martes 8:00–11:00 de $90 (3 h, sin millas)
   da Martes · Flex $30/h y Mañana · Flex $30/h.
2. Un bloque 10:00–14:00 de $100 (4 h) se reparte por minutos: 2 h y $50 en
   la mañana (6–12) y 2 h y $50 en la tarde (12–17).
3. El $/h es después de gasolina (la pagada, repartida por millas): con $20
   de gasolina de ese bloque, $90 en 3 h → $23.33/h.
4. Se usan las últimas 8 semanas hasta el periodo que se ve; con menos de
   1 h en una casilla se muestra «—».
5. Millas de Lyft: leer «86,79 mi» de la captura (diaria o semanal con un
   solo día de Lyft esa semana). Día con 120 mi de odómetro, un bloque de
   Flex y Lyft con 86.79 mi → Lyft 86.79, Flex 33.21. Si Lyft pasa del
   odómetro del día, Lyft se queda con todo y Flex con 0.
6. Si la captura semanal tiene más de un día de Lyft, sus millas NO se
   asignan a un día (igual que las horas).
7. Tests y build en verde; comprobado en el navegador.

Peajes: el lector de CSV ya existe (Gastos > Peajes); se completa con los
estados de cuenta reales de SunPass y E-PASS (pendiente de Rey).
