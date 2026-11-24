// Configuración global de costos (KEY_CONFIG): gas_price, mpg,
// maintenance_cost_per_mile. Persistida con el versionado de storage.js.
// Fallback seguro a DEFAULT_CONFIG si no existe o viene corrupta.

import { KEY_CONFIG, DEFAULT_CONFIG } from "./constants.js";
import { loadJSON, saveJSON } from "./storage.js";

// Número >= 0 o el valor por defecto. Nunca NaN.
function nonNeg(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// mpg debe ser > 0 (0/null rompería la división); si no, usa el default.
function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Día de la semana entero 0..6; si no, usa el default.
function weekday(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback;
}

function fecha(value, fallback) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : fallback;
}

// Reparto de la inversión: lista de { nombre, monto ≥ 0 } con nombre.
function inversiones(value) {
  if (!Array.isArray(value)) return DEFAULT_CONFIG.meta_inversiones;
  const ok = value
    .filter((x) => x && String(x.nombre || "").trim())
    .map((x) => ({ nombre: String(x.nombre).trim(), monto: nonNeg(x.monto, 0) }));
  return ok.length ? ok : DEFAULT_CONFIG.meta_inversiones;
}

// Devuelve un config válido a partir de cualquier entrada (o null).
export function sanitizeConfig(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    gas_price: nonNeg(c.gas_price, DEFAULT_CONFIG.gas_price),
    mpg: positive(c.mpg, DEFAULT_CONFIG.mpg),
    maintenance_cost_per_mile: nonNeg(
      c.maintenance_cost_per_mile,
      DEFAULT_CONFIG.maintenance_cost_per_mile
    ),
    tucson_mpg: positive(c.tucson_mpg, DEFAULT_CONFIG.tucson_mpg),
    tucson_maintenance_cost_per_mile: nonNeg(
      c.tucson_maintenance_cost_per_mile,
      DEFAULT_CONFIG.tucson_maintenance_cost_per_mile
    ),
    // 6 (sábado) era el valor de antes por defecto, nunca elegido a mano: pasa
    // a la semana lunes→domingo que eligió Rey.
    pay_week_start_day: Number(c.pay_week_start_day) === 6 ? DEFAULT_CONFIG.pay_week_start_day : weekday(c.pay_week_start_day, DEFAULT_CONFIG.pay_week_start_day),
    meta_colchon: nonNeg(c.meta_colchon, DEFAULT_CONFIG.meta_colchon),
    meta_deuda_semana: nonNeg(c.meta_deuda_semana, DEFAULT_CONFIG.meta_deuda_semana),
    meta_extra: nonNeg(c.meta_extra, DEFAULT_CONFIG.meta_extra),
    meta_inversiones: inversiones(c.meta_inversiones),
    fondo_tope: nonNeg(c.fondo_tope, DEFAULT_CONFIG.fondo_tope),
    fondo_inicial: nonNeg(c.fondo_inicial, DEFAULT_CONFIG.fondo_inicial),
    fondo_desde: fecha(c.fondo_desde, DEFAULT_CONFIG.fondo_desde),
    plan_inicio: fecha(c.plan_inicio, DEFAULT_CONFIG.plan_inicio),
    plan_meses: positive(c.plan_meses, DEFAULT_CONFIG.plan_meses),
  };
}

export async function loadConfig() {
  const raw = await loadJSON(KEY_CONFIG, null);
  return sanitizeConfig(raw);
}

export async function saveConfig(config) {
  const clean = sanitizeConfig(config);
  await saveJSON(KEY_CONFIG, clean);
  return clean;
}
