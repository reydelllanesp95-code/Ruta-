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
