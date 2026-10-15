import { describe, it, expect } from "vitest";
import { makeShift, validateShift, parseShiftRows } from "../platforms.js";
import { aggregate } from "../earnings.js";
import { parseCSV, dropEmptyRows } from "../csv.js";

const CFG = { gas_price: 3, mpg: 20, maintenance_cost_per_mile: 0.1, pay_week_start_day: 6 };
const base = {
  plataforma: "flex",
  fecha: "2026-10-15",
  horaInicio: "08:00",
  horaFin: "12:00",
  millas: "40",
  pago: "90",
  propina: "",
};

describe("salida y llegada a casa", () => {
  it("horas reales puerta a puerta", () => {
    const s = makeShift({ ...base, salidaCasa: "07:15", llegadaCasa: "12:45" });
    expect(s.horas).toBe(4);
    expect(s.horasReales).toBe(5.5);
    expect(s.salidaCasa).toBe("07:15");
  });
  it("cruza medianoche", () => {
    const s = makeShift({ ...base, horaInicio: "22:00", horaFin: "01:00", salidaCasa: "21:30", llegadaCasa: "01:40" });
    expect(s.horasReales).toBe(4.17);
  });
  it("una sola de las dos → error", () => {
    expect(validateShift({ ...base, salidaCasa: "07:15" }).ok).toBe(false);
    expect(validateShift({ ...base, llegadaCasa: "12:45" }).ok).toBe(false);
  });
  it("horas reales menores que el bloque → error", () => {
    const r = validateShift({ ...base, salidaCasa: "08:30", llegadaCasa: "11:00" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no cuadran/);
  });
  it("sin bloque pero con salida/llegada → válido", () => {
    const s = makeShift({ ...base, horaInicio: "", horaFin: "", salidaCasa: "07:00", llegadaCasa: "11:00" });
    expect(s.horas).toBeNull();
    expect(s.horasReales).toBe(4);
  });
});

describe("neto/hora con horas reales", () => {
  it("usa horas reales si existen", () => {
    const s = makeShift({ ...base, salidaCasa: "07:00", llegadaCasa: "13:00" }); // 6 h reales
    // neto: 90 - 40/20*3 (6) - 4 = 80 → 80/6 = 13.33
    const t = aggregate([s], CFG).total;
    expect(t.horas).toBe(6);
    expect(t.net_per_hour).toBe(13.33);
  });
  it("turno viejo sin estos campos da el mismo neto/hora que antes", () => {
    const viejo = makeShift(base);
    delete viejo.salidaCasa;
    delete viejo.llegadaCasa;
    delete viejo.horasReales;
    const t = aggregate([viejo], CFG).total;
    expect(t.horas).toBe(4);
    expect(t.net_per_hour).toBe(20); // 80 / 4
  });
});

describe("CSV con y sin salida/llegada", () => {
  const rows = (t) => dropEmptyRows(parseCSV(t));
  it("plantilla nueva", () => {
    const r = parseShiftRows(rows("plataforma,fecha,salida,inicio,fin,llegada,pago,propina,millas,vehiculo,nota\nflex,2026-10-15,07:15,08:00,12:00,12:45,90,,40,kia,"));
    expect(r.shifts[0].horasReales).toBe(5.5);
  });
  it("plantilla anterior sigue funcionando", () => {
    const r = parseShiftRows(rows("plataforma,fecha,inicio,fin,pago,propina,millas,vehiculo,nota\nflex,2026-10-15,08:00,12:00,90,,40,kia,"));
    expect(r.shifts.length).toBe(1);
    expect(r.shifts[0].horas).toBe(4);
    expect(r.shifts[0].horasReales).toBeNull();
  });
});
