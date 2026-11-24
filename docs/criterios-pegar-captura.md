# Criterios previos — Pegar captura de ganancias (Flex) + Lyft (23-nov-2026)

Problema: Rey no anota nada en vivo en días largos y la propina de Flex llega
~27 h después. Comparando su respaldo con las capturas de Flex del 17–22 nov,
RUTA tenía $615 de Flex frente a $935.55 reales ($267.05 de propinas sin
apuntar, un bloque sin apuntar, un ajuste de $10 y 50¢ de base). Decisión de
Rey: leer el texto que copia el iPhone de la captura (gratis, sin API) y que
RUTA rellene sola, con revisión antes de guardar. Lyft como plataforma aparte.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Lector Flex: del texto de las dos capturas del 17–22 nov saca 15 bloques +
   1 ajuste manual con fecha, horas (24 h), base y propina exactas, y suma
   $935.55 (base 597.50, propinas 328.05, ajuste 10). Ignora «Pago enviado».
2. Da el mismo resultado si el texto llega por filas o con las columnas
   separadas (primero fechas/horas, luego importes), y con variantes
   «p.m.» / «p. m.» / «PM» y «Consejos»/«Propina(s)»/«Tips».
3. Si no puede emparejar fechas con importes, o un total no es base+propina,
   NO adivina: da un error que lo dice y no propone cambios.
4. Año: el de la fecha de hoy; si el mes queda en el futuro, el año anterior.
5. Plan contra el respaldo real de Rey (17–22 nov): actualiza cada turno
   existente cuyo horario se solapa con un bloque (el turno del mié 18
   13:54–17:55 recibe dos bloques: base 89, propina 71.05); crea el bloque que
   falta (dom 22 14:00–16:00, $43 + $37) y el ajuste ($10); tras aplicarlo,
   RUTA suma de Flex 17–22 exactamente $935.55. Nunca borra registros ni toca
   millas, odómetro, horas de casa, vehículo ni notas.
6. Aplicar el mismo texto dos veces no cambia nada la segunda vez (0 cambios).
7. Nada se guarda sin que Rey vea la lista de cambios (antes → después) y toque
   «Aplicar». El total leído aparece para compararlo con el de Flex.
8. Lyft existe como plataforma (turno manual, CSV y respaldo). Su lector queda
   pendiente de una captura real; no se inventa su formato.
9. «Exportar respaldo» se puede encontrar sin bajar al final de la lista.
10. Tests existentes + nuevos, `npm test` y `npm run build` en verde; probado en
    navegador con viewport de iPhone con el respaldo de Rey cargado.

SIN MEDIR hasta tener el texto real que copia el iPhone: el formato exacto del
texto (los tests usan el texto leído de las capturas en los dos órdenes).

Nota posterior (23-nov, tras ver resultados; el criterio original no se toca):
el criterio 1 contaba «15 bloques + 1 ajuste». Las capturas tienen 14 bloques
con horario + 1 ajuste de $10. Rey aclara que ese ajuste es el pago de un
bloque que tuvo un error, así que son 15 trabajos en total. Lo que se mide
(importes y total $935.55) cuadra al centavo.
