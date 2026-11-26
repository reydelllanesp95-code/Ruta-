import { describe, it, expect } from "vitest";
import { makeShift } from "../platforms.js";
import { resumenHoy, tiempoTrabajando } from "../hoy.js";

const ups = makeShift({ plataforma: "ups", fecha: "2026-11-25", horaInicio: "13:00", horaFin: "18:15", millas: "35", vehiculo: "kia", upsTarifas: { hora: 23, milla: 0.7, retencionPct: 18 } });
const lyft = makeShift({ plataforma: "lyft", fecha: "2026-11-25", pago: "9.08", vehiculo: "kia" });

describe("Hoy llevas", () => {
  it("UPS + Lyft del mismo día", () => {
    const r = resumenHoy({ routes: [lyft, ups] }, "2026-11-25");
    expect(r.ganado).toBe(132.59);
    expect(r.horas).toBe(5.25);
    expect(r.porApp.map((a) => `${a.label} ${a.ganado}`)).toEqual(["UPS 123.51", "Lyft 9.08"]);
  });
  it("sin nada hoy", () => {
    const r = resumenHoy({ routes: [lyft] }, "2026-11-26");
    expect(r.ganado).toBe(0);
    expect(r.registros).toBe(0);
  });
});

describe("reloj de la jornada", () => {
  const j = { fecha: "2026-11-26", horaSalida: "08:00", odoSalida: 100, horaLlegada: "", odoLlegada: null };
  it("salida 08:00, ahora 10:14 → 2 h 14 min", () => {
    expect(tiempoTrabajando(j, "10:14")).toMatchObject({ min: 134, texto: "2 h 14 min", pausa: false });
  });
  it("resta pausas y se queda quieto con «Paré»", () => {
    expect(tiempoTrabajando({ ...j, pausas: [{ desde: "09:00", hasta: "09:30" }] }, "10:14").texto).toBe("1 h 44 min");
    expect(tiempoTrabajando({ ...j, horaParada: "09:45" }, "12:00")).toMatchObject({ texto: "1 h 45 min", pausa: true });
  });
  it("menos de una hora", () => {
    expect(tiempoTrabajando(j, "08:07").texto).toBe("7 min");
  });
});
