import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseDatePart,
  dateFromFilename,
  weekKey,
  monthKey,
  isoWeek,
  computeHuella,
  validateNonNegative,
  validateRouteInputs,
  finalizeRoute,
  aggregate,
  totalsForKey,
  round2,
} from "../earnings.js";

describe("fechas", () => {
  it("parseDatePart con varios formatos", () => {
    expect(parseDatePart("2026-06-27T12:20:35")).toBe("2026-06-27");
    expect(parseDatePart("2026-06-27")).toBe("2026-06-27");
    expect(parseDatePart("2026/6/7")).toBe("2026-06-07");
    expect(parseDatePart("06/27/2026")).toBe("2026-06-27");
    expect(parseDatePart("")).toBeNull();
    expect(parseDatePart("basura")).toBeNull();
  });

  it("dateFromFilename con guiones y sin guiones", () => {
    expect(dateFromFilename("manifest_2026-06-27.csv")).toBe("2026-06-27");
    expect(dateFromFilename("manifest_20260627_x.zip")).toBe("2026-06-27");
    expect(dateFromFilename("sin fecha.csv")).toBeNull();
  });

  it("semana ISO y mes", () => {
    expect(monthKey("2026-06-27")).toBe("2026-06");
    expect(weekKey("2026-06-27")).toBe("2026-W26");
    // frontera: 2026-01-01 es jueves -> semana 1
    expect(isoWeek("2026-01-01").week).toBe(1);
    // lunes y domingo de la misma semana ISO comparten clave
    expect(weekKey("2026-06-22")).toBe(weekKey("2026-06-28"));
  });
});

describe("hash / huella", () => {
  it("misma huella sin importar orden de barcodes", () => {
    const a = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["A", "B"] }] };
    const b = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["B", "A"] }] };
    expect(computeHuella(a)).toBe(computeHuella(b));
  });
  it("huella distinta para contenido distinto", () => {
    const a = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["A"] }] };
    const b = { origen: "ontrac", fecha: "2026-06-27", detalle: [{ barcodes: ["Z"] }] };
    expect(computeHuella(a)).not.toBe(computeHuella(b));
  });
});

describe("validación", () => {
  it("rechaza texto y negativos", () => {
    expect(validateNonNegative("abc", "X").ok).toBe(false);
    expect(validateNonNegative("-3", "X").ok).toBe(false);
    expect(validateNonNegative("12.5", "X")).toEqual({ ok: true, value: 12.5 });
    expect(validateNonNegative("", "X")).toEqual({ ok: true, value: 0 });
  });
  it("validateRouteInputs junta errores", () => {
    const r = validateRouteInputs({ millas: "-1", tarifa: "x" });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBe(2);
  });
});

describe("finalizeRoute y agregaciones", () => {
  const preview = {
    fecha: "2026-06-27",
    origen: "ontrac",
    paquetes: 10,
    paradas: 8,
    detalle: [{ barcodes: ["A", "B"] }],
  };

  it("congela ganancia = paquetes * tarifa", () => {
    const r = finalizeRoute(preview, { millas: 50, tarifa: 1.7 });
    expect(r.ganancia).toBe(round2(10 * 1.7));
    expect(r.millas).toBe(50);
    expect(r.tarifaUsada).toBe(1.7);
    expect(r.id).toBeTruthy();
    expect(r.huella).toBeTruthy();
  });

  it("agrega por semana y por mes", () => {
    const routes = [
      finalizeRoute({ ...preview, fecha: "2026-06-27", paquetes: 10 }, { millas: 50, tarifa: 1.7 }),
      finalizeRoute({ ...preview, fecha: "2026-06-28", paquetes: 5 }, { millas: 20, tarifa: 1.7 }),
      finalizeRoute({ ...preview, fecha: "2026-07-01", paquetes: 4 }, { millas: 10, tarifa: 2 }),
    ];
    const agg = aggregate(routes);
    expect(agg.total.paquetes).toBe(19);
    expect(agg.total.millas).toBe(80);
    // junio: 15 paquetes; julio: 4
    expect(totalsForKey(agg.porMes, "2026-06").paquetes).toBe(15);
    expect(totalsForKey(agg.porMes, "2026-07").paquetes).toBe(4);
    // 27 y 28 de junio caen en la misma semana ISO (W26)
    expect(totalsForKey(agg.porSemana, "2026-W26").paquetes).toBe(15);
  });
});

describe("almacenamiento y respaldo (con localStorage simulado)", () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });

  it("guarda y carga JSON con versionado", async () => {
    const storage = await import("../storage.js");
    await storage.saveJSON("k", { a: 1 });
    expect(await storage.loadJSON("k", null)).toEqual({ a: 1 });
  });

  it("respaldo round-trip", async () => {
    const storage = await import("../storage.js");
    const backup = await import("../backup.js");
    await storage.saveJSON("route_earnings_v1", [{ id: "1", fecha: "2026-06-27" }]);
    await storage.saveJSON("gate_codes_v3", [{ id: "c1" }]);
    const b = await backup.buildBackup();
    expect(b.data.rutas).toHaveLength(1);
    // borrar y restaurar
    await storage.saveJSON("route_earnings_v1", []);
    const res = await backup.restoreBackup(JSON.stringify(b));
    expect(res.rutas).toBe(1);
    expect(await storage.loadJSON("route_earnings_v1", [])).toHaveLength(1);
  });

  it("set lanza si localStorage falla", async () => {
    global.localStorage.setItem = () => {
      throw new Error("lleno");
    };
    const storage = await import("../storage.js");
    await expect(storage.saveJSON("k", { a: 1 })).rejects.toThrow();
  });
});
