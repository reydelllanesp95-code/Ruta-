// Mantenimiento del vehículo: histórico + insights informativos. Lógica PURA.
// NO afecta el cálculo por ruta (eso usa config.maintenance_cost_per_mile).
// El costo real/milla histórico es una ESTIMACIÓN, no se persiste ni sobrescribe
// la config sola.

import { makeUUID, round2, monthKey } from "./earnings.js";
import { MAINT_TYPES } from "./constants.js";

export function makeMaint({ fecha, tipo, costo, odometro }) {
  return {
    id: makeUUID(),
    fecha: String(fecha || "").slice(0, 10),
    tipo: MAINT_TYPES.includes(tipo) ? tipo : "repair",
    costo: costo === "" || costo == null ? null : Number(costo),
    odometro: odometro === "" || odometro == null ? null : Number(odometro),
    creadoEn: new Date().toISOString(),
  };
}

// Valida antes de guardar. costo y odómetro son opcionales; si vienen, deben ser
// números >= 0. La fecha es obligatoria.
export function validateMaint({ fecha, costo, odometro }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ""))) {
    return { ok: false, error: "Pon una fecha válida." };
  }
  if (costo !== "" && costo != null) {
    const c = Number(costo);
    if (!Number.isFinite(c) || c < 0) return { ok: false, error: "El costo debe ser un número ≥ 0." };
  }
  if (odometro !== "" && odometro != null) {
    const o = Number(odometro);
    if (!Number.isFinite(o) || o < 0) return { ok: false, error: "El odómetro debe ser un número ≥ 0." };
  }
  return { ok: true };
}

// Suma de costos reales (excluye los que no tienen costo) + conteo de faltantes.
export function costSummary(items) {
  let total = 0;
  let conCosto = 0;
  let sinCosto = 0;
  for (const m of items || []) {
    const c = Number(m.costo);
    if (m.costo != null && Number.isFinite(c) && c >= 0) {
      total += c;
      conCosto += 1;
    } else {
      sinCosto += 1;
    }
  }
  return { total: round2(total), conCosto, sinCosto, count: (items || []).length };
}

// Gasto de mantenimiento por mes (solo costos reales). Ordenado desc.
export function maintByMonth(items) {
  const map = new Map();
  for (const m of items || []) {
    const c = Number(m.costo);
    if (m.costo == null || !Number.isFinite(c) || c < 0) continue;
    const key = monthKey(m.fecha);
    const cur = map.get(key) || { key, total: 0, count: 0 };
    cur.total = round2(cur.total + c);
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

// Costo real/milla HISTÓRICO (estimación): usa el span de odómetro (máx−mín) de
// los items con odómetro. Requiere >= 2 con odómetro y span > 0; si no, null
// (se omite el insight — nada inventado).
export function histMaintCostPerMile(items) {
  const odos = (items || [])
    .map((m) => Number(m.odometro))
    .filter((o) => Number.isFinite(o) && o > 0);
  if (odos.length < 2) return null;
  const span = Math.max(...odos) - Math.min(...odos);
  if (!(span > 0)) return null;
  const { total, conCosto, sinCosto } = costSummary(items);
  if (conCosto === 0) return null; // sin ningún costo real, no hay nada que dividir
  return {
    costPerMile: round2(total / span),
    span,
    totalCost: total,
    conCosto,
    sinCosto,
    estimacion: true, // es una estimación histórica, no un valor exacto
  };
}
