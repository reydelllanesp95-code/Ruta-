// Vehículos de trabajo. Cada registro (turno, ruta, llenado, mantenimiento)
// pertenece a uno; sin campo `vehiculo` (datos viejos) es el Kia.

import { effectiveMpg } from "./fuel.js";

export const VEHICLES = {
  kia: { label: "Kia Sorento", mpgKey: "mpg", maintKey: "maintenance_cost_per_mile" },
  tucson: { label: "Hyundai Tucson", mpgKey: "tucson_mpg", maintKey: "tucson_maintenance_cost_per_mile" },
};

export const VEHICLE_IDS = Object.keys(VEHICLES);
export const DEFAULT_VEHICLE = "kia";

export function vehicleOf(record) {
  const v = record && record.vehiculo;
  return v && VEHICLES[v] ? v : DEFAULT_VEHICLE;
}

export function vehicleLabel(id) {
  return (VEHICLES[id] && VEHICLES[id].label) || id;
}

export function forVehicle(items, id) {
  return (items || []).filter((x) => vehicleOf(x) === id);
}

// Config de costos de UN vehículo con la forma que espera routeEconomics
// ({ gas_price, mpg, maintenance_cost_per_mile, ... }), usando su MPG real si
// tiene suficientes llenados propios. Devuelve { config, effInfo }.
export function vehicleConfig(config, fuelups, id) {
  const v = VEHICLES[id] || VEHICLES[DEFAULT_VEHICLE];
  const asumido = { mpg: config[v.mpgKey] };
  const effInfo = effectiveMpg(asumido, forVehicle(fuelups, id));
  return {
    effInfo,
    config: {
      ...config,
      mpg: effInfo.mpg,
      maintenance_cost_per_mile: config[v.maintKey],
    },
  };
}

// Mapa { kia: {config, effInfo}, tucson: {...} } para todos los vehículos.
export function vehicleConfigs(config, fuelups) {
  const out = {};
  for (const id of VEHICLE_IDS) out[id] = vehicleConfig(config, fuelups, id);
  return out;
}
