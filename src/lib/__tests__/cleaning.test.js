import { describe, it, expect } from "vitest";
import { makeShift, validateShift, deliveryOnly, platformOf } from "../platforms.js";
import { cleaningMonthSummary, cleaningMilesForYear, corvusNet, sanitizeLocal, validateLocal } from "../cleaning.js";
import { aggregate } from "../earnings.js";

const CFG = { gas_price: 3, mpg: 20, maintenance_cost_per_mile: 0.1, pay_week_start_day: 6 };

const limpieza = (o) =>
  makeShift({ plataforma: "limpieza", fecha: "2026-10-05", salidaCasa: "21:00", llegadaCasa: "01:00", millas: "40", local: "Hartwood", ...o });

describe("viaje de limpieza", () => {
  it("no pide pago ni bloque", () => {
    const r = validateShift({ plataforma: "limpieza", fecha: "2026-10-05", salidaCasa: "21:00", llegadaCasa: "23:00", millas: "10", local: "Salem" });
    expect(r.ok).toBe(true);
    const s = limpieza({});
    expect(s.ganancia).toBe(0);
    expect(s.horasReales).toBe(4);
    expect(s.local).toBe("Hartwood");
  });
  it("reparto sigue exigiendo pago", () => {
    expect(validateShift({ plataforma: "flex", fecha: "2026-10-05", pago: "" }).ok).toBe(false);
  });
});

describe("limpiezas no se mezclan con reparto", () => {
  it("totales de reparto iguales con o sin limpiezas", () => {
    const flex = makeShift({ plataforma: "flex", fecha: "2026-10-05", horaInicio: "08:00", horaFin: "12:00", millas: "40", pago: "90" });
    const sin = aggregate(deliveryOnly([flex]), CFG, platformOf);
    const con = aggregate(deliveryOnly([flex, limpieza({}), limpieza({ fecha: "2026-10-06" })]), CFG, platformOf);
    expect(con.total).toEqual(sin.total);
    expect(con.porGrupo).toEqual(sin.porGrupo);
  });
});

describe("resumen mensual por local", () => {
  const locales = [
    { nombre: "Hartwood", facturacion: 1000, feePct: 27.25, cuotaFinder: 200 },
    { nombre: "Salem", facturacion: "", feePct: 27.25, cuotaFinder: 0 }, // sin datos de pago
  ];
  it("calcula neto de Corvus, costo de viajes y $/hora a mano", () => {
    const rutas = [
      limpieza({}), // 40 mi, 4 h
      limpieza({ fecha: "2026-10-12", millas: "40" }), // 40 mi, 4 h
      limpieza({ fecha: "2026-10-08", local: "salem ", salidaCasa: "19:00", llegadaCasa: "21:30", millas: "10" }),
      limpieza({ fecha: "2026-11-02" }), // otro mes, no cuenta
    ];
    const r = cleaningMonthSummary(rutas, locales, "2026-10", () => CFG);
    const h = r.locales.find((l) => l.nombre === "Hartwood");
    // neto Corvus = 1000 * 0.7275 - 200 = 527.50
    expect(h.netoCorvus).toBe(527.5);
    // costo por viaje: gas 40/20*3 = 6 + mant 40*0.1 = 4 → 10; dos viajes = 20
    expect(h.costoViajes).toBe(20);
    expect(h.netoReal).toBe(507.5);
    expect(h.horas).toBe(8);
    expect(h.porHora).toBe(63.44); // 507.5 / 8
    const s = r.locales.find((l) => l.nombre.trim().toLowerCase() === "salem");
    expect(s.conDatosDePago).toBe(false);
    expect(s.netoCorvus).toBeNull();
    expect(s.porHora).toBeNull();
    expect(r.total.millas).toBe(90);
    expect(r.total.visitas).toBe(3);
  });
  it("sin horas → $/hora null", () => {
    const sinHoras = makeShift({ plataforma: "limpieza", fecha: "2026-10-05", millas: "40", local: "Hartwood" });
    const r = cleaningMonthSummary([sinHoras], locales, "2026-10", () => CFG);
    expect(r.locales[0].porHora).toBeNull();
    expect(r.locales[0].visitasSinHoras).toBe(1);
  });
  it("millas del año para taxes", () => {
    expect(cleaningMilesForYear([limpieza({}), limpieza({ fecha: "2025-12-31" })], 2026)).toBe(40);
  });
});

describe("locales", () => {
  it("fee por defecto 27.25 y validación", () => {
    expect(sanitizeLocal({ nombre: "X" }).feePct).toBe(27.25);
    expect(corvusNet(sanitizeLocal({ nombre: "X", facturacion: 105, cuotaFinder: 37.21 }))).toBe(39.18);
    expect(validateLocal({ nombre: "" }).ok).toBe(false);
    expect(validateLocal({ nombre: "A", facturacion: "-1" }).ok).toBe(false);
    expect(validateLocal({ nombre: "A", feePct: "150" }).ok).toBe(false);
    expect(validateLocal({ nombre: "A", facturacion: "460", feePct: "27.25", cuotaFinder: "163.01" }).ok).toBe(true);
  });
});
