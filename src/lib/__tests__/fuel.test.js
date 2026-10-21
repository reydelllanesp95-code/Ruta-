import { describe, it, expect, beforeEach } from "vitest";
import {
  validateFuelup,
  maxOdometro,
  validPairs,
  tankMpgById,
  realMpg,
  effectiveMpg,
  makeFuelup,
  avgDaysBetweenFillups,
  fuelSpendByPeriod,
} from "../fuel.js";
import { DEFAULT_CONFIG } from "../constants.js";

describe("validateFuelup", () => {
  it("galones <= 0 o no numérico → error", () => {
    expect(validateFuelup({ galones: 0, odometro: 100 }, null).ok).toBe(false);
    expect(validateFuelup({ galones: "x", odometro: 100 }, null).ok).toBe(false);
  });
  it("odómetro <= anterior → error con aviso claro [ajuste 3]", () => {
    const r = validateFuelup({ galones: 10, odometro: 900 }, 1000);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/odómetro/i);
    expect(validateFuelup({ galones: 10, odometro: 1000 }, 1000).ok).toBe(false); // igual
  });
  it("válido cuando crece", () => {
    expect(validateFuelup({ galones: 10, odometro: 1100 }, 1000).ok).toBe(true);
    expect(validateFuelup({ galones: 10, odometro: 50 }, null).ok).toBe(true); // primer llenado
  });
});

describe("maxOdometro", () => {
  it("devuelve el mayor o null", () => {
    expect(maxOdometro([])).toBe(null);
    expect(maxOdometro([{ odometro: 100 }, { odometro: 500 }, { odometro: 300 }])).toBe(500);
  });
});

describe("validPairs / realMpg (tanque a tanque)", () => {
  it("0 o 1 llenados → sin MPG (null), no crashea", () => {
    expect(realMpg([])).toBe(null);
    expect(realMpg([{ odometro: 1000, galones: 10 }])).toBe(null);
  });
  it("2 llenados válidos → mpg del par", () => {
    const fu = [
      { odometro: 1000, galones: 10 },
      { odometro: 1200, galones: 10 },
    ];
    expect(realMpg(fu)).toBe(20); // (1200-1000)/10
  });
  it("ordena por odómetro; millas totales ÷ galones totales; lastN toma los últimos", () => {
    const fu = [
      { odometro: 1500, galones: 20 }, // desordenado a propósito
      { odometro: 1000, galones: 10 },
      { odometro: 1200, galones: 10 },
    ];
    // pares: 1000→1200 (200 mi/10 gal), 1200→1500 (300 mi/20 gal) → 500/30 = 16.7
    expect(realMpg(fu)).toBe(16.7);
    expect(realMpg(fu, 1)).toBe(15); // último par
  });
  it("descarta galones=0 y odómetro no creciente", () => {
    const fu = [
      { odometro: 1000, galones: 10 },
      { odometro: 1000, galones: 10 }, // odómetro igual → par inválido
      { odometro: 1200, galones: 0 }, // galones 0 → par inválido
      { odometro: 1400, galones: 10 }, // 1200→1400 válido = 20
    ];
    expect(validPairs(fu).length).toBe(1);
    expect(realMpg(fu)).toBe(20);
  });
});

describe("tanques imposibles (no lleno / llenado sin apuntar)", () => {
  // Sintético: tanques normales de ~18 mpg y uno de 400 mi con 7.8 gal (51.3).
  const fu = [
    { id: "a", odometro: 10000, galones: 15 },
    { id: "b", odometro: 10270, galones: 15 }, // 18
    { id: "c", odometro: 10670, galones: 7.8 }, // 51.3 → no cuenta
    { id: "d", odometro: 10940, galones: 15 }, // 18
  ];
  it("no cuentan para el MPG real y se marcan para revisar", () => {
    expect(realMpg(fu)).toBe(18);
    const t = tankMpgById(fu);
    expect(t.c).toEqual({ mpg: 51.3, plausible: false });
    expect(t.b.plausible).toBe(true);
    expect(t.a).toBeUndefined();
  });
  it("si todos son imposibles, cae al MPG asumido", () => {
    const e = effectiveMpg(DEFAULT_CONFIG, fu.slice(1, 3));
    expect(e.source).toBe("assumed");
    expect(e.mpg).toBe(DEFAULT_CONFIG.mpg);
  });
});

describe("effectiveMpg [ajustes 1 y 2: derivado]", () => {
  it("usa MPG real si hay datos suficientes", () => {
    const fu = [
      { odometro: 1000, galones: 10 },
      { odometro: 1152, galones: 10 }, // 15.2 mpg
    ];
    const e = effectiveMpg(DEFAULT_CONFIG, fu);
    expect(e.source).toBe("real");
    expect(e.mpg).toBe(15.2);
    expect(e.real).toBe(15.2);
  });
  it("cae al MPG asumido sin datos suficientes", () => {
    const e = effectiveMpg(DEFAULT_CONFIG, []);
    expect(e.source).toBe("assumed");
    expect(e.mpg).toBe(DEFAULT_CONFIG.mpg);
    expect(e.real).toBe(null);
  });
});

describe("insights de gasolina [Fase 3B]", () => {
  it("avgDaysBetweenFillups: < 2 fechas → null; si no, promedio", () => {
    expect(avgDaysBetweenFillups([])).toBe(null);
    expect(avgDaysBetweenFillups([{ fecha: "2026-06-01" }])).toBe(null);
    // 01, 05, 09 → intervalos 4 y 4 → promedio 4
    const fu = [{ fecha: "2026-06-01" }, { fecha: "2026-06-05" }, { fecha: "2026-06-09" }];
    expect(avgDaysBetweenFillups(fu)).toBe(4);
  });

  it("fuelSpendByPeriod: excluye sin costo (no $0) y agrupa por semana/mes", () => {
    const fu = [
      { fecha: "2026-06-27", costo: 40 }, // sáb → semana 2026-06-27
      { fecha: "2026-06-28", costo: 30 }, // dom → misma semana de pago
      { fecha: "2026-07-04", costo: 20 }, // sáb → semana siguiente
      { fecha: "2026-07-05", costo: null }, // sin costo → excluido
    ];
    const r = fuelSpendByPeriod(fu, 6);
    expect(r.total).toBe(90); // 40+30+20 (el null no cuenta como 0)
    expect(r.conCosto).toBe(3);
    expect(r.sinCosto).toBe(1);
    expect(r.porSemana.find((w) => w.key === "2026-06-27").gasto).toBe(70);
    expect(r.porSemana.find((w) => w.key === "2026-07-04").gasto).toBe(20);
    expect(r.porMes.find((m) => m.key === "2026-06").gasto).toBe(70);
    expect(r.porMes.find((m) => m.key === "2026-07").gasto).toBe(20);
  });
});

describe("backup con fuelups (localStorage simulado)", () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });

  it("incluye fuelups; backup viejo sin fuelups → []", async () => {
    const storage = await import("../storage.js");
    const backup = await import("../backup.js");
    await storage.saveJSON("ruta_fuelups_v1", [makeFuelup({ fecha: "2026-06-27", galones: 10, odometro: 1000 })]);
    const b = await backup.buildBackup();
    expect(b.data.fuelups).toHaveLength(1);
    // Restaurar backup VIEJO (sin fuelups) → queda []
    const viejo = { type: "ruta-backup", schemaVersion: 1, data: { codigos: [], rutas: [] } };
    const res = await backup.restoreBackup(JSON.stringify(viejo));
    expect(res.fuelups).toBe(0);
    expect(await storage.loadJSON("ruta_fuelups_v1", null)).toEqual([]);
  });
});
