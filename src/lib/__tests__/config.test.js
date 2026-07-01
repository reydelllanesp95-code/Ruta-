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
