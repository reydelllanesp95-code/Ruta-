import { describe, it, expect } from "vitest";
import { parseCSV, dropEmptyRows, normalizeHeader } from "../csv.js";
import { parseShiftRows, isShiftsCSVHeader } from "../platforms.js";

const rowsOf = (t) => dropEmptyRows(parseCSV(t));

// Filas en el orden de la plantilla original (sin salida/llegada).
const CSV = [
  "plataforma,fecha,inicio,fin,pago,propina,millas,vehiculo,nota",
  "Amazon Flex,2026-10-13,08:00,12:00,$90,,40,Hyundai,bloque mañana",
  "spark,10/14/2026,17:00,19:30,31.50,12,22,kia,",
  "uber,2026-10-14,,,10,,,,",
  "flex,2026-10-15,,,,,,,sin pago",
  "spark,2026-10-15,,,20,-3,,,",
].join("\n");

describe("importar turnos desde CSV", () => {
  it("detecta la plantilla por encabezado", () => {
    expect(isShiftsCSVHeader(rowsOf(CSV)[0].map(normalizeHeader))).toBe(true);
    expect(isShiftsCSVHeader(["fecha", "parada", "direccion", "paquetes"])).toBe(false);
  });
  it("crea turnos válidos y omite inválidos con fila y motivo", () => {
    const r = parseShiftRows(rowsOf(CSV));
    expect(r.shifts.length).toBe(2);
    const [a, b] = r.shifts;
    expect(a.plataforma).toBe("flex");
    expect(a.vehiculo).toBe("tucson");
    expect(a.horas).toBe(4);
    expect(a.ganancia).toBe(90);
    expect(a.nota).toBe("bloque mañana");
    expect(b.plataforma).toBe("spark");
    expect(b.fecha).toBe("2026-10-14");
    expect(b.ganancia).toBe(43.5);
    expect(b.vehiculo).toBe("kia");
    expect(r.omitidas).toEqual([
      { fila: 4, motivo: "Elige una plataforma." },
      { fila: 5, motivo: "Escribe el pago." },
      { fila: 6, motivo: "La propina no puede ser negativo." },
    ]);
  });
  it("no duplica al importar el mismo archivo dos veces", () => {
    const primera = parseShiftRows(rowsOf(CSV));
    const segunda = parseShiftRows(rowsOf(CSV), primera.shifts);
    expect(segunda.shifts.length).toBe(0);
    expect(segunda.duplicados).toBe(2);
  });
});
