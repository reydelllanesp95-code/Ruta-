// Parser de la plantilla manual de respaldo. [Aud 10][Aud 11]
//
// Columnas: fecha, parada, direccion, paquetes. Aquí cada fila = una PARADA.

import { buildColumnMap, findColumn, cell } from "../csv.js";
import { parseDatePart, todayISO } from "../earnings.js";
import { UNKNOWN_ADDRESS } from "../constants.js";

function detectar(normHeader) {
  const hasPaquetes =
    normHeader.includes("paquetes") || normHeader.includes("packages");
  // No debe confundirse con OnTrac (que trae barcode).
  return hasPaquetes && !normHeader.includes("barcode");
}

function parse(rows, filename = "") {
  const header = rows[0];
  const colMap = buildColumnMap(header);

  const idxFecha = findColumn(colMap, ["fecha", "date"]);
  const idxParada = findColumn(colMap, ["parada", "stop", "nombre", "name"]);
  const idxDireccion = findColumn(colMap, ["direccion", "address"]);
  const idxPaquetes = findColumn(colMap, ["paquetes", "packages", "paquete", "cantidad", "qty"]);

  if (idxPaquetes < 0) {
    throw new Error("La plantilla manual necesita una columna 'paquetes'.");
  }

  const today = todayISO();
  const byDate = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const fecha = parseDatePart(cell(row, idxFecha)) || today;
    const parada = cell(row, idxParada);
    const direccion = cell(row, idxDireccion);
    const paquetesRaw = cell(row, idxPaquetes);

    // Fila cruda completa. [Aud 20]
    const filaCruda = {};
    header.forEach((h, j) => {
      filaCruda[String(h).trim()] = cell(row, j);
    });

    if (!byDate.has(fecha)) {
      byDate.set(fecha, { detalle: [], filasCrudas: [], advertencias: [] });
    }
    const group = byDate.get(fecha);
    group.filasCrudas.push(filaCruda);

    // paquetes vacío -> 1; inválido -> 0 + advertencia, nunca rompe. [Aud 11]
    let paq;
    if (paquetesRaw === "") {
      paq = 1;
    } else {
      const n = Number(paquetesRaw);
      if (!Number.isFinite(n) || n < 0) {
        paq = 0;
        group.advertencias.push(
          `Fila ${i + 1}: paquetes inválido ("${paquetesRaw}"), contado como 0.`
        );
      } else {
        paq = Math.trunc(n);
      }
    }

    group.detalle.push({
      direccion: direccion || parada || UNKNOWN_ADDRESS,
      nombre: parada || "",
      paquetes: paq,
      barcodes: [],
      seqNos: [],
      eventos: [],
    });
  }

  const previews = [];
  for (const [fecha, group] of byDate.entries()) {
    const paquetes = group.detalle.reduce((a, p) => a + p.paquetes, 0);
    previews.push({
      fecha,
      origen: "manual",
      paquetes,
      paradas: group.detalle.length,
      detalle: group.detalle,
      filasCrudas: group.filasCrudas,
      advertencias: group.advertencias,
    });
  }
  previews.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  return previews;
}

export default { id: "manual", nombre: "Plantilla manual", detectar, parse };
