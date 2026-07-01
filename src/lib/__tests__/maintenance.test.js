import { describe, it, expect } from "vitest";
import {
  makeMaint,
  validateMaint,
  costSummary,
  maintByMonth,
  histMaintCostPerMile,
} from "../maintenance.js";

describe("makeMaint / validateMaint", () => {
  it("normaliza tipo inválido a repair y costo/odómetro vacíos a null", () => {
    const m = makeMaint({ fecha: "2026-06-01", tipo: "xxx", costo: "", odometro: "" });
    expect(m.tipo).toBe("repair");
    expect(m.costo).toBe(null);
    expect(m.odometro).toBe(null);
  });
  it("valida fecha y números >= 0", () => {
    expect(validateMaint({ fecha: "malo" }).ok).toBe(false);
    expect(validateMaint({ fecha: "2026-06-01", costo: -1 }).ok).toBe(false);
    expect(validateMaint({ fecha: "2026-06-01", odometro: -5 }).ok).toBe(false);
    expect(validateMaint({ fecha: "2026-06-01", costo: 50, odometro: 100000 }).ok).toBe(true);
    expect(validateMaint({ fecha: "2026-06-01" }).ok).toBe(true); // costo/odómetro opcionales
  });
});

describe("costSummary", () => {
  it("excluye los sin costo y los cuenta (nunca $0)", () => {
    const items = [{ costo: 50 }, { costo: null }, { costo: 30 }, { costo: undefined }];
    expect(costSummary(items)).toEqual({ total: 80, conCosto: 2, sinCosto: 2, count: 4 });
  });
});

describe("maintByMonth", () => {
  it("agrupa por mes solo los que tienen costo", () => {
    const items = [
      { fecha: "2026-06-03", costo: 40 },
      { fecha: "2026-06-20", costo: 60 },
      { fecha: "2026-07-01", costo: 25 },
      { fecha: "2026-07-05", costo: null }, // sin costo → no cuenta
    ];
    const r = maintByMonth(items);
    expect(r.find((x) => x.key === "2026-06").total).toBe(100);
    expect(r.find((x) => x.key === "2026-07").total).toBe(25);
  });
});

describe("histMaintCostPerMile (estimación)", () => {
  it("null con < 2 odómetros o span 0 o sin costo", () => {
    expect(histMaintCostPerMile([])).toBe(null);
    expect(histMaintCostPerMile([{ odometro: 1000, costo: 50 }])).toBe(null);
    expect(histMaintCostPerMile([{ odometro: 1000, costo: 50 }, { odometro: 1000, costo: 20 }])).toBe(null); // span 0
    expect(histMaintCostPerMile([{ odometro: 1000 }, { odometro: 5000 }])).toBe(null); // sin costo
  });
  it("calcula costo/milla sobre el span de odómetro y reporta sin costo", () => {
    const items = [
      { odometro: 100000, costo: 50 },
      { odometro: 105000, costo: 100 }, // span 5000, total 150
      { odometro: 103000, costo: null }, // sin costo (excluido del total)
    ];
    const r = histMaintCostPerMile(items);
    expect(r.span).toBe(5000);
    expect(r.totalCost).toBe(150);
    expect(r.costPerMile).toBe(0.03); // 150 / 5000
    expect(r.sinCosto).toBe(1);
    expect(r.estimacion).toBe(true);
  });
});
