import { describe, it, expect, beforeEach } from "vitest";
import { makeMeal, validateMeal, mealSpendByPeriod, mealSpendForKey } from "../meals.js";

describe("makeMeal / validateMeal", () => {
  it("normaliza: tipo inválido → 'otro'; costo vacío → null", () => {
    const m = makeMeal({ fecha: "2026-06-27", tipo: "xxx", costo: "", nota: "sub" });
    expect(m.tipo).toBe("otro");
    expect(m.costo).toBe(null);
    expect(m.nota).toBe("sub");
    expect(m.id).toBeTruthy();
  });

  it("valida fecha, tipo y costo", () => {
    expect(validateMeal({ fecha: "no", tipo: "almuerzo" }).ok).toBe(false);
    expect(validateMeal({ fecha: "2026-06-27", tipo: "xxx" }).ok).toBe(false);
    expect(validateMeal({ fecha: "2026-06-27", tipo: "almuerzo", costo: -3 }).ok).toBe(false);
    expect(validateMeal({ fecha: "2026-06-27", tipo: "almuerzo", costo: "abc" }).ok).toBe(false);
    expect(validateMeal({ fecha: "2026-06-27", tipo: "almuerzo" }).ok).toBe(true); // sin costo ok
    expect(validateMeal({ fecha: "2026-06-27", tipo: "merienda", costo: 8 }).ok).toBe(true);
  });
});

describe("mealSpendByPeriod / mealSpendForKey", () => {
  const meals = [
    { fecha: "2026-06-27", costo: 12 }, // sáb → semana 2026-06-27, mes 2026-06
    { fecha: "2026-06-28", costo: 8 }, // dom → misma semana de pago
    { fecha: "2026-07-04", costo: 10 }, // sáb → semana 2026-07-04, mes 2026-07
    { fecha: "2026-07-05", costo: null }, // sin costo → excluido (no $0)
  ];

  it("0/1 entradas no crashean", () => {
    expect(mealSpendByPeriod([]).total).toBe(0);
    expect(mealSpendByPeriod([{ fecha: "2026-06-27", costo: 5 }]).total).toBe(5);
  });

  it("excluye sin costo (nunca $0) y agrupa por semana (sáb→vie)/mes", () => {
    const r = mealSpendByPeriod(meals, 6);
    expect(r.total).toBe(30); // 12+8+10 (el null no cuenta)
    expect(r.conCosto).toBe(3);
    expect(r.sinCosto).toBe(1);
    expect(r.count).toBe(4);
    expect(r.porSemana.find((w) => w.key === "2026-06-27").gasto).toBe(20);
    expect(r.porSemana.find((w) => w.key === "2026-07-04").gasto).toBe(10);
    expect(r.porMes.find((m) => m.key === "2026-06").gasto).toBe(20);
    expect(r.porMes.find((m) => m.key === "2026-07").gasto).toBe(10);
  });

  it("mealSpendForKey suma solo el período pedido", () => {
    expect(mealSpendForKey(meals, "2026-06-27", 6)).toBe(20); // clave de semana (fecha inicio)
    expect(mealSpendForKey(meals, "2026-06", 6)).toBe(20); // clave de mes
    expect(mealSpendForKey(meals, "2026-07-04", 6)).toBe(10);
    expect(mealSpendForKey([], "2026-06", 6)).toBe(0);
  });

  it("costo no numérico nunca produce NaN", () => {
    const r = mealSpendByPeriod([{ fecha: "2026-06-27", costo: "abc" }], 6);
    expect(r.total).toBe(0);
    expect(r.sinCosto).toBe(1);
    expect(Number.isNaN(r.total)).toBe(false);
  });
});

describe("backup con comidas (localStorage simulado)", () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });

  it("incluye comidas; backup viejo sin comidas → []", async () => {
    const storage = await import("../storage.js");
    const backup = await import("../backup.js");
    await storage.saveJSON("ruta_meals_v1", [makeMeal({ fecha: "2026-06-27", tipo: "almuerzo", costo: 12 })]);
    const b = await backup.buildBackup();
    expect(b.data.comidas).toHaveLength(1);
    // Restaurar backup VIEJO (sin comidas) → queda []
    const viejo = { type: "ruta-backup", schemaVersion: 1, data: { codigos: [], rutas: [] } };
    const res = await backup.restoreBackup(JSON.stringify(viejo));
    expect(res.comidas).toBe(0);
    expect(await storage.loadJSON("ruta_meals_v1", null)).toEqual([]);
  });
});
