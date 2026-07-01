import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseRoutes, parseCSV } from "../parseRoutes.js";
import { computeHuella } from "../earnings.js";

const realOnTrac = readFileSync("plantillas/ontrac-ejemplo.csv", "utf8");

describe("parser de OnTrac (archivo real)", () => {
  it("calcula 98 paquetes, 94 paradas, fecha 2026-06-27", () => {
    const routes = parseRoutes(realOnTrac, "OnTrac OnRoute_255935_manifest_2026-06-27.csv");
    expect(routes).toHaveLength(1);
    const r = routes[0];
    expect(r.fecha).toBe("2026-06-27");
    expect(r.paquetes).toBe(98);
    expect(r.paradas).toBe(94);
    expect(r.origen).toBe("ontrac");
    // se conserva toda la data cruda
    expect(r.filasCrudas).toHaveLength(98);
    expect(Object.keys(r.filasCrudas[0])).toContain("Barcode");
  });

  it("una sola ruta aunque el nombre del archivo no tenga fecha (usa la fecha dominante, no 'hoy')", () => {
    const routes = parseRoutes(realOnTrac, "ontrac-ejemplo.csv");
    expect(routes).toHaveLength(1);
    expect(routes[0].fecha).toBe("2026-06-27");
    expect(routes[0].paquetes).toBe(98);
  });
});

describe("parser de OnTrac (robustez)", () => {
  it("detecta columnas reordenadas y con columnas extra", () => {
    const csv = [
      "Address,Extra,Barcode,Seq No",
      "100 MAIN ST. CITY. FL. 32714,foo,AAA111,1",
      "100 MAIN ST. CITY. FL. 32714,bar,BBB222,2",
      "200 OAK AVE. CITY. FL. 32714,baz,CCC333,3",
    ].join("\n");
    const routes = parseRoutes(csv, "manifest_2026-06-27.csv");
    expect(routes).toHaveLength(1);
    expect(routes[0].paquetes).toBe(3);
    expect(routes[0].paradas).toBe(2); // 2 direcciones únicas
  });

  it("normaliza direcciones con espacios extra y mayúsculas al agrupar", () => {
    const csv = [
      "Barcode,Address",
      "A1,  100   main st  ",
      "A2,100 MAIN ST",
    ].join("\n");
    const routes = parseRoutes(csv, "manifest_2026-06-27.csv");
    expect(routes[0].paquetes).toBe(2);
    expect(routes[0].paradas).toBe(1);
  });

  it("manda paquetes sin Address a 'Dirección desconocida'", () => {
    const csv = ["Barcode,Address", "A1,", "A2,"].join("\n");
    const routes = parseRoutes(csv, "manifest_2026-06-27.csv");
    expect(routes[0].paquetes).toBe(2);
    expect(routes[0].paradas).toBe(1);
    expect(routes[0].detalle[0].direccion).toBe("Dirección desconocida");
  });

  it("separa varias fechas en varias rutas", () => {
    const csv = [
      "Barcode,Address,Last Event time",
      "A1,100 MAIN,2026-06-27T10:00:00",
      "A2,200 OAK,2026-06-28T11:00:00",
    ].join("\n");
    const routes = parseRoutes(csv, "x.csv");
    expect(routes).toHaveLength(2);
    expect(routes.map((r) => r.fecha)).toEqual(["2026-06-27", "2026-06-28"]);
  });

  it("la huella es estable sin importar el orden de filas", () => {
    const a = parseRoutes("Barcode,Address\nA1,X\nA2,Y", "manifest_2026-06-27.csv")[0];
    const b = parseRoutes("Barcode,Address\nA2,Y\nA1,X", "manifest_2026-06-27.csv")[0];
    expect(computeHuella(a)).toBe(computeHuella(b));
  });

  it("maneja un archivo grande (1500 filas)", () => {
    const lines = ["Barcode,Address"];
    for (let i = 0; i < 1500; i++) lines.push(`B${i},${i % 300} STREET`);
    const routes = parseRoutes(lines.join("\n"), "manifest_2026-06-27.csv");
    expect(routes[0].paquetes).toBe(1500);
    expect(routes[0].paradas).toBe(300);
  });
});

describe("errores y formatos inválidos", () => {
  it("lanza con CSV vacío", () => {
    expect(() => parseRoutes("", "x.csv")).toThrow();
  });

  it("lanza con solo encabezado", () => {
    expect(() => parseRoutes("Barcode,Address", "x.csv")).toThrow();
  });

  it("lanza con formato desconocido", () => {
    expect(() => parseRoutes("col1,col2\n1,2", "x.csv")).toThrow(/No reconozco/);
  });
});

describe("parser manual", () => {
  it("paquetes vacío cuenta como 1; suma paradas y paquetes", () => {
    const csv = ["fecha,parada,direccion,paquetes", "2026-06-28,A,dir a,", "2026-06-28,B,dir b,2"].join("\n");
    const routes = parseRoutes(csv, "ruta.csv");
    expect(routes[0].paradas).toBe(2);
    expect(routes[0].paquetes).toBe(3);
  });

  it("paquetes inválido genera advertencia y cuenta 0", () => {
    const csv = ["fecha,parada,paquetes", "2026-06-28,A,abc"].join("\n");
    const routes = parseRoutes(csv, "ruta.csv");
    expect(routes[0].paquetes).toBe(0);
    expect(routes[0].advertencias.length).toBe(1);
  });
});

describe("lector CSV", () => {
  it("respeta comas dentro de comillas", () => {
    const rows = parseCSV('a,b\n"uno, dos",tres');
    expect(rows[1]).toEqual(["uno, dos", "tres"]);
  });
});
