# Criterios previos — Plan de deuda por cierres (24-nov-2026)

Rey (voz): no quiere apuntar cada pago. Pone una vez cada tarjeta con su día
de cierre; ese día RUTA le pide el saldo que quedó. Con eso la cuota semanal de
deuda se recalcula: lo que queda ÷ semanas que faltan para terminar el plan de
5 meses. Si va adelantado la cuota baja y lo que sobra va a inversión; si va
atrasado la cuota sube y se le avisa. Se quita el botón «Pagué».

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Cuota = deuda que queda ÷ semanas que faltan. Plan de 5 meses (21.67
   semanas) que empezó con $14,000: en la semana que empieza 10 semanas
   después, con $6,000 de saldo → cuota $514.29; la deuda baja a $514.29, la
   inversión sube a $265.71 ($100 + $165.71) y la meta sigue en $900.
2. Atrasado: mismo caso con $10,000 de saldo → cuota $857.14, la meta sube a
   $1,077.14 y la frase avisa que la cuota subió.
3. Aviso de cierre: tarjeta que cierra el día 15; el 24-nov sin saldo apuntado
   desde el 15-nov → pide «¿cuánto quedó?». Con el saldo apuntado, deja de
   pedir; el 10-dic no pide; el 16-dic vuelve a pedir.
4. Sin ningún saldo apuntado, la meta queda como estaba ($80 / $760 / $860 /
   $900) y los 9 criterios de la meta v2 siguen en verde.
5. Cada semana usa los saldos apuntados ANTES de que empiece: apuntar un saldo
   nuevo no cambia las semanas pasadas.
6. Las tarjetas ya guardadas con saldo (versión de hoy) se convierten: su
   saldo pasa a ser el primer cierre, en la fecha de inicio del plan.
7. Tests y build en verde; comprobado en el navegador.

Suposiciones declaradas: el dinero extra de inversión se reparte en la misma
proporción que los $100 (VOO 40%, SCHD 15%…); el APR es opcional y solo sirve
para el consejo de «tarjeta de mayor interés»; la barra del mes usa la cuota
base.
