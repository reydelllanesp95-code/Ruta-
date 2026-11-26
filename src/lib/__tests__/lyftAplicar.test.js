import { describe, it, expect } from "vitest";
import { applyLyftPlan } from "../captura.js";

const nuevo = (horaInicio, horaFin) => ({
  cambios: [{ tipo: "nuevo", plataforma: "lyft", fecha: "2026-11-25", horario: "", horaInicio, horaFin, horas: null, horasFuente: "primer a último viaje", millasLyft: null, pago: 14.2, propina: 3, nota: "Lyft: 1 viaje(s) (desde captura)" }],
  sinCambios: 0,
  total: 17.2,
});

describe("aplicar captura de Lyft con un solo viaje", () => {
  it("guarda el día sin horario si inicio = fin", () => {
    const next = applyLyftPlan([], nuevo("19:40", "19:40"), { vehiculo: "kia" });
    expect(next).toHaveLength(1);
    expect(next[0].ganancia).toBe(17.2);
    expect(next[0].horaInicio).toBe("");
  });
  it("guarda el día si solo viene una hora", () => {
    const next = applyLyftPlan([], nuevo("19:40", ""), { vehiculo: "kia" });
    expect(next).toHaveLength(1);
    expect(next[0].propina).toBe(3);
  });
  it("con horas válidas las conserva", () => {
    const next = applyLyftPlan([], nuevo("17:00", "19:40"), { vehiculo: "kia" });
    expect([next[0].horaInicio, next[0].horaFin]).toEqual(["17:00", "19:40"]);
  });
});
