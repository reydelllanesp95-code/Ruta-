# Criterios previos — Lector de Lyft más tolerante (24-nov-2026)

En el iPhone de Rey la captura de Lyft no entra (en la prueba simulada sí).
Lo que falla es leer viaje por viaje (letra verde, iconos); el total del día
y las propinas se leen bien.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Si el total del día se lee y los viajes leídos suman MENOS (se perdió algún
   viaje al leer), el día entra con el total del día y un aviso naranja de que
   no se pudo comprobar viaje por viaje.
2. Si los viajes suman MÁS que el total, o no hay total, el día no entra
   (aviso), como hasta ahora.
3. Con la lectura OCR real del 22 nov que antes fallaba (viajes $76.46 de
   $89.27), el día entra con $89.27 y propinas $8.90.
4. El lector de fotos prueba una tercera forma de preparar la imagen antes de
   rendirse, y se queda con la lectura sin avisos si alguna la da.
5. Tests y build en verde; las capturas de Flex y Lyft siguen dando $935.55
   y $89.27 en el navegador de prueba.
