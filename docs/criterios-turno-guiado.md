# Criterios previos — turno guiado

- Conservar theme, claves y registros anteriores; sin nuevas dependencias permanentes.
- Seis ruedas 0–9 independientes, ajuste por gesto con encaje, teclado accesible y alternativa Escribir. Sin acarreo. Cada vehículo precarga su último odómetro.
- Una acción principal registra salida, inicio, fin y llegada; tiempos editables. No sobrescribir etapas completadas al repetir toques.
- Una jornada de una plataforma y vehículo contiene bloques opcionales con inicio, fin, pago y propina. Se guarda un registro agregado: millas y tiempo puerta a puerta una vez, horas de bloque sumadas, dinero sumado. No se asignan a cada bloque costos o tiempo de viaje artificiales. Para cambiar de plataforma se termina la jornada actual. Compatible con registros antiguos sin bloques.
- Tras terminar un bloque se puede añadir otro o registrar llegada. Rechazar bloques incompletos, solapados, fuera de la jornada, pagos inválidos y duración >=24 horas. Admitir cruce de medianoche <24 horas.
- Persistir bloques y campos del turno bajo la misma clave de borrador. Abrir/cerrar sin cambios no crea borrador por el odómetro precargado; conservar borradores anteriores.
- La tarjeta y edición muestran y conservan los bloques. Respaldo JSON conserva el array opcional dentro de rutas.
- Insignia textual azul Flex provisional; icono oficial pendiente de archivo de Rey. Sin voz.
- Verificar tests existentes y nuevos de lógica/compatibilidad, build y UI móvil si el entorno lo permite. Informar salidas reales y limitaciones.
- Commits atómicos, PR revisable; no merge ni publicación sin OK de Rey. No tocar rama antigua.
