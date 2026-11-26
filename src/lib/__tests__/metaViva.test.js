import { describe, it, expect } from "vitest";
import { estadoSemana, partesSemana, proximaMeta, umbralesDe, TRAMO_LABEL } from "../meta.js";

const U = umbralesDe({});
const est = (neta, saldoFondo = 0) => estadoSemana(neta, U, { saldoFondo });

describe("próxima meta arriba en grande", () => {
  const casos = [
    [0, "Faltan $80.00 para el colchón"],
    [50, "Faltan $30.00 para el colchón"],
    [500, "Faltan $260.00 para la deuda de la semana"],
    [800, "Faltan $60.00 para invertir"],
    [880, "Faltan $20.00 para el extra a la deuda"],
  ];
  for (const [neta, titulo] of casos) {
    it(`neta $${neta}`, () => {
      const p = proximaMeta(est(neta));
      expect(p.titulo).toBe(titulo);
      expect(p.que.length).toBeGreaterThan(10);
    });
  }
  it("neta $950: cumplida con $50 de más", () => {
    const p = proximaMeta(est(950));
    expect(p.id).toBe("cumplida");
    expect(p.excedente).toBe(50);
    expect(p.que).toMatch(/\$50\.00 de más/);
  });
});

describe("partes debajo", () => {
  it("orden real, montos de cada parte que suman la meta", () => {
    const e = est(500);
    const partes = partesSemana(e);
    expect(partes.map((p) => [p.id, p.monto])).toEqual([["colchon", 80], ["deuda", 680], ["inversion", 100], ["meta", 40]]);
    expect(partes.reduce((s, p) => s + p.monto, 0)).toBe(e.hitos.meta);
    expect(partes.map((p) => p.estado)).toEqual(["hecha", "en curso", "pendiente", "pendiente"]);
    expect(partes[1].llevas).toBe(420);
  });
  it("con el fondo lleno no hay parte de colchón", () => {
    expect(partesSemana(est(100, 500)).map((p) => p.id)).toEqual(["deuda", "inversion", "meta"]);
  });
  it("la parte de $40 se llama Extra a deuda", () => {
    expect(TRAMO_LABEL.meta).toBe("Extra a deuda");
  });
});
