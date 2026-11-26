# Horas de UPS en el resumen + un solo botón de capturas en Hoy

Escritos ANTES de corregir (26-nov-2026). No se cambian tras ver resultados.

## Causa (a confirmar con test)
En un día con jornada («Salgo a trabajar» → «Llegué»), las horas del día son
solo las de la jornada y se ignoran las de los turnos. UPS es otro trabajo con
sus propias horas pagadas, así que se pierden si la jornada no las cubre.

## Criterios
1. Un día con jornada de 8:00 a 12:00 (4 h) y UPS de 13:00 a 18:15 (5.25 h)
   suma **9.25 h** (test).
2. Si la jornada se solapa con el turno de UPS, esas horas no se cuentan dos
   veces: jornada 8:00–15:00 + UPS 13:00–18:15 = 7 h + 5.25 h − 2 h = **10.25 h**
   (test). Las pausas de la jornada que caen dentro de UPS no se restan dos veces.
3. Un día sin UPS da las mismas horas que antes (tests previos en verde).
4. Hoy: mientras sale el aviso de propinas de Flex con su botón «Subir
   capturas», no sale el otro botón «Elegir capturas» (hacen lo mismo). Sin
   aviso, sigue saliendo «Elegir capturas».
5. `npm test` en verde, `npm run build` OK, captura en iPhone simulado de Hoy
   con y sin aviso.
