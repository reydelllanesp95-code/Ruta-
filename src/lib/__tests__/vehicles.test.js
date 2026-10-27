import { describe, it, expect } from "vitest";
import { vehicleOf, vehicleConfig, vehicleConfigs, forVehicle } from "../vehicles.js";
import { makeFuelup, validateFuelup } from "../fuel.js";
import { makeMaint, histMaintCostPerMile } from "../maintenance.js";
import { makeShift, validateShift } from "../platforms.js";
import { aggregate, finalizeRoute, routeEconomics } from "../earnings.js";
import { sanitizeConfig } from "../config.js";

const CFG = sanitizeConfig({
  gas_price: 3,
  mpg: 17,
  maintenance_cost_per_mile: 0.1,
  tucson_mpg: 25,
  tucson_maintenance_cost_per_mile: 0.05,
});

const turno = {
  plataforma: "flex",
  fecha: "2026-10-14",
  horaInicio: "08:00",
  horaFin: "12:00",
  millas: "85",
  pago: "90",
  propina: "",
};

describe("vehicleOf", () => {
  it("registros viejos sin vehiculo → kia", () => {
    expect(vehicleOf({})).toBe("kia");
    expect(vehicleOf({ vehiculo: "raro" })).toBe("kia");
    expect(vehicleOf({ vehiculo: "tucson" })).toBe("tucson");
  });
  it("config vieja sin claves del Tucson recibe defaults", () => {
    const c = sanitizeConfig({ gas_price: 3, mpg: 17, maintenance_cost_per_mile: 0.1 });
    expect(c.tucson_mpg).toBe(25);
    expect(c.mpg).toBe(17);
  });
});

describe("costos por vehículo", () => {
  it("mismo turno: Kia y Tucson dan costos distintos y correctos", () => {
    const kia = makeShift({ ...turno, vehiculo: "kia" });
    const tuc = makeShift({ ...turno, vehiculo: "tucson" });
    const cfgs = vehicleConfigs(CFG, []);
    const ek = routeEconomics(kia, cfgs.kia.config);
    const et = routeEconomics(tuc, cfgs.tucson.config);
    // Kia: 85/17*3 = 15.00 gas; 85*0.10 = 8.50 mant; neto 90-23.5 = 66.5
    expect(ek.fuel_cost).toBe(15);
    expect(ek.maintenance_est).toBe(8.5);
    expect(ek.net_profit).toBe(66.5);
    // Tucson: 85/25*3 = 10.20 gas; 85*0.05 = 4.25 mant; neto 75.55
    expect(et.fuel_cost).toBe(10.2);
    expect(et.maintenance_est).toBe(4.25);
    expect(et.net_profit).toBe(75.55);
  });

  it("aggregate con configFor usa el vehículo de cada registro", () => {
    const cfgs = vehicleConfigs(CFG, []);
    const rows = [makeShift({ ...turno, vehiculo: "kia" }), makeShift({ ...turno, vehiculo: "tucson" })];
    const t = aggregate(rows, CFG, null, (r) => cfgs[vehicleOf(r)].config).total;
    expect(t.net_profit).toBe(142.05);
  });

  it("ruta OnTrac vieja (sin vehiculo) sigue con los costos del Kia", () => {
    const r = finalizeRoute(
      { fecha: "2026-06-20", origen: "ontrac", paquetes: 100, paradas: 80, detalle: [] },
      { millas: 50, tarifa: 1.7 }
    );
    const cfgs = vehicleConfigs(CFG, []);
    const t = aggregate([r], CFG, null, (x) => cfgs[vehicleOf(x)].config).total;
    // 170 - 50/17*3 (8.82) - 5 = 156.18; igual que sin configFor
    expect(t.net_profit).toBe(aggregate([r], CFG).total.net_profit);
    expect(t.net_profit).toBe(156.18);
  });
});

describe("MPG real por vehículo", () => {
  it("solo usa los llenados del mismo carro", () => {
    const fu = [
      makeFuelup({ fecha: "2026-10-01", galones: 10, odometro: 90000, vehiculo: "kia" }),
      makeFuelup({ fecha: "2026-10-05", galones: 10, odometro: 90170, vehiculo: "kia" }),
      makeFuelup({ fecha: "2026-10-02", galones: 10, odometro: 15000, vehiculo: "tucson" }),
      makeFuelup({ fecha: "2026-10-06", galones: 10, odometro: 15280, vehiculo: "tucson" }),
    ];
    expect(vehicleConfig(CFG, fu, "kia").effInfo.mpg).toBe(17);
    expect(vehicleConfig(CFG, fu, "tucson").effInfo.mpg).toBe(28);
    expect(vehicleConfig(CFG, fu, "tucson").effInfo.source).toBe("real");
  });
  it("llenados viejos sin vehiculo cuentan para el Kia", () => {
    const viejo = { id: "x", fecha: "2026-09-01", galones: 10, odometro: 89000, costo: 30 };
    expect(forVehicle([viejo], "kia").length).toBe(1);
    expect(forVehicle([viejo], "tucson").length).toBe(0);
  });
  it("odómetro del Tucson menor que el del Kia se acepta", () => {
    const fu = [makeFuelup({ fecha: "2026-10-01", galones: 10, odometro: 90000, vehiculo: "kia" })];
    const nuevo = { galones: 9, odometro: 15000, fecha: "2026-10-02" };
    expect(validateFuelup(nuevo, forVehicle(fu, "tucson")).ok).toBe(true);
    expect(validateFuelup(nuevo, forVehicle(fu, "kia")).ok).toBe(false);
  });
  it("costo/milla histórico de mantenimiento no mezcla carros", () => {
    const mt = [
      makeMaint({ fecha: "2026-01-01", tipo: "oil", costo: 50, odometro: 80000, vehiculo: "kia" }),
      makeMaint({ fecha: "2026-06-01", tipo: "oil", costo: 50, odometro: 90000, vehiculo: "kia" }),
      makeMaint({ fecha: "2026-06-01", tipo: "oil", costo: 40, odometro: 15000, vehiculo: "tucson" }),
    ];
    expect(histMaintCostPerMile(forVehicle(mt, "kia")).span).toBe(10000);
    expect(histMaintCostPerMile(forVehicle(mt, "tucson"))).toBeNull();
  });
});

describe("odómetro en el turno", () => {
  it("millas = fin − inicio", () => {
    const s = makeShift({ ...turno, millas: "", odoInicio: "15000", odoFin: "15085.5" });
    expect(s.millas).toBe(85.5);
    expect(s.odoInicio).toBe(15000);
    expect(s.odoFin).toBe(15085.5);
  });
  it("fin ≤ inicio o solo uno → error", () => {
    expect(validateShift({ ...turno, odoInicio: "15085", odoFin: "15000" }).ok).toBe(false);
    expect(validateShift({ ...turno, odoInicio: "15000", odoFin: "15000" }).ok).toBe(false);
    expect(validateShift({ ...turno, odoInicio: "15000", odoFin: "" }).ok).toBe(false);
  });
  it("vehículo inválido → error; sin vehículo → kia", () => {
    expect(validateShift({ ...turno, vehiculo: "bmw" }).ok).toBe(false);
    expect(makeShift(turno).vehiculo).toBe("kia");
  });
});
