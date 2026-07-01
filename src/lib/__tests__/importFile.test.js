import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { zipSync, strToU8 } from "fflate";
import { extractFromZip, extractAllFromZip } from "../importFile.js";
import { parseRoutes } from "../parseRoutes.js";

const csv = readFileSync("plantillas/ontrac-ejemplo.csv", "utf8");

describe("lectura de .zip de OnTrac", () => {
  it("saca el CSV de adentro del zip y lo parsea", () => {
    const zipped = zipSync({
      "OnTrac OnRoute_255935_manifest_2026-06-27.csv": strToU8(csv),
    });
    const { text, filename } = extractFromZip(zipped);
    expect(filename).toMatch(/\.csv$/);
    const routes = parseRoutes(text, filename);
    expect(routes).toHaveLength(1);
    expect(routes[0].paquetes).toBe(98);
    expect(routes[0].paradas).toBe(94);
  });

  it("ignora entradas __MACOSX y toma el CSV real", () => {
    const zipped = zipSync({
      "__MACOSX/._algo": strToU8("basura"),
      "carpeta/manifest_2026-06-27.csv": strToU8(csv),
    });
    const { filename } = extractFromZip(zipped);
    expect(filename).toContain("manifest");
  });

  it("lanza si el zip no tiene CSV", () => {
    const zipped = zipSync({ "leeme.txt": strToU8("hola") });
    expect(() => extractFromZip(zipped)).toThrow(/no contiene/);
  });
});

describe("zip mensual con varios manifests (uno vacío)", () => {
  const encabezado = "Barcode,Last Event,Last Event time,Last GPS location,Seq No,Address";
  // Un día con todas sus filas entregadas en la misma fecha (no se parte).
  const dia = (fecha) =>
    [
      encabezado,
      `B1,Delivered,${fecha}T10:00:00,,1,100 MAIN ST. CITY. FL. 32714`,
      `B2,Delivered,${fecha}T11:00:00,,2,200 OAK AVE. CITY. FL. 32714`,
      `B3,Delivered,${fecha}T12:00:00,,3,200 OAK AVE. CITY. FL. 32714`,
    ].join("\n");

  it("lee todos los días con datos y salta el vacío", () => {
    const zipped = zipSync({
      "manifest_2026-06-27.csv": strToU8(dia("2026-06-27")),
      "manifest_2026-06-28.csv": strToU8(dia("2026-06-28")),
      "manifest_2026-06-30.csv": strToU8(encabezado + "\n"), // solo encabezado
    });
    const items = extractAllFromZip(zipped);
    expect(items).toHaveLength(3);

    let all = [];
    let omitidos = 0;
    for (const { text, filename } of items) {
      try {
        all = all.concat(parseRoutes(text, filename));
      } catch {
        omitidos += 1;
      }
    }
    expect(omitidos).toBe(1); // el del 30 (solo encabezado)
    expect(all).toHaveLength(2); // 27 y 28
    expect(all.map((r) => r.fecha).sort()).toEqual(["2026-06-27", "2026-06-28"]);
    expect(all.every((r) => r.paquetes === 3 && r.paradas === 2)).toBe(true);
  });
});
