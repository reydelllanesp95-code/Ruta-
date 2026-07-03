// Gastos de comida del día de trabajo (almuerzo, merienda…). Lógica PURA.
// NO afecta el cálculo por ruta. El gasto de comida se RESTA del neto semanal/
// mensual (derivado en runtime; nada de esto se persiste salvo las entradas).

import { makeUUID, round2, monthKey, payWeekKey } from "./earnings.js";
import { MEAL_TYPES } from "./constants.js";

export function makeMeal({ fecha, tipo, costo, nota }) {
  return {
    id: makeUUID(),
    fecha: String(fecha || "").slice(0, 10),
    tipo: MEAL_TYPES.includes(tipo) ? tipo : "otro",
    // costo OPCIONAL: ausente/null = "sin costo registrado" (nunca se asume $0).
    costo: costo === "" || costo == null ? null : Number(costo),
    nota: nota == null ? "" : String(nota),
    creadoEn: new Date().toISOString(),
  };
}

// Valida antes de guardar. Fecha obligatoria; tipo debe ser válido; si el costo
// viene presente, debe ser número >= 0 (si falta, se permite: "sin costo").
export function validateMeal({ fecha, tipo, costo }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ""))) {
    return { ok: false, error: "Pon una fecha válida." };
  }
  if (tipo != null && !MEAL_TYPES.includes(tipo)) {
    return { ok: false, error: "Tipo de comida inválido." };
  }
  if (costo !== "" && costo != null) {
    const c = Number(costo);
    if (!Number.isFinite(c) || c < 0) {
      return { ok: false, error: "El costo debe ser un número ≥ 0." };
    }
  }
  return { ok: true };
}

// Una comida cuenta para el gasto SOLO si tiene costo real (> 0). Las que no
// tienen costo se excluyen del total y se reportan (nunca cuentan como $0).
function conCostoReal(m) {
  const c = Number(m.costo);
  return m.costo != null && Number.isFinite(c) && c > 0;
}

// Gasto de comida por semana de pago (sáb→vie) y por mes, + cuántas comidas no
// tienen costo (para avisar "N de M sin costo — total parcial").
export function mealSpendByPeriod(meals, weekStartDow = 6) {
  const semanas = new Map();
  const meses = new Map();
  let total = 0;
  let conCosto = 0;
  let sinCosto = 0;

  for (const m of meals || []) {
    if (!conCostoReal(m)) {
      sinCosto += 1;
      continue;
    }
    const c = Number(m.costo);
    total = round2(total + c);
    conCosto += 1;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(m.fecha || ""))) {
      const wk = payWeekKey(m.fecha, weekStartDow);
      semanas.set(wk, round2((semanas.get(wk) || 0) + c));
      const mk = monthKey(m.fecha);
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
    count: (meals || []).length,
    porSemana: toArr(semanas),
    porMes: toArr(meses),
  };
}

// Gasto de comida (con costo real) que cae en una clave de período dada
// (semana de pago o mes). Se usa para "neto después de comida" del período.
export function mealSpendForKey(meals, key, weekStartDow = 6) {
  let total = 0;
  const esSemana = /^\d{4}-\d{2}-\d{2}$/.test(String(key)); // clave semana = fecha de inicio
  for (const m of meals || []) {
    if (!conCostoReal(m)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(m.fecha || ""))) continue;
    const k = esSemana ? payWeekKey(m.fecha, weekStartDow) : monthKey(m.fecha);
    if (k === key) total = round2(total + Number(m.costo));
  }
  return total;
}
