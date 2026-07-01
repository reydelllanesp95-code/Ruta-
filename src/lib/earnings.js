// Lógica pura de ganancias: fechas, hash, validación y agregaciones. [Aud 5][Aud 9]
// Sin React, fácil de testear. [Aud 21]

import { SCHEMA_VERSION, TARIFA_DEFAULT, DEFAULT_CONFIG } from "./constants.js";

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

// ---- Semana de PAGO (configurable). El usuario cobra los viernes → la semana
// va sábado→viernes (inicio = sábado, 6). La clave es la fecha del día de inicio.

function isoFromUTC(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// Fecha (YYYY-MM-DD) del inicio de la semana de pago que contiene dateStr.
export function payWeekStart(dateStr, startDow = 6) {
  const [y, mo, da] = String(dateStr).split("-").map(Number);
  const d = new Date(Date.UTC(y, (mo || 1) - 1, da || 1));
  const back = (d.getUTCDay() - startDow + 7) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return isoFromUTC(d);
}

// Fecha de cierre (6 días después del inicio → el día de pago).
export function payWeekEnd(startDateStr) {
  const [y, mo, da] = String(startDateStr).split("-").map(Number);
  const d = new Date(Date.UTC(y, (mo || 1) - 1, da || 1));
  d.setUTCDate(d.getUTCDate() + 6);
  return isoFromUTC(d);
}

// Clave de agrupación semanal = fecha de inicio de la semana de pago (ordenable).
export function payWeekKey(dateStr, startDow = 6) {
  return payWeekStart(dateStr, startDow);
}

export function currentPayWeekKey(startDow = 6, d = new Date()) {
  return payWeekStart(todayISO(d), startDow);
}

const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function fechaCorta(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[3])} ${MESES_CORTO[Number(m[2]) - 1]}`;
}

// Etiqueta "27 jun – 3 jul" para una semana de pago dada por su clave (inicio).
export function payWeekLabel(startKey) {
  return `${fechaCorta(startKey)} – ${fechaCorta(payWeekEnd(startKey))}`;
}

export function monthLabel(key) {
  const m = String(key).match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  return `${MESES_LARGO[Number(m[2]) - 1] || m[2]} ${m[1]}`;
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

// ---- Datos DERIVADOS de costo (NUNCA se persisten; runtime puro) ----
// fuel_cost = (millas / mpg) * gas_price
// maintenance_est = millas * maintenance_cost_per_mile
// net_profit = ganancia_bruta - fuel_cost - maintenance_est
// cost_per_mile = (fuel_cost + maintenance_est) / millas
// Todas blindadas contra NaN, millas=0, mpg 0/null y gas_price faltante.

export function fuelCost(millas, mpg, gasPrice) {
  const mi = Number(millas);
  const m = Number(mpg);
  const g = Number(gasPrice);
  if (!Number.isFinite(mi) || mi <= 0) return 0;
  if (!Number.isFinite(m) || m <= 0) return 0; // mpg 0/null → sin costo, no crash
  if (!Number.isFinite(g) || g <= 0) return 0; // gas_price faltante → 0
  return round2((mi / m) * g);
}

export function maintenanceEst(millas, perMile) {
  const mi = Number(millas);
  const p = Number(perMile);
  if (!Number.isFinite(mi) || mi <= 0) return 0;
  if (!Number.isFinite(p) || p <= 0) return 0;
  return round2(mi * p);
}

export function netProfit(brutaGanancia, fuel, maint) {
  const b = Number(brutaGanancia) || 0;
  const f = Number(fuel) || 0;
  const m = Number(maint) || 0;
  return round2(b - f - m);
}

export function costPerMile(fuel, maint, millas) {
  const mi = Number(millas);
  if (!Number.isFinite(mi) || mi <= 0) return 0; // millas=0 → 0
  const total = (Number(fuel) || 0) + (Number(maint) || 0);
  return round2(total / mi);
}

// Economía derivada de una ruta según la config actual. No muta ni persiste.
export function routeEconomics(route, config = DEFAULT_CONFIG) {
  const cfg = config || DEFAULT_CONFIG;
  const millas = Number(route && route.millas) || 0;
  const bruta = round2(Number(route && route.ganancia) || 0);
  const fuel = fuelCost(millas, cfg.mpg, cfg.gas_price);
  const maint = maintenanceEst(millas, cfg.maintenance_cost_per_mile);
  return {
    ganancia_bruta: bruta,
    fuel_cost: fuel,
    maintenance_est: maint,
    net_profit: netProfit(bruta, fuel, maint),
    cost_per_mile: costPerMile(fuel, maint, millas),
  };
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
  return {
    rutas: 0,
    paquetes: 0,
    paradas: 0,
    millas: 0,
    ganancia: 0, // bruta
    fuel_cost: 0,
    maintenance_est: 0,
    net_profit: 0,
  };
}

function addRoute(acc, r, eco) {
  acc.rutas += 1;
  acc.paquetes += Number(r.paquetes) || 0;
  acc.paradas += Number(r.paradas) || 0;
  acc.millas += Number(r.millas) || 0;
  acc.ganancia = round2(acc.ganancia + (Number(r.ganancia) || 0));
  acc.fuel_cost = round2(acc.fuel_cost + eco.fuel_cost);
  acc.maintenance_est = round2(acc.maintenance_est + eco.maintenance_est);
  acc.net_profit = round2(acc.net_profit + eco.net_profit);
  return acc;
}

// Agrega el cost_per_mile del periodo a partir de sus totales sumados.
function withCostPerMile(t) {
  return { ...t, cost_per_mile: costPerMile(t.fuel_cost, t.maintenance_est, t.millas) };
}

// Devuelve totales globales y agrupados por semana y por mes (ordenados desc).
// `config` es opcional (default DEFAULT_CONFIG) → llamadas antiguas sin config
// siguen funcionando; los derivados se calculan en runtime, nunca se guardan.
export function aggregate(routes, config = DEFAULT_CONFIG) {
  const cfg = config || DEFAULT_CONFIG;
  const startDow = Number.isInteger(cfg.pay_week_start_day) ? cfg.pay_week_start_day : 6;
  const total = emptyTotals();
  const semanas = new Map();
  const meses = new Map();
  for (const r of routes) {
    const eco = routeEconomics(r, cfg);
    addRoute(total, r, eco);
    const wk = payWeekKey(r.fecha, startDow); // semana de pago sáb→vie
    if (!semanas.has(wk)) semanas.set(wk, emptyTotals());
    addRoute(semanas.get(wk), r, eco);
    const mk = monthKey(r.fecha);
    if (!meses.has(mk)) meses.set(mk, emptyTotals());
    addRoute(meses.get(mk), r, eco);
  }
  const toSortedArray = (map) =>
    Array.from(map.entries())
      .map(([key, totals]) => ({ key, ...withCostPerMile(totals) }))
      .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  return {
    total: withCostPerMile(total),
    porSemana: toSortedArray(semanas),
    porMes: toSortedArray(meses),
  };
}

// Totales del periodo actual (esta semana / este mes).
export function totalsForKey(list, key) {
  const found = list.find((x) => x.key === key);
  return found || { key, ...withCostPerMile(emptyTotals()) };
}
