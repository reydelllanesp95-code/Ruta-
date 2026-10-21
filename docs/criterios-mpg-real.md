# Criterios previos — MPG real disparatado (Sorento 51.3)

Causa en el código: MPG = promedio de (millas desde el llenado anterior ÷ galones)
por tanque. Un tanque no lleno, un llenado sin apuntar o un odómetro mal escrito
da un valor imposible que entra en el promedio y no se ve en ninguna parte.

- Un tanque con MPG fuera de 8–45 no cuenta para el MPG real. 45 está por encima
  de cualquier Sorento o Tucson, incluido el híbrido.
- El MPG real = millas totales ÷ galones totales de los tanques válidos (no promedio
  de cocientes). Cambio deliberado: el test "promedia 17.5" pasa a 16.7 (500/30).
- Si no queda ningún tanque válido, se usa el MPG asumido de Ajustes.
- La lista de llenados muestra el MPG de cada tanque y marca "revisar" los
  imposibles, con el motivo probable.
- Datos guardados intactos: el MPG se sigue calculando al vuelo, nada se borra ni migra.
- Tests existentes en verde (salvo el cambio declarado arriba), tests nuevos, build OK,
  prueba en navegador con un caso que reproduzca 51.3.
