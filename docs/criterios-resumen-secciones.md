# Resumen dividido en secciones + página de Deuda con avance

Escritos ANTES de implementar (26-nov-2026). No se cambian tras ver resultados.

## Pedido de Rey
- Resumen tiene demasiado junto: dividirlo sin perder nada y con menos scroll.
- La deuda en su propia parte, con una barra que se llene con lo que ha bajado.
- En cada tarjeta, cuánto bajó o subió respecto al mes pasado.

## Criterios
1. **Secciones**: Resumen tiene arriba cuatro botones: Meta, Dinero, Deuda y
   Rendimiento. Se abre en **Meta**. Solo se ve una sección a la vez.
2. **Nada se pierde** (cada tarjeta que había sigue existiendo en una sección):
   - Meta: meta de la semana (con su detalle por día y la línea de la neta),
     cierre de la semana pasada y meta del mes.
   - Dinero: neto (ganado − deducciones), tu día en orden (vista Día), editar
     horas de la jornada, deducciones y comparación con los últimos periodos.
   - Deuda: deuda y fondo colchón.
   - Rendimiento: «¿cuándo te rinde más?» y «por app».
   El selector de periodo (Día/Semana/Mes/Año y ‹ ›) se ve en Meta, Dinero y
   Rendimiento; en Deuda no, porque la deuda no depende del periodo.
   En Meta con Día o Año, un aviso dice que la meta es por semana o mes, con un
   botón para ver la semana.
3. **Barra de la deuda**: arriba, en grande, cuánto has bajado del total y el
   %; la barra se llena al abrir (sin animación con «Reducir movimiento»).
4. **Cambio por tarjeta** (función pura con test): para cada tarjeta, su saldo
   del último cierre contra el último cierre de un mes ANTERIOR.
   - 31 oct $1,000 → 30 nov $880: «−$120 vs octubre», en verde.
   - Si subió: «+$40 vs octubre», en rojo. Sin cambio: «igual que octubre».
   - Un saldo apuntado a mitad de mes no cuenta como «mes pasado»: se compara
     con el cierre de un mes anterior al del último saldo.
   - Con un solo mes de saldos: «sin mes anterior todavía».
5. Ningún cálculo de dinero, meta o deuda cambia (tests previos en verde).
6. `npm test` en verde, `npm run build` OK, capturas en iPhone simulado de las
   cuatro secciones con datos de ejemplo.
