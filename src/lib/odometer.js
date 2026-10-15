// Odómetro: último valor conocido por carro y paso de la "rueda" de dígitos.

import { vehicleOf } from "./vehicles.js";

// Mayor odómetro conocido de un vehículo entre turnos, llenados y mantenimiento.
// Sin datos → null.
export function lastOdometer(vehiculo, { routes = [], fuelups = [], maints = [] } = {}) {
  let max = null;
  const consider = (v) => {
    const n = Number(v);
    if (v !== "" && v != null && Number.isFinite(n) && n > 0 && (max == null || n > max)) max = n;
  };
  for (const r of routes) {
    if (vehicleOf(r) !== vehiculo) continue;
    consider(r.odoInicio);
    consider(r.odoFin);
  }
  for (const f of fuelups) if (vehicleOf(f) === vehiculo) consider(f.odometro);
  for (const m of maints) if (vehicleOf(m) === vehiculo) consider(m.odometro);
  return max;
}

// Rueda: mover el dígito de la posición k (0 = unidades) una vez hacia arriba
// (+10^k) o abajo (−10^k), con acarreo como un odómetro real. Nunca < 0.
export function stepOdometer(value, k, dir) {
  const base = Math.trunc(Number(value) || 0);
  const next = base + (dir > 0 ? 1 : -1) * 10 ** k;
  return next < 0 ? 0 : next;
}
