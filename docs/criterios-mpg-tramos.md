# Criterios previos — MPG por tramos y llenados atrasados (27-oct-2026)

Problema: Rey echa cantidades distintas ($20, $30, $40) sin llenar el tanque.
El MPG tanque a tanque (millas desde el anterior ÷ galones de ahora) le asigna
las millas al llenado equivocado y da valores absurdos (p. ej. 69 mpg).
Además, la app no deja añadir un llenado olvidado con fecha anterior al último.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. Se puede añadir un llenado con fecha anterior al último si su odómetro queda
   entre el del llenado anterior y el siguiente por fecha. Se rechaza, con un
   mensaje que nombra el llenado en conflicto, si contradice el orden por fecha
   o repite un odómetro existente.
2. MPG real = millas ÷ galones de las últimas ≥500 millas de llenados seguidos
   (los galones del llenado inicial del tramo no cuentan). No cruza huecos de
   más de 700 millas entre dos llenados (llenados sin apuntar).
3. Caso sintético de llenados parciales de distinto tamaño alrededor de 22 mpg:
   el MPG real queda entre 20 y 24 (no 60+).
4. Un hueco de más de 700 millas se marca en la lista y no entra al cálculo.
5. Si el resultado cae fuera de 8–45 mpg, se usa el MPG asumido.
6. La lista deja de mostrar mpg por llenado (engaña con parciales) y muestra
   las millas desde el llenado anterior.
7. `npm test` y `npm run build` en verde; en navegador con viewport de iPhone,
   añadir un llenado atrasado funciona y el MPG real se actualiza.
