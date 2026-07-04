import { describe, it, expect } from "vitest";
import { normalize } from "../../components/GateCodeDirectory.jsx";

// Regresión del bug del formulario de nota: al vaciar la nota (o si un código
// importado no trae nota), la normalización que usa la búsqueda/agrupación NO
// debe romperse con "", null o undefined.
describe("normalize (regresión nota vacía)", () => {
  it("tolera cadena vacía, null y undefined → ''", () => {
    expect(normalize("")).toBe("");
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });

  it("quita acentos y pasa a minúsculas", () => {
    expect(normalize("Café Ñandú")).toBe("cafe nandu");
    expect(normalize("LOCKER")).toBe("locker");
  });

  it("una nota que pasa de tener texto a vacía no lanza", () => {
    expect(() => normalize("tocar dos veces")).not.toThrow();
    expect(() => normalize("")).not.toThrow();
  });
});
