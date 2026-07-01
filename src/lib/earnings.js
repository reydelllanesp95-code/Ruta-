// Lógica pura de ganancias: fechas, hash, validación y agregaciones. [Aud 5][Aud 9]
// Sin React, fácil de testear. [Aud 21]

import { SCHEMA_VERSION, TARIFA_DEFAULT } from "./constants.js";

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n) {
  const v = Number(n) || 0;
  return "$" + v.toFixed(2);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// ---- Fechas (formato interno SIEMPRE YYYY-MM-DD) [Aud 6][Aud 10] ----

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Extrae la parte de fecha (YYYY-MM-DD) de varios formatos comunes.
export function parseDatePart(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  // ISO: 2026-06-27 o 2026-06-27T12:20:35
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // YYYY/MM/DD
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  // MM/DD/YYYY o M/D/YYYY (formato US)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad2(m[1])}-${pad2(m[2])}`;
  return null;
}

// Busca una fecha en el nombre del archivo: YYYY-MM-DD o YYYYMMDD.
export function dateFromFilename(name) {
  if (!name) return null;
  let m = String(name).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = String(name).match(/(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

// Semana ISO (lunes a domingo). Devuelve { year, week }. [Aud 7]
export function isoWeek(dateStr) {
  const [y, mo, da] = String(dateStr).split("-").map(Number);
  const d = new Date(Date.UTC(y, (mo || 1) - 1, da || 1));
  const day = d.getUTCDay() || 7; // domingo=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // jueves de esta semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKey(dateStr) {
  const { year, week } = isoWeek(dateStr);
  return `${year}-W${pad2(week)}`;
}

export function monthKey(dateStr) {
  return String(dateStr).slice(0, 7); // YYYY-MM
}

export function currentWeekKey(d = new Date()) {
  return weekKey(todayISO(d));
}

export function currentMonthKey(d = new Date()) {
  return monthKey(todayISO(d));
}

// ---- Hash estable (FNV-1a) para la huella de ruta [Aud 5] ----

export function hashStable(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// Huella independiente del orden de filas: barcodes ordenados (OnTrac) o
// direcciones+paquetes ordenados (manual). [Aud 5]
export function computeHuella(routeLike) {
  const detalle = routeLike.detalle || [];
  const barcodes = [];
  detalle.forEach((p) => (p.barcodes || []).forEach((b) => b && barcodes.push(String(b))));
  let basis;
  if (barcodes.length) {
    basis = barcodes.slice().sort().join("|");
  } else {
    basis = detalle
      .map((p) => `${String(p.direccion).toLowerCase()}:${p.paquetes}`)
      .sort()
      .join("|");
  }
  return hashStable(`${routeLike.origen || ""}#${routeLike.fecha || ""}#${basis}`);
}

export function makeUUID() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* noop */
  }
  return "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// ---- Validación numérica [Aud 9][Aud 19] ----

// Devuelve { ok, value, error }. No acepta texto ni negativos.
export function validateNonNegative(value, label) {
  if (value === "" || value == null) return { ok: true, value: 0 };
  const n = Number(value);
  if (!Number.isFinite(n)) return { ok: false, error: `${label} debe ser un número.` };
  if (n < 0) return { ok: false, error: `${label} no puede ser negativo.` };
  return { ok: true, value: n };
}

// Valida millas y tarifa antes de guardar una ruta.
export function validateRouteInputs({ millas, tarifa }) {
  const errors = [];
  const m = validateNonNegative(millas, "Las millas");
  if (!m.ok) errors.push(m.error);
  const t = validateNonNegative(tarifa, "La tarifa");
  if (!t.ok) errors.push(t.error);
  return { ok: errors.length === 0, errors, millas: m.value, tarifa: t.value };
}

// Convierte una ruta "preview" del parser en una ruta final persistible. [Aud 8]
export function finalizeRoute(preview, { millas = 0, tarifa = TARIFA_DEFAULT } = {}) {
  const tarifaUsada = Number(tarifa);
  const paquetes = Number(preview.paquetes) || 0;
  return {
    id: makeUUID(),
    schemaVersion: SCHEMA_VERSION,
    fecha: preview.fecha,
    paquetes,
    paradas: Number(preview.paradas) || 0,
    millas: Number(millas) || 0,
    tarifaUsada,
    ganancia: round2(paquetes * tarifaUsada), // congelada, no se recalcula [Aud 8]
    huella: computeHuella(preview),
    origen: preview.origen,
    detalle: preview.detalle || [],
    filasCrudas: preview.filasCrudas || [], // se conserva TODO el CSV [Aud 20]
    importadoEn: new Date().toISOString(),
  };
}

// ---- Agregaciones (memoizables) [Aud 4][Aud 16] ----

function emptyTotals() {
  return { rutas: 0, paquetes: 0, paradas: 0, millas: 0, ganancia: 0 };
}

function addRoute(acc, r) {
  acc.rutas += 1;
  acc.paquetes += Number(r.paquetes) || 0;
  acc.paradas += Number(r.paradas) || 0;
  acc.millas += Number(r.millas) || 0;
  acc.ganancia = round2(acc.ganancia + (Number(r.ganancia) || 0));
  return acc;
}

// Devuelve totales globales y agrupados por semana y por mes (ordenados desc).
export function aggregate(routes) {
  const total = emptyTotals();
  const semanas = new Map();
  const meses = new Map();
  for (const r of routes) {
    addRoute(total, r);
    const wk = weekKey(r.fecha);
    if (!semanas.has(wk)) semanas.set(wk, emptyTotals());
    addRoute(semanas.get(wk), r);
    const mk = monthKey(r.fecha);
    if (!meses.has(mk)) meses.set(mk, emptyTotals());
    addRoute(meses.get(mk), r);
  }
  const toSortedArray = (map) =>
    Array.from(map.entries())
      .map(([key, totals]) => ({ key, ...totals }))
      .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  return {
    total,
    porSemana: toSortedArray(semanas),
    porMes: toSortedArray(meses),
  };
}

// Totales del periodo actual (esta semana / este mes).
export function totalsForKey(list, key) {
  const found = list.find((x) => x.key === key);
  return found || { key, ...emptyTotals() };
}
