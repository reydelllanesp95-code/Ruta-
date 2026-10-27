import { describe, it, expect, beforeEach } from "vitest";
import {
  validateFuelup,
  maxOdometro,
  validPairs,
  fillInfoById,
  realMpg,
  effectiveMpg,
  makeFuelup,
  avgDaysBetweenFillups,
  fuelSpendByPeriod,
} from "../fuel.js";
import { DEFAULT_CONFIG } from "../constants.js";

describe("validateFuelup", () => {
  const fu = [
    { fecha: "2026-06-01", odometro: 1000, galones: 10 },
    { fecha: "2026-06-05", odometro: 1300, galones: 10 },
  ];
  it("galones <= 0 o no numérico → error", () => {
    expect(validateFuelup({ galones: 0, odometro: 100 }, []).ok).toBe(false);
    expect(validateFuelup({ galones: "x", odometro: 100 }, []).ok).toBe(false);
  });
  it("primer llenado y llenado nuevo al final → válido", () => {
    expect(validateFuelup({ galones: 10, odometro: 50, fecha: "2026-06-01" }, []).ok).toBe(true);
    expect(validateFuelup({ galones: 10, odometro: 1500, fecha: "2026-06-08" }, fu).ok).toBe(true);
  });
  it("llenado atrasado con odómetro en medio → válido", () => {
    expect(validateFuelup({ galones: 5, odometro: 1150, fecha: "2026-06-03" }, fu).ok).toBe(true);
  });
  it("odómetro que contradice el orden por fecha → error que nombra el llenado", () => {
    const r1 = validateFuelup({ galones: 5, odometro: 1400, fecha: "2026-06-03" }, fu);
    expect(r1.ok).toBe(false);
    expect(r1.error).toMatch(/2026-06-05/);
    const r2 = validateFuelup({ galones: 5, odometro: 900, fecha: "2026-06-03" }, fu);
    expect(r2.ok).toBe(false);
    expect(r2.error).toMatch(/2026-06-01/);
    expect(validateFuelup({ galones: 5, odometro: 1200, fecha: "2026-06-10" }, fu).ok).toBe(false);
  });
  it("odómetro repetido → error", () => {
    expect(validateFuelup({ galones: 5, odometro: 1300, fecha: "2026-06-06" }, fu).ok).toBe(false);
  });
});

describe("maxOdometro", () => {
  it("devuelve el mayor o null", () => {
    expect(maxOdometro([])).toBe(null);
    expect(maxOdometro([{ odometro: 100 }, { odometro: 500 }, { odometro: 300 }])).toBe(500);
  });
});

describe("validPairs / realMpg (por tramos)", () => {
  it("0 o 1 llenados → sin MPG (null), no crashea", () => {
    expect(realMpg([])).toBe(null);
    expect(realMpg([{ odometro: 1000, galones: 10 }])).toBe(null);
  });
  it("2 llenados válidos → mpg del par", () => {
    const fu = [
      { odometro: 1000, galones: 10 },
      { odometro: 1200, galones: 10 },
    ];
    expect(realMpg(fu)).toBe(20);
  });
  it("ordena por odómetro; millas totales ÷ galones totales", () => {
    const fu = [
      { odometro: 1500, galones: 20 },
      { odometro: 1000, galones: 10 },
      { odometro: 1200, galones: 10 },
    ];
    expect(realMpg(fu)).toBe(16.7); // 500 / 30
  });
  it("descarta galones=0 y odómetro no creciente", () => {
    const fu = [
      { odometro: 1000, galones: 10 },
      { odometro: 1000, galones: 10 },
      { odometro: 1200, galones: 0 },
      { odometro: 1400, galones: 10 },
    ];
    expect(validPairs(fu).length).toBe(1);
    expect(realMpg(fu)).toBe(20);
  });
});

describe("llenados parciales de distinto tamaño (criterio 3)", () => {
  // Sintético a ~22 mpg: unas veces $20, otras $40; cada par suelto da
  // valores absurdos (hasta 60+), pero el tramo no.
  const fu = [
    { id: "a", odometro: 20000, galones: 5 },
    { id: "b", odometro: 20090, galones: 5 }, // 18
    { id: "c", odometro: 20130, galones: 10 }, // 4
    { id: "d", odometro: 20430, galones: 5 }, // 60
    { id: "e", odometro: 20560, galones: 7 }, // 18.6
    { id: "f", odometro: 20640, galones: 5 }, // 16
    { id: "g", odometro: 20800, galones: 5 }, // 32
  ];
  it("el MPG real queda entre 20 y 24", () => {
    const m = realMpg(fu);
    expect(m).toBeGreaterThanOrEqual(20);
    expect(m).toBeLessThanOrEqual(24);
  });
  it("con más de 1000 millas recientes, ignora lo más viejo", () => {
    // Al principio, un tramo antiguo a ~10 mpg; luego ~1100 mi a 20 mpg.
    const largo = [
      { odometro: 1000, galones: 10 },
      { odometro: 1300, galones: 30 }, // 10 mpg, viejo
      { odometro: 1700, galones: 20 },
      { odometro: 2100, galones: 20 },
      { odometro: 2400, galones: 15 },
    ];
    expect(realMpg(largo)).toBe(20); // 1100 / 55
  });
});

describe("huecos (llenados sin apuntar)", () => {
  const fu = [
    { id: "a", odometro: 10000, galones: 10 },
    { id: "b", odometro: 10200, galones: 10 }, // 20
    { id: "c", odometro: 13000, galones: 5 }, // hueco de 2800 mi
    { id: "d", odometro: 13220, galones: 10 }, // 22
  ];
  it("se marca y no cruza al cálculo", () => {
    expect(realMpg(fu)).toBe(22);
    const t = fillInfoById(fu);
    expect(t.c).toEqual({ millas: 2800, gap: true });
    expect(t.d).toEqual({ millas: 220, gap: false });
    expect(t.a).toBeUndefined();
  });
  it("si el tramo da imposible (fuera de 8–45), cae al MPG asumido", () => {
    const raro = [
      { odometro: 1000, galones: 10 },
      { odometro: 1500, galones: 5 }, // 100 mpg
    ];
    expect(realMpg(raro)).toBe(null);
    const e = effectiveMpg(DEFAULT_CONFIG, raro);
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
