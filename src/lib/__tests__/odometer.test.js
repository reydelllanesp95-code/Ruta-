import { describe, it, expect } from "vitest";
import { lastOdometer, stepOdometer } from "../odometer.js";

describe("lastOdometer", () => {
  const routes = [
    { tipo: "turno", vehiculo: "kia", odoInicio: 90100, odoFin: 90185 },
    { tipo: "turno", vehiculo: "tucson", odoInicio: 15000, odoFin: 15060 },
    { tipo: "turno", odoInicio: "", odoFin: null }, // sin odómetro
  ];
  const fuelups = [{ odometro: 90150 }, { vehiculo: "tucson", odometro: 15100 }]; // el 1º sin vehiculo = kia
  const maints = [{ vehiculo: "kia", odometro: 90200 }, { vehiculo: "tucson", odometro: null }];
  it("toma el mayor por carro de todas las fuentes", () => {
    expect(lastOdometer("kia", { routes, fuelups, maints })).toBe(90200);
    expect(lastOdometer("tucson", { routes, fuelups, maints })).toBe(15100);
  });
  it("datos viejos sin vehiculo cuentan como Kia", () => {
    expect(lastOdometer("kia", { fuelups: [{ odometro: 88000 }] })).toBe(88000);
    expect(lastOdometer("tucson", { fuelups: [{ odometro: 88000 }] })).toBeNull();
  });
  it("sin datos → null", () => {
    expect(lastOdometer("kia")).toBeNull();
  });
});

describe("stepOdometer (rueda)", () => {
  it("sube y baja el dígito elegido", () => {
    expect(stepOdometer(90185, 0, +1)).toBe(90186);
    expect(stepOdometer(90185, 1, +1)).toBe(90195);
    expect(stepOdometer(90185, 2, -1)).toBe(90085);
  });
  it("acarreo como un odómetro real", () => {
    expect(stepOdometer(90199, 0, +1)).toBe(90200);
    expect(stepOdometer(90200, 0, -1)).toBe(90199);
    expect(stepOdometer(90195, 1, +1)).toBe(90205);
  });
  it("nunca baja de 0 y tolera vacío", () => {
    expect(stepOdometer(5, 1, -1)).toBe(0);
    expect(stepOdometer("", 0, +1)).toBe(1);
  });
});
