import { describe, it, expect } from "vitest";
import { cambioTarjetas } from "../meta.js";

const t = (id) => ({ id, nombre: id, fase: 1, diaCierre: 31, apr: 0 });
const c = (tarjetaId, fecha, saldo) => ({ id: tarjetaId + fecha, tarjetaId, fecha, saldo });

describe("cambio de cada tarjeta vs el mes pasado", () => {
  it("bajó: −$120 vs octubre", () => {
    const r = cambioTarjetas({ tarjetas: [t("a")], cierres: [c("a", "2026-10-31", 1000), c("a", "2026-11-30", 880)] }, "2026-11-30");
    expect(r.a).toEqual({ diff: -120, mes: "octubre", texto: "−$120.00 vs octubre" });
  });
  it("subió: +$40 vs octubre; igual: igual que octubre", () => {
    const r = cambioTarjetas({ tarjetas: [t("a"), t("b")], cierres: [c("a", "2026-10-31", 100), c("a", "2026-11-30", 140), c("b", "2026-10-31", 50), c("b", "2026-11-30", 50)] }, "2026-11-30");
    expect(r.a.texto).toBe("+$40.00 vs octubre");
    expect(r.b.texto).toBe("igual que octubre");
  });
  it("un saldo a mitad de mes no cuenta como mes pasado", () => {
    const r = cambioTarjetas({ tarjetas: [t("a")], cierres: [c("a", "2026-10-31", 1000), c("a", "2026-11-15", 950), c("a", "2026-11-30", 900)] }, "2026-11-30");
    expect(r.a.diff).toBe(-100);
    expect(r.a.mes).toBe("octubre");
  });
  it("con un solo mes de saldos no hay comparación", () => {
    const r = cambioTarjetas({ tarjetas: [t("a")], cierres: [c("a", "2026-11-23", 500), c("a", "2026-11-26", 480)] }, "2026-11-26");
    expect(r.a.diff).toBe(null);
    expect(r.a.texto).toBe("sin mes anterior todavía");
  });
  it("ignora cierres futuros y tarjetas sin saldo", () => {
    const r = cambioTarjetas({ tarjetas: [t("a"), t("b")], cierres: [c("a", "2026-10-31", 1000), c("a", "2026-12-31", 10)] }, "2026-11-30");
    expect(r.a.diff).toBe(null);
    expect(r.b).toBeUndefined();
  });
});
