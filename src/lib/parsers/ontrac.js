// Parser del CSV oficial exportado por OnTrac. [Aud 3][Aud 4][Aud 10]
//
// CLAVE: en este CSV cada fila = 1 PAQUETE (no una parada).
// Las paradas se obtienen agrupando por la columna Address (normalizada).

import { buildColumnMap, findColumn, cell } from "../csv.js";
import { parseDatePart, dateFromFilename, todayISO } from "../earnings.js";
import { UNKNOWN_ADDRESS } from "../constants.js";

// Colapsa espacios, quita extremos y compara en minúsculas. [Aud 4]
function normalizeAddress(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectar(normHeader) {
  return normHeader.includes("barcode") && normHeader.includes("address");
}

function parse(rows, filename = "") {
  const header = rows[0];
  const colMap = buildColumnMap(header);

  const idxBarcode = findColumn(colMap, ["barcode"]);
  const idxAddress = findColumn(colMap, ["address"]);
  const idxLastEvent = findColumn(colMap, ["last event"]);
  const idxLastEventTime = findColumn(colMap, ["last event time"]);
  const idxGps = findColumn(colMap, ["last gps location", "gps"]);
  const idxSeq = findColumn(colMap, ["seq no", "sequence", "seq"]);

  if (idxAddress < 0) {
    throw new Error("El CSV de OnTrac no tiene la columna Address.");
  }

  const fileDate = dateFromFilename(filename);
  const today = todayISO();

  // Fecha dominante = la más común entre las horas de entrega presentes. Sirve
  // de respaldo para las filas SIN entregar (Last Event time vacío), para no
  // mandarlas a "hoy" y partir la ruta sin razón. [Aud 10]
  const conteo = new Map();
  for (let i = 1; i < rows.length; i++) {
    const d = parseDatePart(cell(rows[i], idxLastEventTime));
    if (d) conteo.set(d, (conteo.get(d) || 0) + 1);
  }
  let dominantDate = null;
  let mejor = -1;
  for (const [d, n] of conteo.entries()) {
    if (n > mejor) {
      mejor = n;
      dominantDate = d;
    }
  }
  // Respaldo para filas sin hora de entrega: nombre de archivo, luego fecha
  // dominante, luego hoy.
  const fallbackDate = fileDate || dominantDate || today;

  // Agrupa primero por fecha (puede haber varias fechas en un archivo). [Aud 10]
  const byDate = new Map();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const barcode = cell(r, idxBarcode);
    const addressPretty = cell(r, idxAddress);
    const lastEvent = cell(r, idxLastEvent);
    const lastEventTime = cell(r, idxLastEventTime);
    const gps = cell(r, idxGps);
    const seqNo = cell(r, idxSeq);

    const fecha = parseDatePart(lastEventTime) || fallbackDate;

    // Fila cruda: TODAS las columnas originales, tal cual. [Aud 20]
    const filaCruda = {};
    header.forEach((h, j) => {
      filaCruda[String(h).trim()] = cell(r, j);
    });

    if (!byDate.has(fecha)) byDate.set(fecha, { paradas: new Map(), filasCrudas: [] });
    const group = byDate.get(fecha);
    group.filasCrudas.push(filaCruda);

    const key = normalizeAddress(addressPretty);
    const stopKey = key || "__sin_direccion__";
    if (!group.paradas.has(stopKey)) {
      group.paradas.set(stopKey, {
        direccion: addressPretty || UNKNOWN_ADDRESS,
        paquetes: 0,
        barcodes: [],
        seqNos: [],
        eventos: [],
      });
    }
    const parada = group.paradas.get(stopKey);
    parada.paquetes += 1;
    if (barcode) parada.barcodes.push(barcode);
    if (seqNo) parada.seqNos.push(seqNo);
    parada.eventos.push({ lastEvent, lastEventTime, gps });
    // Si la primera dirección venía vacía y luego aparece una "bonita", úsala.
    if (parada.direccion === UNKNOWN_ADDRESS && addressPretty) {
      parada.direccion = addressPretty;
    }
  }

  const previews = [];
  for (const [fecha, group] of byDate.entries()) {
    const detalle = Array.from(group.paradas.values());
    const paquetes = detalle.reduce((a, p) => a + p.paquetes, 0);
    previews.push({
      fecha,
      origen: "ontrac",
      paquetes,
      paradas: detalle.length,
      detalle,
      filasCrudas: group.filasCrudas,
      advertencias: [],
    });
  }
  previews.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  return previews;
}

export default { id: "ontrac", nombre: "OnTrac", detectar, parse };
