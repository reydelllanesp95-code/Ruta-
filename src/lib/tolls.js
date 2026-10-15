// Peajes (SunPass / E-PASS). Lógica PURA. Se RESTAN del neto de la semana y del
// mes (como la comida); no se reparten por turno.
//
// OJO: el importador de CSV está escrito sin haber visto un archivo real de
// SunPass ni de E-PASS (NO VERIFICADO). Detecta columnas por nombres comunes.

import { makeUUID, round2, monthKey, payWeekKey, parseDatePart, hashStable } from "./earnings.js";
import { parseCSV, dropEmptyRows, buildColumnMap, findColumn, cell } from "./csv.js";

export const TOLL_AGENCIES = ["sunpass", "epass", "otro"];
export const TOLL_AGENCY_LABELS = { sunpass: "SunPass", epass: "E-PASS", otro: "Otro" };

// Huella para no importar dos veces el mismo cargo.
export function tollKey({ fecha, hora, monto, lugar }) {
  return hashStable(`${fecha}|${hora || ""}|${round2(monto)}|${String(lugar || "").toLowerCase().trim()}`);
}

export function validateToll({ fecha, monto, agencia }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ""))) {
    return { ok: false, error: "Pon una fecha válida." };
  }
  if (agencia != null && !TOLL_AGENCIES.includes(agencia)) {
    return { ok: false, error: "Agencia inválida." };
  }
  const m = Number(monto);
  if (monto === "" || monto == null || !Number.isFinite(m) || m <= 0) {
    return { ok: false, error: "El monto debe ser un número mayor que 0." };
  }
  return { ok: true };
}

export function makeToll({ fecha, hora = "", monto, agencia = "sunpass", lugar = "", origen = "manual" }) {
  const t = {
    fecha: String(fecha || "").slice(0, 10),
    hora: String(hora || ""),
    monto: round2(Number(monto)),
    agencia: TOLL_AGENCIES.includes(agencia) ? agencia : "otro",
    lugar: String(lugar || "").trim(),
  };
  return { id: makeUUID(), ...t, clave: tollKey(t), origen, creadoEn: new Date().toISOString() };
}

// "$1.25", "1,234.50", "(1.25)", "-1.25" → número (paréntesis = negativo).
export function parseAmount(raw) {
  let s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$\s,]/g, "");
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return neg ? -n : n;
}

// Hora "HH:MM" (24h) si la celda trae una hora, p. ej. "10/14/2026 8:05:12 PM".
function timePart(value) {
  const m = String(value || "").match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (!m) return "";
  let h = Number(m[1]);
  const ap = m[3] ? m[3].toLowerCase() : "";
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

const DATE_COLS = ["transaction date", "date", "fecha", "posted date", "trans date", "entry date", "exit date", "date time"];
const TIME_COLS = ["time", "hora", "transaction time", "exit time", "entry time"];
const AMOUNT_COLS = ["amount", "toll amount", "monto", "toll", "charge", "debit", "cost", "fare"];
const PLACE_COLS = ["location", "plaza", "plaza name", "toll plaza", "lugar", "exit plaza", "description", "roadway"];

// Lee un CSV de peajes. Devuelve { tolls, omitidas: [{ fila, motivo }], duplicados }.
// `existentes`: peajes ya guardados (para no duplicar).
export function parseTollsCSV(text, agencia = "sunpass", existentes = []) {
  const rows = dropEmptyRows(parseCSV(text));
  if (rows.length < 2) throw new Error("El archivo no tiene filas de peajes.");
  const col = buildColumnMap(rows[0]);
  const iFecha = findColumn(col, DATE_COLS);
  const iMonto = findColumn(col, AMOUNT_COLS);
  const iHora = findColumn(col, TIME_COLS);
  const iLugar = findColumn(col, PLACE_COLS);
  if (iFecha < 0 || iMonto < 0) {
    throw new Error(
      "No encuentro las columnas de fecha y monto. Encabezados del archivo: " + rows[0].join(", ")
    );
  }
  const vistas = new Set((existentes || []).map((t) => t.clave));
  const tolls = [];
  const omitidas = [];
  let duplicados = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const fila = i + 1;
    const fecha = parseDatePart(cell(r, iFecha));
    if (!fecha) {
      omitidas.push({ fila, motivo: "fecha no válida" });
      continue;
    }
    const monto = parseAmount(cell(r, iMonto));
    if (monto == null) {
      omitidas.push({ fila, motivo: "monto no válido" });
      continue;
    }
    if (monto <= 0) {
      omitidas.push({ fila, motivo: "monto negativo o cero (pago/recarga)" });
      continue;
    }
    const hora = timePart(iHora >= 0 ? cell(r, iHora) : cell(r, iFecha));
    const t = makeToll({ fecha, hora, monto, agencia, lugar: cell(r, iLugar), origen: "csv" });
    if (vistas.has(t.clave)) {
      duplicados += 1;
      continue;
    }
    vistas.add(t.clave);
    tolls.push(t);
  }
  return { tolls, omitidas, duplicados };
}

// Gasto en peajes por semana de pago y por mes.
export function tollSpendByPeriod(tolls, weekStartDow = 6) {
  const semanas = new Map();
  const meses = new Map();
  let total = 0;
  for (const t of tolls || []) {
    const m = Number(t.monto);
    if (!Number.isFinite(m) || m <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(t.fecha))) continue;
    total = round2(total + m);
    const wk = payWeekKey(t.fecha, weekStartDow);
    semanas.set(wk, round2((semanas.get(wk) || 0) + m));
    const mk = monthKey(t.fecha);
    meses.set(mk, round2((meses.get(mk) || 0) + m));
  }
  const toArr = (map) =>
    Array.from(map.entries())
      .map(([key, gasto]) => ({ key, gasto }))
      .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  return { total, count: (tolls || []).length, porSemana: toArr(semanas), porMes: toArr(meses) };
}

// Gasto en peajes de una clave de período (semana = fecha de inicio, o mes YYYY-MM).
export function tollSpendForKey(tolls, key, weekStartDow = 6) {
  const esSemana = /^\d{4}-\d{2}-\d{2}$/.test(String(key));
  let total = 0;
  for (const t of tolls || []) {
    const m = Number(t.monto);
    if (!Number.isFinite(m) || m <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(t.fecha))) continue;
    const k = esSemana ? payWeekKey(t.fecha, weekStartDow) : monthKey(t.fecha);
    if (k === key) total = round2(total + m);
  }
  return total;
}
