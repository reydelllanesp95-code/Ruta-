# Criterios previos — Odómetro al salir y al llegar + gasolina solo con el $ (23-nov-2026)

Rey: no quiere apuntar nada durante el trabajo. Eligió odómetro al salir y al
llegar a casa (dos números al día). Los llenados los apunta solo con el $,
porque su mujer también echa gasolina y el MPG por llenados nunca es real.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Una tarjeta arriba en Ganancias: «Salgo» guarda hora, carro y odómetro
   (la rueda arranca en la última lectura conocida de ese carro); después
   «Llegué» guarda hora y odómetro. Si cierra la app entre medias, al abrirla
   sigue esperando la llegada. Rechaza una llegada menor o igual a la salida.
2. Millas del día = llegada − salida. Se reparten entre los trabajos de reparto
   de ese día (Flex, Spark, Lyft, Otro) según sus horas (a partes iguales si no
   hay horas). Las limpiezas y los turnos con su propio odómetro no se tocan.
   La suma repartida = millas del día (al centavo).
3. Es un cálculo al mostrar: no reescribe los turnos guardados. Días sin
   jornada se quedan exactamente como estaban.
4. Los trabajos que llegan después (capturas del día siguiente) reciben sus
   millas sin hacer nada más.
5. El respaldo exporta e importa las jornadas; un respaldo viejo sin jornadas
   se restaura sin error.
6. Gasolina: el llenado nuevo pide solo $, fecha y carro. Los llenados viejos
   no se borran. Si el último llenado de un carro no tiene odómetro, RUTA usa
   el MPG asumido de ese carro (no un MPG «real» viejo).
7. Tests y build en verde; en navegador iPhone con el respaldo de Rey: salida
   160830 y llegada 160901 un día con 2 turnos de 2 h y 1 h → 47.33 y 23.67
   millas.
