// Fuel-ups (llenados de gasolina) y MPG real tanque-a-tanque. Lógica PURA.
// Nada aquí persiste; el MPG efectivo se calcula en runtime y NO se guarda.

import { makeUUID, round2, monthKey, payWeekKey } from "./earnings.js";

// Redondea a 1 decimal (para mostrar MPG).
function round1(n) {
  return Math.round((Number(n) + Number.EPSILON) * 10) / 10;
}

// Normaliza un fuel-up de entrada a su forma persistible.
export function makeFuelup({ fecha, galones, costo, odometro, vehiculo }) {
  return {
    id: makeUUID(),
    vehiculo: vehiculo || "kia",
    fecha: String(fecha || "").slice(0, 10),
    galones: Number(galones) || 0,
    costo: costo === "" || costo == null ? null : Number(costo),
    odometro: Number(odometro) || 0,
    creadoEn: new Date().toISOString(),
  };
}

// Valida un fuel-up ANTES de guardar contra los llenados ya registrados del
// mismo carro. Permite llenados atrasados: el odómetro solo tiene que encajar
// con el orden por fecha (mayor que los de fechas anteriores, menor que los de
// fechas posteriores) y no repetir uno existente. Devuelve { ok, error }.
export function validateFuelup({ galones, odometro, fecha }, fuelups = []) {
  const g = Number(galones);
  if (!Number.isFinite(g) || g <= 0) {
    return { ok: false, error: "Los galones deben ser un número mayor que 0." };
  }
  const o = Number(odometro);
  if (!Number.isFinite(o) || o <= 0) {
    return { ok: false, error: "El odómetro debe ser un número mayor que 0." };
  }
  const d = String(fecha || "").slice(0, 10);
  for (const f of fuelups || []) {
    const fo = Number(f.odometro);
    if (!Number.isFinite(fo)) continue;
    const fd = String(f.fecha || "").slice(0, 10);
    if (fo === o) {
      return { ok: false, error: `Ya hay un llenado con odómetro ${o} (${fd}).` };
    }
    if (d && fd && fd < d && fo > o) {
      return { ok: false, error: `Revisa el odómetro: el llenado del ${fd} ya tenía ${fo}, más que ${o}.` };
    }
    if (d && fd && fd > d && fo < o) {
      return { ok: false, error: `Revisa el odómetro: el llenado del ${fd} tenía ${fo}, menos que ${o}.` };
    }
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

// Rango posible para un carro de calle. Si el MPG del tramo cae fuera, algo
// está mal apuntado y se usa el MPG asumido.
export const MPG_MIN = 8;
export const MPG_MAX = 45;
// Más millas que esto entre dos llenados = hubo llenados sin apuntar (hueco).
export const MAX_GAP_MILES = 700;
// El MPG real se mide sobre al menos estas millas recientes (~2 tanques), para que los
// llenados parciales ($20 un día, $40 otro) se compensen entre sí.
export const WINDOW_MILES = 1000;

// Pares consecutivos (ordenados por odómetro asc): millas desde el llenado
// anterior y galones echados en este. Descarta galones<=0 y odómetro no
// creciente. `gap` = demasiadas millas, faltan llenados por apuntar.
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
    if (!(curr > prev)) continue;
    if (!Number.isFinite(gal) || gal <= 0) continue;
    const millas = curr - prev;
    pairs.push({ id: sorted[i].id, millas, galones: gal, gap: millas > MAX_GAP_MILES });
  }
  return pairs;
}

// Millas desde el llenado anterior por id (para la lista) y si es un hueco.
export function fillInfoById(fuelups) {
  return Object.fromEntries(
    validPairs(fuelups)
      .filter((p) => p.id != null)
      .map((p) => [p.id, { millas: Math.round(p.millas), gap: p.gap }]),
  );
}

// MPG real por tramo: desde el último llenado hacia atrás, suma millas y
// galones hasta juntar WINDOW_MILES (o hasta un hueco). Con llenados parciales
// cada llenado suelto miente, pero el total del tramo no. Null si no hay datos
// o si el resultado es imposible para un carro (fuera de 8–45).
export function realMpg(fuelups) {
  const pairs = validPairs(fuelups);
  let millas = 0;
  let galones = 0;
  for (let i = pairs.length - 1; i >= 0; i--) {
    if (pairs[i].gap) break;
    millas += pairs[i].millas;
    galones += pairs[i].galones;
    if (millas >= WINDOW_MILES) break;
  }
  if (galones <= 0) return null;
  const mpg = millas / galones;
  if (mpg < MPG_MIN || mpg > MPG_MAX) return null;
  return round1(mpg);
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
