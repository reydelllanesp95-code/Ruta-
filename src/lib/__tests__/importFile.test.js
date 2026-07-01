import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { zipSync, strToU8 } from "fflate";
import { extractFromZip } from "../importFile.js";
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
