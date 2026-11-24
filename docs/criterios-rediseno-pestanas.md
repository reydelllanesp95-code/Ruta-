# Criterios previos — Rediseño en pestañas (24-nov-2026)

Rey aprobó el boceto (Hoy, Resumen, Turnos, Día, Gastos, Más) y lo quiere
para usarlo desde su primera orden de hoy. Nada de lo guardado se migra ni se
pierde: es otra forma de mostrar lo mismo.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Barra inferior con 5 pestañas: Hoy, Resumen, Turnos, Gastos, Más. Códigos
   se abre desde Más (con «‹ Más» para volver). Ninguna pantalla obliga a
   bajar para lo diario: en Hoy están Salgo/Llegué y Elegir capturas.
2. Hoy: aviso de bloques de Flex de los últimos 3 días con propina $0 (con
   botón a las capturas), meta semanal (barra; meta en Ajustes, por defecto
   sin meta = no se muestra) y lo ganado/horas/millas de hoy.
3. Resumen: Semana / Mes / Año con ‹ ›. Arriba Ganado − Deducciones = Neto.
   Deducciones = gasolina estimada + mantenimiento estimado + comida + peajes
   del periodo. Neto/hora, horas, millas; comparación con el periodo anterior
   (ganado, neto, neto/hora, horas, millas) y barras del neto de los últimos
   4 periodos; reparto por app.
4. Prueba con el respaldo de Rey + capturas 17–22 aplicadas: la semana de pago
   21–27 nov y el mes de noviembre dan el mismo Ganado que la suma directa de
   los registros de reparto; Neto = Ganado − (gas + mant + comida + peajes)
   al centavo.
5. Turnos: por semana de pago y por día; tocar un día abre la pantalla del día:
   ganado, deducciones, neto, neto/hora, jornada (salí/llegué/odómetro), cada
   registro con su detalle, total por app y gasolina pagada ese día. Se puede
   editar o borrar cada turno como antes.
6. Gastos: Gasolina / Mantenimiento / Comida / Peajes, con total de la semana
   y del mes arriba; los paneles de siempre debajo.
7. Más: resumen del año (ingresos por app, millas, gastos apuntados) con
   descarga CSV; Ajustes (incluye meta semanal), MPG en uso, Limpiezas,
   Códigos, importar CSV/plantilla, Respaldo (exportar/importar).
8. Tests y build en verde; en navegador iPhone con el respaldo de Rey se
   recorren las 5 pestañas y el día sin errores de JS.
