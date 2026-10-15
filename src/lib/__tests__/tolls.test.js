import { describe, it, expect } from "vitest";
import {
  parseAmount,
  validateToll,
  makeToll,
  parseTollsCSV,
  tollSpendByPeriod,
  tollSpendForKey,
} from "../tolls.js";

describe("parseAmount", () => {
  it("formatos comunes", () => {
    expect(parseAmount("$1.25")).toBe(1.25);
    expect(parseAmount("1,234.50")).toBe(1234.5);
    expect(parseAmount("(2.10)")).toBe(-2.1);
    expect(parseAmount("-0.98")).toBe(-0.98);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("peaje manual", () => {
  it("valida fecha y monto > 0", () => {
    expect(validateToll({ fecha: "2026-10-14", monto: "1.5", agencia: "epass" }).ok).toBe(true);
    expect(validateToll({ fecha: "2026-10-14", monto: "0" }).ok).toBe(false);
    expect(validateToll({ fecha: "2026-10-14", monto: "-1" }).ok).toBe(false);
    expect(validateToll({ fecha: "ayer", monto: "1" }).ok).toBe(false);
    expect(validateToll({ fecha: "2026-10-14", monto: "1", agencia: "x" }).ok).toBe(false);
  });
});

const CSV = [
  "Transaction Date,Plaza Name,Amount",
  "10/14/2026 08:05:12 AM,SR 414 Coral Hills,$1.25",
  "10/14/2026 05:40:00 PM,SR 414 Coral Hills,$1.25",
  "10/15/2026 09:00:00 AM,Replenishment,($25.00)",
  "fecha mala,X,$1.00",
  "10/16/2026 10:00:00 AM,SR 429,abc",
  "10/16/2026 11:30:00 AM,SR 429 Ponkan,2.06",
].join("\n");

describe("importar CSV de peajes (formato supuesto, NO verificado)", () => {
  it("importa válidos, omite pagos y filas malas con motivo", () => {
    const r = parseTollsCSV(CSV, "sunpass");
    expect(r.tolls.length).toBe(3);
    expect(r.tolls.map((t) => t.monto)).toEqual([1.25, 1.25, 2.06]);
    expect(r.tolls[0].hora).toBe("08:05");
    expect(r.tolls[1].hora).toBe("17:40");
    expect(r.tolls[0].agencia).toBe("sunpass");
    expect(r.omitidas).toEqual([
      { fila: 4, motivo: "monto negativo o cero (pago/recarga)" },
      { fila: 5, motivo: "fecha no válida" },
      { fila: 6, motivo: "monto no válido" },
    ]);
  });
  it("no duplica al importar dos veces el mismo archivo", () => {
    const primera = parseTollsCSV(CSV, "sunpass");
    const segunda = parseTollsCSV(CSV, "sunpass", primera.tolls);
    expect(segunda.tolls.length).toBe(0);
    expect(segunda.duplicados).toBe(3);
  });
  it("encabezados en español", () => {
    const r = parseTollsCSV("fecha,lugar,monto\n2026-10-14,Plaza,1.10", "epass");
    expect(r.tolls[0].monto).toBe(1.1);
    expect(r.tolls[0].agencia).toBe("epass");
  });
  it("sin columnas de fecha o monto → error que lista los encabezados", () => {
    expect(() => parseTollsCSV("a,b\n1,2")).toThrow(/a, b/);
  });
});

describe("gasto en peajes por período", () => {
  it("suma por semana de pago (sáb→vie) y por mes", () => {
    const tolls = [
      makeToll({ fecha: "2026-10-09", monto: 1 }), // viernes → semana 2026-10-03
      makeToll({ fecha: "2026-10-10", monto: 2 }), // sábado → semana 2026-10-10
      makeToll({ fecha: "2026-10-14", monto: 3 }),
    ];
    const s = tollSpendByPeriod(tolls, 6);
    expect(s.total).toBe(6);
    expect(tollSpendForKey(tolls, "2026-10-10", 6)).toBe(5);
    expect(tollSpendForKey(tolls, "2026-10-03", 6)).toBe(1);
    expect(tollSpendForKey(tolls, "2026-10", 6)).toBe(6);
  });
});
