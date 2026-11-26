import { describe, it, expect } from "vitest";
import { makeShift } from "../platforms.js";
import { resumenRango } from "../resumen.js";

const T = { hora: 23, milla: 0.7, retencionPct: 18 };
const ups = makeShift({ plataforma: "ups", fecha: "2026-11-25", horaInicio: "13:00", horaFin: "18:15", millas: "35", vehiculo: "kia", upsTarifas: T });
const lyft = makeShift({ plataforma: "lyft", fecha: "2026-11-25", pago: "9.08", vehiculo: "kia" });
const jor = (horaSalida, horaLlegada, pausas = []) => ({ id: "j", fecha: "2026-11-25", vehiculo: "kia", horaSalida, odoSalida: 100, horaLlegada, odoLlegada: 150, pausas });
const horas = (jornadas) => resumenRango({ routes: [lyft, ups], jornadas }, "2026-11-25", "2026-11-25").horas;

describe("horas de UPS con jornada", () => {
  it("jornada 8–12 + UPS 13–18:15 = 9.25 h", () => {
    expect(horas([jor("08:00", "12:00")])).toBe(9.25);
  });
  it("si se solapan no cuenta dos veces: 8–15 + UPS 13–18:15 = 10.25 h", () => {
    expect(horas([jor("08:00", "15:00")])).toBe(10.25);
  });
  it("una pausa dentro de UPS no se resta dos veces", () => {
    // 8–15 con pausa 13:30–14:00: jornada 6.5 h; solape con UPS 13–15 menos la pausa = 1.5 h.
    expect(horas([jor("08:00", "15:00", [{ desde: "13:30", hasta: "14:00" }])])).toBe(10.25);
  });
  it("sin UPS, igual que antes", () => {
    const r = resumenRango({ routes: [lyft], jornadas: [jor("08:00", "12:00")] }, "2026-11-25", "2026-11-25");
    expect(r.horas).toBe(4);
  });
});
