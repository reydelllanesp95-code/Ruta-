# Cómo enviarle rutas a la app

La app calcula tus ganancias así: **cada paquete = $1.70** (puedes cambiar la
tarifa al importar). Las **paradas** son las direcciones distintas a las que
fuiste. Las **millas** las escribes tú al importar.

Hay dos maneras de meter una ruta:

## 1. Lo normal: el CSV oficial de OnTrac (recomendado)

No tienes que copiar nada. Exporta el manifest desde OnTrac (el archivo que se
ve como `OnTrac OnRoute_XXXX_manifest_2026-06-27.csv`) y súbelo en la pestaña
**Ganancias → Importar ruta**.

- En ese archivo **cada fila es un paquete**.
- La app agrupa por la columna **Address** para contar las **paradas**.
- La **fecha** la saca del archivo automáticamente.

Ejemplo incluido: `ontrac-ejemplo.csv` → 98 paquetes, 94 paradas, $166.60.

## 2. A mano: la plantilla manual (respaldo)

Si algún día no tienes el archivo de OnTrac, usa `ruta-plantilla.csv`. Una
**fila por parada**, con estas columnas:

| columna     | qué poner                                   |
|-------------|---------------------------------------------|
| `fecha`     | AAAA-MM-DD (ej. 2026-06-28)                 |
| `parada`    | nombre del lugar (opcional)                 |
| `direccion` | dirección (opcional)                        |
| `paquetes`  | cuántos paquetes dejaste ahí (si lo dejas vacío, cuenta 1) |

Ejemplo incluido: `ruta-ejemplo.csv` → 3 paradas, 6 paquetes, $10.20.

## Notas

- Puedes tener **varias rutas el mismo día**.
- Si subes el mismo archivo dos veces, la app te avisa y te deja
  **Reemplazar / Duplicar / Cancelar**.
- En **Ganancias** puedes exportar un **respaldo JSON** (para no perder nada si
  cambias de teléfono) y volver a importarlo.
