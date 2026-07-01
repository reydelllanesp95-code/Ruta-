import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseDatePart,
  dateFromFilename,
  weekKey,
  monthKey,
  isoWeek,
  payWeekStart,
  payWeekEnd,
  payWeekKey,
  payWeekLabel,
  currentPayWeekKey,
  monthLabel,
  computeHuella,
  validateNonNegative,
  validateRouteInputs,
  finalizeRoute,
  aggregate,
  totalsForKey,
  round2,
  fuelCost,
  maintenanceEst,
  netProfit,
  costPerMile,
  routeEconomics,
} from "../earnings.js";

describe("fechas", () => {
  it("parseDatePart con varios formatos", () => {
    expect(parseDatePart("2026-06-27T12:20:35")).toBe("2026-06-27");
    expect(parseDatePart("2026-06-27")).toBe("2026-06-27");
    expect(parseDatePart("2026/6/7")).toBe("2026-06-07");
    expect(parseDatePart("06/27/2026")).toBe("2026-06-27");
    expect(parseDatePart("")).toBeNull();
    expect(parseDatePart("basura")).toBeNull();
  });

  it("dateFromFilename con guiones y sin guiones", () => {
    expect(dateFromFilename("manifest_2026-06-27.csv")).toBe("2026-06-27");
    expect(dateFromFilename("manifest_20260627_x.zip")).toBe("2026-06-27");
    expect(dateFromFilename("sin fecha.csv")).toBeNull();
  });

  it("semana ISO y mes", () => {
    expect(monthKey("2026-06-27")).toBe("2026-06");
    expect(weekKey("2026-06-27")).toBe("2026-W26");
    // frontera: 2026-01-01 es jueves -> semana 1
    expect(isoWeek("2026-01-01").week).toBe(1);
    // lunes y domingo de la misma semana ISO comparten clave
    expect(weekKey("2026-06-22")).toBe(weekKey("2026-06-28"));
  });
});

describe("hash / huella", () => {
  it("misma huella sin importar orden de barcodes", () => {
    const a = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["A", "B"] }] };
    const b = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["B", "A"] }] };
    expect(computeHuella(a)).toBe(computeHuella(b));
  });
  it("huella distinta para contenido distinto", () => {
    const a = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["A"] }] };
    const b = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["Z"] }] };
    expect(computeHuella(a)).not.toBe(computeHuella(b));
  });
});

describe("validación", () => {
  it("rechaza texto y negativos", () => {
    expect(validateNonNegative("abc", "X").ok).toBe(false);
    expect(validateNonNegative("-3", "X").ok).toBe(false);
    expect(validateNonNegative("12.5", "X")).toEqual({ ok: true, value: 12.5 });
    expect(validateNonNegative("", "X")).toEqual({ ok: true, value: 0 });
  });
  it("validateRouteInputs junta errores", () => {
    const r = validateRouteInputs({ millas: "-1", tarifa: "x" });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBe(2);
  });
});

describe("finalizeRoute y agregaciones", () => {
  const preview = {
    fecha: "2026-06-27",
    origen: "ontrac",
    paquetes: 10,
    paradas: 8,
    detalle: [{ barcodes: ["A", "B"] }],
  };

  it("congela ganancia = paquetes * tarifa", () => {
    const r = finalizeRoute(preview, { millas: 50, tarifa: 1.7 });
    expect(r.ganancia).toBe(round2(10 * 1.7));
    expect(r.millas).toBe(50);
    expect(r.tarifaUsada).toBe(1.7);
    expect(r.id).toBeTruthy();
    expect(r.huella).toBeTruthy();
  });

  it("agrega por semana y por mes", () => {
    const routes = [
      finalizeRoute({ ...preview, fecha: "2026-06-27", paquetes: 10 }, { millas: 50, tarifa: 1.7 }),
      finalizeRoute({ ...preview, fecha: "2026-06-28", paquetes: 5 }, { millas: 20, tarifa: 1.7 }),
      finalizeRoute({ ...preview, fecha: "2026-07-01", paquetes: 4 }, { millas: 10, tarifa: 2 }),
    ];
    const agg = aggregate(routes);
    expect(agg.total.paquetes).toBe(19);
    expect(agg.total.millas).toBe(80);
    // junio: 15 paquetes; julio: 4
    expect(totalsForKey(agg.porMes, "2026-06").paquetes).toBe(15);
    expect(totalsForKey(agg.porMes, "2026-07").paquetes).toBe(4);
    // Semana de PAGO sáb→vie: 27 jun (sáb), 28 jun (dom) y 1 jul (mié) caen todas
    // en la semana que inicia el sábado 27 jun → una sola semana con 19 paquetes.
    expect(totalsForKey(agg.porSemana, "2026-06-27").paquetes).toBe(19);
  });
});

describe("semana de pago (sábado→viernes)", () => {
  it("payWeekStart mueve al sábado; payWeekEnd es el viernes de cierre", () => {
    expect(payWeekStart("2026-06-27")).toBe("2026-06-27"); // sábado
    expect(payWeekStart("2026-06-28")).toBe("2026-06-27"); // domingo → mismo
    expect(payWeekStart("2026-07-01")).toBe("2026-06-27"); // miércoles → mismo
    expect(payWeekStart("2026-07-03")).toBe("2026-06-27"); // viernes (cierre)
    expect(payWeekStart("2026-07-04")).toBe("2026-07-04"); // sábado siguiente
    expect(payWeekEnd("2026-06-27")).toBe("2026-07-03"); // viernes
    expect(payWeekKey("2026-06-30")).toBe("2026-06-27");
  });

  it("payWeekLabel y monthLabel legibles", () => {
    expect(payWeekLabel("2026-06-27")).toBe("27 jun – 3 jul");
    expect(monthLabel("2026-06")).toBe("junio 2026");
  });

  it("respeta pay_week_start_day de la config (ej. domingo=0)", () => {
    const routes = [
      finalizeRoute({ fecha: "2026-06-27", origen: "ontrac", paquetes: 3, paradas: 3, detalle: [] }, { millas: 0, tarifa: 1.7 }),
      finalizeRoute({ fecha: "2026-06-28", origen: "ontrac", paquetes: 2, paradas: 2, detalle: [] }, { millas: 0, tarifa: 1.7 }),
    ];
    // Con inicio domingo, el 27 (sáb) y el 28 (dom) quedan en semanas distintas.
    const cfg = { gas_price: 3.2, mpg: 17, maintenance_cost_per_mile: 0.1, pay_week_start_day: 0 };
    const agg = aggregate(routes, cfg);
    expect(agg.porSemana).toHaveLength(2);
  });
});

describe("almacenamiento y respaldo (con localStorage simulado)", () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });

  it("guarda y carga JSON con versionado", async () => {
    const storage = await import("../storage.js");
    await storage.saveJSON("k", { a: 1 });
    expect(await storage.loadJSON("k", null)).toEqual({ a: 1 });
  });

  it("respaldo round-trip", async () => {
    const storage = await import("../storage.js");
    const backup = await import("../backup.js");
    await storage.saveJSON("route_earnings_v1", [{ id: "1", fecha: "2026-06-27" }]);
    await storage.saveJSON("gate_codes_v3", [{ id: "c1" }]);
    const b = await backup.buildBackup();
    expect(b.data.rutas).toHaveLength(1);
    // borrar y restaurar
    await storage.saveJSON("route_earnings_v1", []);
    const res = await backup.restoreBackup(JSON.stringify(b));
    expect(res.rutas).toBe(1);
    expect(await storage.loadJSON("route_earnings_v1", [])).toHaveLength(1);
  });

  it("set lanza si localStorage falla", async () => {
    global.localStorage.setItem = () => {
      throw new Error("lleno");
    };
    const storage = await import("../storage.js");
    await expect(storage.saveJSON("k", { a: 1 })).rejects.toThrow();
  });

  it("backup nuevo incluye config; backup viejo (sin config) restaura con default", async () => {
    const storage = await import("../storage.js");
    const backup = await import("../backup.js");
    const { loadConfig } = await import("../config.js");
    // Backup nuevo
    await storage.saveJSON("route_earnings_v1", []);
    await storage.saveJSON("gate_codes_v3", []);
    const { saveConfig } = await import("../config.js");
    await saveConfig({ gas_price: 4.1, mpg: 18, maintenance_cost_per_mile: 0.12 });
    const b = await backup.buildBackup();
    expect(b.data.config.gas_price).toBe(4.1);
    // Backup VIEJO: solo codigos+rutas (sin config)
    const viejo = { type: "ruta-backup", schemaVersion: 1, data: { codigos: [], rutas: [] } };
    const res = await backup.restoreBackup(JSON.stringify(viejo));
    expect(res.config).toBe(false); // no venía config
    const cfg = await loadConfig();
    expect(cfg.mpg).toBe(18); // config previa se mantiene, no se borra
  });
});

// ---- Datos derivados de costo (Fase 1: ganancia neta) ----
describe("costos derivados (fuel / mantenimiento / neto / $ por milla)", () => {
  it("fuelCost = millas/mpg*precio, con guardas", () => {
    expect(fuelCost(100, 17, 3.4)).toBe(round2((100 / 17) * 3.4));
    expect(fuelCost(0, 17, 3.4)).toBe(0); // millas=0
    expect(fuelCost(100, 0, 3.4)).toBe(0); // mpg 0
    expect(fuelCost(100, null, 3.4)).toBe(0); // mpg null
    expect(fuelCost(100, 17, undefined)).toBe(0); // gas faltante
    expect(fuelCost("x", 17, 3.4)).toBe(0); // no numérico
    expect(Number.isNaN(fuelCost(100, 0, 0))).toBe(false);
  });

  it("maintenanceEst = millas*perMile", () => {
    expect(maintenanceEst(50, 0.1)).toBe(5);
    expect(maintenanceEst(0, 0.1)).toBe(0);
    expect(maintenanceEst(50, 0)).toBe(0);
    expect(maintenanceEst(50, "x")).toBe(0);
  });

  it("netProfit = bruta - fuel - mant", () => {
    expect(netProfit(166.6, 20, 5)).toBe(141.6);
    expect(netProfit(100, 0, 0)).toBe(100);
  });

  it("costPerMile con millas=0 → 0 (sin NaN/Infinity)", () => {
    expect(costPerMile(20, 5, 0)).toBe(0);
    expect(costPerMile(20, 5, 100)).toBe(round2(25 / 100));
  });

  it("routeEconomics devuelve el desglose completo", () => {
    const route = { millas: 100, ganancia: 166.6 };
    const cfg = { gas_price: 3.4, mpg: 17, maintenance_cost_per_mile: 0.1 };
    const eco = routeEconomics(route, cfg);
    expect(eco.fuel_cost).toBe(round2((100 / 17) * 3.4));
    expect(eco.maintenance_est).toBe(10);
    expect(eco.net_profit).toBe(round2(166.6 - eco.fuel_cost - 10));
    expect(eco.cost_per_mile).toBe(round2((eco.fuel_cost + 10) / 100));
  });

  it("aggregate(routes, config) suma neto/gas/mant y no rompe los campos previos", () => {
    const cfg = { gas_price: 3.4, mpg: 17, maintenance_cost_per_mile: 0.1 };
    const routes = [
      finalizeRoute({ fecha: "2026-06-27", origen: "ontrac", paquetes: 98, paradas: 94, detalle: [] }, { millas: 100, tarifa: 1.7 }),
      finalizeRoute({ fecha: "2026-06-28", origen: "ontrac", paquetes: 50, paradas: 48, detalle: [] }, { millas: 40, tarifa: 1.7 }),
    ];
    const agg = aggregate(routes, cfg);
    expect(agg.total.paquetes).toBe(148); // campo previo intacto
    expect(agg.total.millas).toBe(140);
    // neto = bruta - gas - mant, sumado
    const gas = fuelCost(100, 17, 3.4) + fuelCost(40, 17, 3.4);
    const mant = maintenanceEst(100, 0.1) + maintenanceEst(40, 0.1);
    expect(agg.total.fuel_cost).toBe(round2(gas));
    expect(agg.total.maintenance_est).toBe(round2(mant));
    expect(agg.total.cost_per_mile).toBe(round2((agg.total.fuel_cost + agg.total.maintenance_est) / 140));
  });

  it("aggregate sin config sigue funcionando (retrocompat)", () => {
    const routes = [
      finalizeRoute({ fecha: "2026-06-27", origen: "ontrac", paquetes: 10, paradas: 8, detalle: [] }, { millas: 5, tarifa: 1.7 }),
    ];
    const agg = aggregate(routes); // sin config
    expect(agg.total.paquetes).toBe(10);
    expect(typeof agg.total.net_profit).toBe("number");
  });
});
