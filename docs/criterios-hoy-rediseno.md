# Rediseño de Hoy + fuera el amarillo

Escritos ANTES de implementar (26-nov-2026). No se cambian tras ver resultados.
Rey aprobó el boceto (lo de hoy arriba, meta, una tarjeta de acciones,
pendientes juntos) y pidió además: sin amarillo en toda la app, números que
suban contando y la tarjeta de hoy en vivo mientras trabaja.

## Criterios
1. **Sin amarillo**: ningún color amarillo/ámbar en la app (#F0A33B, #E7C15A,
   #F7C77A, #E4C489, #5A4720, #3A2E14, #1A1305). Deuda → morado, extra a deuda
   → morado claro, avisos → coral, Spark → turquesa. Comprobado con búsqueda en
   el código (0 resultados) y con captura.
2. **Hoy llevas** (función pura con test): con UPS $123.51 (5.25 h) + Lyft
   $9.08 el mismo día → total $132.59, horas 5.25, y por app «UPS $123.51 ·
   Lyft $9.08» ordenado de mayor a menor. Sin nada hoy → $0 y «Aún no has
   apuntado nada hoy».
3. **En vivo**: con la jornada abierta, la tarjeta dice «Trabajando» y un reloj
   con el tiempo desde que saliste menos pausas, que se actualiza solo (cada
   30 s). Con «Paré» se queda quieto y dice «En pausa». Test: salida 08:00,
   ahora 10:14 → «2 h 14 min».
4. **Números que suben contando**: el total de hoy y lo de la meta suben de su
   valor anterior al nuevo en < 1 s; con «Reducir movimiento» salen directos.
5. **Orden de Hoy**: lo de hoy → meta de la semana → una tarjeta con
   «Salgo a trabajar» (o pausa/llegué) y «Subir capturas» (con el aviso de
   propinas dentro, sin tarjeta amarilla aparte) → Pendientes (cierres de
   tarjeta y semana pasada en una lista; tocar una fila abre lo de siempre).
   Sin pendientes, esa tarjeta no sale.
6. Nada se pierde: odómetro, pausas, editar horas, subir capturas, apuntar
   saldo de cierre y «Hecho» de la semana pasada siguen funcionando.
7. `npm test` en verde, `npm run build` OK, capturas en iPhone simulado de Hoy
   sin trabajar, trabajando y con pendientes.
