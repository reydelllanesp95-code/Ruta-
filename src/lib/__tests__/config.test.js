import { describe, it, expect, beforeEach } from "vitest";
import { sanitizeConfig } from "../config.js";
import { DEFAULT_CONFIG } from "../constants.js";

describe("sanitizeConfig", () => {
  it("usa defaults con entrada nula/vacía", () => {
    expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig(undefined)).toEqual(DEFAULT_CONFIG);
    expect(sanitizeConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it("rechaza mpg 0/negativo/no-numérico (usa default)", () => {
    expect(sanitizeConfig({ mpg: 0 }).mpg).toBe(DEFAULT_CONFIG.mpg);
    expect(sanitizeConfig({ mpg: -5 }).mpg).toBe(DEFAULT_CONFIG.mpg);
    expect(sanitizeConfig({ mpg: "abc" }).mpg).toBe(DEFAULT_CONFIG.mpg);
    expect(sanitizeConfig({ mpg: 22 }).mpg).toBe(22);
  });

  it("gas_price y mantenimiento: negativos/no-numéricos → default; 0 es válido", () => {
    expect(sanitizeConfig({ gas_price: -1 }).gas_price).toBe(DEFAULT_CONFIG.gas_price);
    expect(sanitizeConfig({ gas_price: "x" }).gas_price).toBe(DEFAULT_CONFIG.gas_price);
    expect(sanitizeConfig({ gas_price: 0 }).gas_price).toBe(0);
    expect(sanitizeConfig({ maintenance_cost_per_mile: 0.15 }).maintenance_cost_per_mile).toBe(0.15);
  });
});

describe("loadConfig / saveConfig (localStorage simulado)", () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });

  it("sin config guardada devuelve defaults", async () => {
    const { loadConfig } = await import("../config.js");
    expect(await loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("guarda y recarga saneado", async () => {
    const { loadConfig, saveConfig } = await import("../config.js");
    await saveConfig({ gas_price: 3.5, mpg: 0, maintenance_cost_per_mile: 0.2 });
    const c = await loadConfig();
    expect(c.gas_price).toBe(3.5);
    expect(c.mpg).toBe(DEFAULT_CONFIG.mpg); // 0 → default
    expect(c.maintenance_cost_per_mile).toBe(0.2);
  });
});

describe("migración 1 → 2 (meta semanal v2)", () => {
  it("borra los umbrales viejos de la config y pone los nuevos por defecto", async () => {
    const { migrate } = await import("../storage.js");
    const { KEY_CONFIG } = await import("../constants.js");
    const v1 = { schemaVersion: 1, data: { mpg: 20, meta_basico: 250, meta_invertir: 300, meta_dorado: 900, meta_deuda: 350, meta_inversion: 100, meta_trading_pct: 5 } };
    const data = migrate(v1, KEY_CONFIG);
    expect(data).toEqual({ mpg: 20 });
    const c = sanitizeConfig(data);
    expect([c.meta_colchon, c.meta_deuda_semana, c.meta_extra, c.fondo_tope]).toEqual([80, 680, 40, 500]);
    expect(c.meta_inversiones.reduce((s, x) => s + x.monto, 0)).toBe(100);
    // Otras claves no se tocan.
    expect(migrate({ schemaVersion: 1, data: [{ a: 1 }] }, "route_earnings_v1")).toEqual([{ a: 1 }]);
  });
});
