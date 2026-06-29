// Orquestador de parsers. [Aud 10]
//
// parseRoutes(texto, nombreArchivo) detecta automáticamente el proveedor
// recorriendo un registro de parsers. Cada parser expone:
//   - detectar(headersNormalizados) -> boolean
//   - parse(filas, nombreArchivo)   -> rutasPreview[]
// Para agregar Amazon/FedEx/Veho luego, basta con crear el parser y añadirlo
// al registro PARSERS, sin tocar la UI ni el orquestador.

import { parseCSV, normalizeHeader, dropEmptyRows } from "./csv.js";
import ontrac from "./parsers/ontrac.js";
import manual from "./parsers/manual.js";

export const PARSERS = [ontrac, manual];

// Punto de entrada: detecta el formato y delega en el parser correcto. [Aud 18]
export function parseRoutes(text, filename = "") {
  const rows = dropEmptyRows(parseCSV(text));
  if (rows.length === 0) {
    throw new Error("El archivo está vacío o no tiene filas válidas.");
  }
  if (rows.length < 2) {
    throw new Error("El archivo solo tiene encabezado, no hay datos para importar.");
  }
  const normHeader = rows[0].map(normalizeHeader);
  for (const parser of PARSERS) {
    if (parser.detectar(normHeader)) {
      return parser.parse(rows, filename);
    }
  }
  throw new Error(
    "No reconozco el formato del archivo. Debe ser un CSV de OnTrac (columnas Barcode y Address) o la plantilla manual (fecha, parada, direccion, paquetes)."
  );
}

export { parseCSV, normalizeHeader } from "./csv.js";
