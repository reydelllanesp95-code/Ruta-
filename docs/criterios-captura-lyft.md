# Criterios previos — Pegar captura de Lyft (23-nov-2026)

Rey manda «Actividad diaria» de Lyft (viajes del día con importe, propina,
bono y hora) y «Estadísticas de manejo» (tiempo conectado de la semana). Lo
rechazado no importa. Quiere lo más rápido posible.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Del texto del dom 22 nov saca un día: total $89.27 = suma de viajes
   (incluye los $2.00 de un pasajero cancelado; los $0.00 no cuentan),
   propinas $8.90, 9 viajes con importe, primer viaje 06:38, último 17:32.
2. Si la suma de viajes no da el total del día, error y ningún cambio.
3. Se guarda UN registro de Lyft por día: pago = total − propinas ($80.37),
   propina $8.90, horas de primer a último viaje; nota con nº de viajes.
4. Si el texto pegado trae «Tiempo conectado» y es de un solo día, las horas
   del día son ese tiempo (6 h 46 min = 6.77 h), para no inflar las horas
   con los ratos en que hacía Flex.
5. Si ya hay un registro de Lyft ese día, se actualiza (pago, propina, horas)
   en vez de duplicar; no se tocan millas, odómetro, vehículo ni casa. Pegar
   dos veces = 0 cambios.
6. Un solo botón «Pegar captura» reconoce si el texto es de Flex o de Lyft.
   Lo de Flex sigue pasando sus tests.
7. `npm test` y `npm run build` en verde; probado en navegador iPhone con el
   respaldo de Rey: tras pegar Flex + Lyft, el 22 nov queda Flex $160 y Lyft
   $89.27 (antes Flex tenía $14.74 de Lyft dentro).

SIN MEDIR hasta tener el texto real que copia el iPhone de Lyft: los tests usan
el texto transcrito de la captura, en dos órdenes.

Cambio pedido por Rey (23-nov, antes de publicar): las horas de Lyft son el
«Tiempo reservado» (llevando pasajeros), no el «Tiempo conectado», porque usa
Lyft conectado para volver a casa. El criterio 4 pasa a decir «Tiempo
reservado» (4 h 6 min = 4.1 h el 22 nov); el conectado solo si no hay
reservado. Lo decidió él; no es un ajuste de la vara tras ver resultados.
