// Fuel-ups (llenados de gasolina) y MPG real tanque-a-tanque. Lógica PURA.
// Nada aquí persiste; el MPG efectivo se calcula en runtime y NO se guarda.

import { makeUUID, round2, monthKey, payWeekKey } from "./earnings.js";

// Redondea a 1 decimal (para mostrar MPG).
function round1(n) {
  return Math.round((Number(n) + Number.EPSILON) * 10) / 10;
}

// Normaliza un fuel-up de entrada a su forma persistible.
export function makeFuelup({ fecha, galones, costo, odometro }) {
  return {
    id: makeUUID(),
    fecha: String(fecha || "").slice(0, 10),
    galones: Number(galones) || 0,
    costo: costo === "" || costo == null ? null : Number(costo),
    odometro: Number(odometro) || 0,
    creadoEn: new Date().toISOString(),
  };
}

// Valida un fuel-up ANTES de guardar. `prevOdometro` = odómetro más alto ya
// registrado (o null). Devuelve { ok, error } para avisar en pantalla. [ajuste 3]
export function validateFuelup({ galones, odometro }, prevOdometro) {
  const g = Number(galones);
  if (!Number.isFinite(g) || g <= 0) {
    return { ok: false, error: "Los galones deben ser un número mayor que 0." };
  }
  const o = Number(odometro);
  if (!Number.isFinite(o) || o <= 0) {
    return { ok: false, error: "El odómetro debe ser un número mayor que 0." };
  }
  if (prevOdometro != null && o <= Number(prevOdometro)) {
    return {
      ok: false,
      error: `Revisa el odómetro: ${o} es menor o igual que el anterior (${prevOdometro}).`,
    };
  }
  return { ok: true };
}

// Odómetro más alto registrado (para validar el siguiente), o null.
export function maxOdometro(fuelups) {
  let max = null;
  for (const f of fuelups || []) {
    const o = Number(f.odometro);
    if (Number.isFinite(o) && (max == null || o > max)) max = o;
  }
  return max;
}

// Pares válidos consecutivos (ordenados por odómetro asc). Cada par mide un
// tanque: mpg = (odo_actual - odo_anterior) / galones_actual.
// Descarta: galones<=0, odómetro no creciente. [edge cases del spec]
export function validPairs(fuelups) {
  const sorted = (fuelups || [])
    .filter((f) => Number.isFinite(Number(f.odometro)))
    .slice()
    .sort((a, b) => Number(a.odometro) - Number(b.odometro));
  const pairs = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i - 1].odometro);
    const curr = Number(sorted[i].odometro);
    const gal = Number(sorted[i].galones);
    if (!(curr > prev)) continue; // odómetro no creciente → par inválido
    if (!Number.isFinite(gal) || gal <= 0) continue; // galones inválidos
    pairs.push({ millas: curr - prev, galones: gal, mpg: (curr - prev) / gal });
  }
  return pairs;
}

// MPG real = promedio de los últimos N pares válidos. Necesita >= 2 fill-ups
// (>= 1 par). Sin datos suficientes → null (no crashea).
export function realMpg(fuelups, lastN = Infinity) {
  const pairs = validPairs(fuelups);
  if (pairs.length === 0) return null;
  const use = lastN === Infinity ? pairs : pairs.slice(-Math.max(1, lastN));
  const avg = use.reduce((a, p) => a + p.mpg, 0) / use.length;
  return round1(avg);
}

// MPG efectivo (DERIVADO, no se persiste): usa el real si hay datos, si no el
// asumido de la config. Devuelve { mpg, source, real }. [ajustes 1 y 2]
export function effectiveMpg(config, fuelups) {
  const real = realMpg(fuelups);
  if (real != null && real > 0) {
    return { mpg: real, source: "real", real };
  }
  const asumido = Number(config && config.mpg) || 0;
  return { mpg: asumido, source: "assumed", real: null };
}

// Costo total de gasolina registrado (informativo).
export function totalFuelSpend(fuelups) {
  let total = 0;
  for (const f of fuelups || []) {
    const c = Number(f.costo);
    if (Number.isFinite(c) && c > 0) total += c;
  }
  return round2(total);
}

// ---- Insights de gasolina por fecha (derivados, no se persisten) ----

// Días promedio entre llenados. Necesita >= 2 fechas válidas; si no, null.
export function avgDaysBetweenFillups(fuelups) {
  const fechas = (fuelups || [])
    .map((f) => String(f.fecha || ""))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
    .map((s) => Date.parse(s + "T00:00:00Z"))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  if (fechas.length < 2) return null;
  const totalDias = (fechas[fechas.length - 1] - fechas[0]) / 86400000;
  return round1(totalDias / (fechas.length - 1));
}

// Un llenado cuenta para el gasto SOLO si tiene costo real (> 0). Los que no
// tienen costo se excluyen del total y se reportan por separado (nunca $0).
function conCostoReal(f) {
  const c = Number(f.costo);
  return f.costo != null && Number.isFinite(c) && c > 0;
}

// Gasto de gasolina por semana de pago (sáb→vie) y por mes, + resumen de cuántos
// llenados no tienen costo (para avisar "N de M sin costo — total parcial").
export function fuelSpendByPeriod(fuelups, weekStartDow = 6) {
  const semanas = new Map();
  const meses = new Map();
  let total = 0;
  let conCosto = 0;
  let sinCosto = 0;

  for (const f of fuelups || []) {
    if (!conCostoReal(f)) {
      sinCosto += 1;
      continue;
    }
    const c = Number(f.costo);
    total = round2(total + c);
    conCosto += 1;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(f.fecha || ""))) {
      const wk = payWeekKey(f.fecha, weekStartDow);
      semanas.set(wk, round2((semanas.get(wk) || 0) + c));
      const mk = monthKey(f.fecha);
      meses.set(mk, round2((meses.get(mk) || 0) + c));
    }
  }

  const toArr = (map) =>
    Array.from(map.entries())
      .map(([key, gasto]) => ({ key, gasto }))
      .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));

  return {
    total,
    conCosto,
    sinCosto,
    count: (fuelups || []).length,
    porSemana: toArr(semanas),
    porMes: toArr(meses),
  };
}
