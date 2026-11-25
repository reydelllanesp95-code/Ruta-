import { describe, it, expect } from "vitest";
import { validateShift, makeShift, shiftUpdate, upsPay } from "../platforms.js";
import { sanitizeConfig, upsTarifasDe, retencionDeCheque } from "../config.js";
import { withJornadaMiles } from "../jornada.js";
import { resumenRango } from "../resumen.js";

const TARIFAS = { hora: 23, milla: 0.7, retencionPct: 18 };

// Caso real del 25-nov-2026: 13:00–18:15, 35 millas.
const upsHoy = {
  plataforma: "ups",
  fecha: "2026-11-25",
  horaInicio: "13:00",
  horaFin: "18:15",
  millas: "35",
  vehiculo: "kia",
  upsTarifas: TARIFAS,
};

describe("UPS: pago por hora + milla con retención", () => {
  it("calcula el caso real del 25-nov", () => {
    const s = makeShift(upsHoy);
    expect(s.plataforma).toBe("ups");
    expect(s.ups.horasPagadas).toBe(5.25);
    expect(s.ups.brutoHoras).toBe(120.75);
    expect(Math.abs(s.ups.retenido - 21.74)).toBeLessThanOrEqual(0.01);
    expect(s.ups.reembolso).toBe(24.5);
    expect(Math.abs(s.ganancia - 123.51)).toBeLessThanOrEqual(0.01);
    expect(s.pagoBase).toBe(s.ganancia);
    expect(s.propina).toBe(0);
  });

  it("la retención no toca las millas", () => {
    const sinRet = upsPay(5.25, 35, { ...TARIFAS, retencionPct: 0 });
    const conRet = upsPay(5.25, 35, TARIFAS);
    expect(conRet.reembolso).toBe(sinRet.reembolso);
    expect(round(sinRet.neto - conRet.neto)).toBe(conRet.retenido);
  });

  it("no pide pago: lo calcula aunque venga vacío", () => {
    expect(validateShift({ ...upsHoy, pago: "" }).ok).toBe(true);
  });

  it("sin horas de entrada y salida da error claro", () => {
    const r = validateShift({ ...upsHoy, horaInicio: "", horaFin: "" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/UPS/);
  });

  it("tarifas inválidas o % > 100 dan error", () => {
    expect(validateShift({ ...upsHoy, upsTarifas: { ...TARIFAS, retencionPct: 120 } }).ok).toBe(false);
    expect(validateShift({ ...upsHoy, upsTarifas: { ...TARIFAS, hora: -1 } }).ok).toBe(false);
    expect(validateShift({ ...upsHoy, upsTarifas: undefined }).ok).toBe(false);
  });

  it("las tarifas quedan congeladas en el turno; editar usa las suyas", () => {
    const s = makeShift(upsHoy);
    // La config cambia después (p. ej. retención calibrada al 15 %)…
    const nuevas = upsTarifasDe({ ups_tarifa_hora: 23, ups_tarifa_milla: 0.7, ups_retencion_pct: 15 });
    expect(nuevas.retencionPct).toBe(15);
    // …pero el turno guardado no cambia.
    expect(s.ups.retencionPct).toBe(18);
    // Editar con sus tarifas guardadas (lo que hace el formulario) recalcula igual.
    const editado = shiftUpdate({ ...upsHoy, millas: "40", upsTarifas: { hora: s.ups.hora, milla: s.ups.milla, retencionPct: s.ups.retencionPct } });
    expect(editado.ups.retencionPct).toBe(18);
    expect(editado.ups.reembolso).toBe(28);
  });
});

describe("Configuración de UPS", () => {
  it("valores por defecto 23 / 0.70 / 18", () => {
    expect(upsTarifasDe({})).toEqual({ hora: 23, milla: 0.7, retencionPct: 18 });
  });
  it("rechaza negativos y % > 100", () => {
    const c = sanitizeConfig({ ups_tarifa_hora: -3, ups_retencion_pct: 150 });
    expect(c.ups_tarifa_hora).toBe(23);
    expect(c.ups_retencion_pct).toBe(18);
  });
  it("calcula el % desde el cheque", () => {
    expect(retencionDeCheque(920, 141.5)).toBe(15.4);
    expect(retencionDeCheque(0, 10)).toBe(null);
    expect(retencionDeCheque(100, 200)).toBe(null);
  });
});

describe("UPS con jornada de odómetro", () => {
  it("UPS conserva sus millas; el resto va a los demás trabajos", () => {
    const ups = makeShift(upsHoy);
    const flex = makeShift({ plataforma: "flex", fecha: "2026-11-25", horaInicio: "07:00", horaFin: "10:00", millas: "0", pago: "60", vehiculo: "kia" });
    const jornada = { id: "j1", fecha: "2026-11-25", vehiculo: "kia", horaSalida: "06:30", odoSalida: 1000, horaLlegada: "18:45", odoLlegada: 1100 };
    const out = withJornadaMiles([flex, ups], [jornada]);
    const m = (id) => out.find((r) => r.id === id).millas;
    expect(m(ups.id)).toBe(35);
    expect(m(flex.id)).toBe(65);
    expect(out.find((r) => r.id === ups.id).ganancia).toBe(ups.ganancia);
  });
});

describe("UPS en los totales", () => {
  it("entra en ganado y por app como UPS, ya sin taxes", () => {
    const ups = makeShift(upsHoy);
    const r = resumenRango({ routes: [ups] }, "2026-11-25", "2026-11-25");
    expect(r.ganado).toBe(ups.ganancia);
    expect(r.porApp[0].label).toBe("UPS");
  });
});

function round(n) {
  return Math.round(n * 100) / 100;
}
