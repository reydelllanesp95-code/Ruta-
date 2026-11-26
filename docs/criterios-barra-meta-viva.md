# Barra de la meta semanal: más viva y más clara

Escritos ANTES de implementar (26-nov-2026). No se cambian tras ver resultados.

## Pedido de Rey
- Que se vea que la barra se va llenando.
- Arriba, en grande, la próxima meta y PARA QUÉ es (no solo «faltan $X»).
- Al completar una parte, arriba sale la siguiente.
- Debajo, el significado de cada parte (ya no recuerda qué eran los $900).

## Orden real (sin cambiarlo; es el que ya calcula RUTA)
Colchón $80 → Deuda $680 → Inversión $100 → Extra a deuda $40 = $900.
Lo que pasa de $900 es «de más» y RUTA ya da un consejo de a dónde mandarlo.

## Criterios
1. **Próxima meta** (función pura con test, meta por defecto y fondo vacío):
   - neta $0 → «Faltan $80 para el colchón».
   - neta $50 → «Faltan $30 para el colchón».
   - neta $500 → «Faltan $260 para la deuda de la semana».
   - neta $800 → «Faltan $60 para invertir».
   - neta $880 → «Faltan $20 para el extra a la deuda».
   - neta $950 → meta cumplida y $50 de más.
   Cada caso trae también una frase de para qué es esa parte.
2. **Partes debajo** (vista completa): en el orden real, cada una con su monto
   (no el acumulado), lo que significa y su estado: hecha ✓, «llevas $x de $y»
   o pendiente. Los montos de las partes suman la meta (test). Con el fondo
   colchón lleno, la parte del colchón no aparece (como ahora).
3. La parte de $40 se llama «Extra a deuda», no «Meta».
4. **Animación**: al abrir, la barra se llena desde lo último que viste esa
   semana (o desde $0) hasta lo de ahora en ~1 s; una parte que se completó
   desde la última vez destella. Con «Reducir movimiento» del iPhone no anima.
   Si el teléfono no deja guardar lo último visto, anima desde $0 y no falla.
5. **Sin cambiar cálculos**: neta, tramos y montos idénticos (tests previos de
   meta en verde sin tocarlos).
6. `npm test` en verde, `npm run build` OK, captura en iPhone simulado de Hoy y
   Resumen con datos de ejemplo.
