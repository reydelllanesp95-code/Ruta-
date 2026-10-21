# Criterios previos — corregir horas marcadas tarde

Problema (reproducido 21-oct-2026): si Rey olvida marcar y marca tarde, al corregir
la hora del bloque el guardado falla con "El bloque 1 se solapa o queda fuera de la
jornada", sin decir qué hora corregir. El enlace "Corregir horas" es pequeño y oculta
los campos.

- Turno nuevo: las cuatro horas (salí, inicio, fin, llegué) se pueden cambiar
  directamente en "Horas registradas", sin pulsar un enlace previo.
- El botón principal sigue guardando la hora actual con un toque; una hora corregida
  no se sobrescribe al seguir avanzando.
- Si un bloque empieza antes de la salida de casa, el error dice qué hora
  corregir (nombra "Salí de casa" y las dos horas). Igual si termina después de
  "Llegué a casa", y si dos bloques se solapan.
- Una corrección coherente (salida, inicio, fin y llegada en orden) se guarda.
- Las correcciones sobreviven a cerrar y reabrir la app (borrador).
- Editar un turno ya guardado sigue permitiendo cambiar sus horas.
- Sin dependencias nuevas; tests existentes en verde; tests nuevos para los mensajes;
  build OK; prueba en navegador con viewport de iPhone.
