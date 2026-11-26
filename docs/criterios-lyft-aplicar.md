# Lyft: «Aplicar cambios» no hacía nada

Escritos ANTES de corregir (25-nov-2026). No se cambian tras ver resultados.

## Causa reproducida
Un día nuevo de Lyft con un solo viaje (o primer y último viaje a la misma
hora) da hora de inicio = hora de fin. Al guardar, `makeShift` lanza «Las horas
no son válidas.» y el botón no muestra el error: parece que no pasa nada.

## Criterios
1. Un día nuevo de Lyft con hora de inicio = fin (o solo una de las dos) se
   guarda igual, sin horario, con su pago y propina (test).
2. Si aplicar una captura falla por cualquier otro motivo, la pantalla muestra
   el error en rojo en vez de quedarse quieta.
3. Los días de Lyft con horas válidas se guardan igual que antes (tests previos
   en verde).
4. `npm test` en verde, `npm run build` OK.
