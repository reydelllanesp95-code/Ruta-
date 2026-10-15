import { describe, it, expect } from "vitest";
import {
  hoursBetween,
  validateShift,
  makeShift,
  shiftUpdate,
  platformOf,
  isShift,
  ACTIVE_PLATFORMS,
} from "../platforms.js";
import { aggregate, finalizeRoute, netPerHour } from "../earnings.js";

const CFG = { gas_price: 3, mpg: 20, maintenance_cost_per_mile: 0.1, pay_week_start_day: 6 };

// Ruta OnTrac tal como se guardaba antes de esta fase (sin `plataforma`).
function rutaVieja() {
  return finalizeRoute(
    {
      fecha: "2026-06-20",
      origen: "ontrac",
      paquetes: 100,
      paradas: 80,
      detalle: [{ direccion: "1 A St", paquetes: 100, barcodes: ["X1"] }],
    },
    { millas: 50, tarifa: 1.7 }
  );
}

const flexBase = {
  plataforma: "flex",
  fecha: "2026-10-14",
  horaInicio: "08:00",
  horaFin: "12:30",
  millas: "40",
  pago: "90",
  propina: "",
};

describe("hoursBetween", () => {
  it("calcula horas normales y con medianoche", () => {
    expect(hoursBetween("08:00", "12:30")).toBe(4.5);
    expect(hoursBetween("22:00", "02:00")).toBe(4);
  });
  it("sin horas o iguales → null, nunca 0", () => {
    expect(hoursBetween("", "")).toBeNull();
    expect(hoursBetween("08:00", "")).toBeNull();
    expect(hoursBetween("08:00", "08:00")).toBeNull();
    expect(hoursBetween("25:00", "08:00")).toBeNull();
  });
});

describe("validateShift", () => {
  it("acepta un turno válido", () => {
    expect(validateShift(flexBase).ok).toBe(true);
  });
  it("rechaza plataforma inválida u OnTrac (archivada)", () => {
    expect(validateShift({ ...flexBase, plataforma: "uber" }).ok).toBe(false);
    expect(validateShift({ ...flexBase, plataforma: "ontrac" }).ok).toBe(false);
  });
  it("rechaza pago vacío, texto y negativos", () => {
    expect(validateShift({ ...flexBase, pago: "" }).ok).toBe(false);
    expect(validateShift({ ...flexBase, pago: "abc" }).ok).toBe(false);
    expect(validateShift({ ...flexBase, pago: "-5" }).ok).toBe(false);
    expect(validateShift({ ...flexBase, propina: "-1" }).ok).toBe(false);
    expect(validateShift({ ...flexBase, millas: "x" }).ok).toBe(false);
  });
  it("rechaza fecha inválida y horas incompletas", () => {
    expect(validateShift({ ...flexBase, fecha: "ayer" }).ok).toBe(false);
    expect(validateShift({ ...flexBase, horaFin: "" }).ok).toBe(false);
  });
  it("acepta turno sin horas", () => {
    expect(validateShift({ ...flexBase, horaInicio: "", horaFin: "" }).ok).toBe(true);
  });
});

describe("makeShift", () => {
  it("ganancia = pago + propina y horas derivadas", () => {
    const s = makeShift({ ...flexBase, plataforma: "spark", pago: "20.5", propina: "4.25" });
    expect(s.ganancia).toBe(24.75);
    expect(s.pagoBase).toBe(20.5);
    expect(s.propina).toBe(4.25);
    expect(s.horas).toBe(4.5);
    expect(s.millas).toBe(40);
    expect(s.plataforma).toBe("spark");
    expect(isShift(s)).toBe(true);
    expect(s.huella).not.toBe(makeShift(flexBase).huella);
  });
  it("sin horas → horas null", () => {
    expect(makeShift({ ...flexBase, horaInicio: "", horaFin: "" }).horas).toBeNull();
  });
  it("lanza con entrada inválida", () => {
    expect(() => makeShift({ ...flexBase, pago: "" })).toThrow();
  });
  it("shiftUpdate recalcula ganancia", () => {
    expect(shiftUpdate({ ...flexBase, pago: "100", propina: "5" }).ganancia).toBe(105);
  });
});

describe("datos viejos de OnTrac", () => {
  it("una ruta sin plataforma cuenta como OnTrac", () => {
    const r = rutaVieja();
    expect(r.plataforma).toBeUndefined();
    expect(platformOf(r)).toBe("ontrac");
    expect(isShift(r)).toBe(false);
  });
  it("totales de rutas viejas no cambian (bruto, neto, millas, paquetes)", () => {
    const r = rutaVieja();
    const t = aggregate([r], CFG).total;
    // 100 paq * 1.70 = 170; gas 50/20*3 = 7.5; mant 50*0.1 = 5; neto 157.5
    expect(t.ganancia).toBe(170);
    expect(t.fuel_cost).toBe(7.5);
    expect(t.maintenance_est).toBe(5);
    expect(t.net_profit).toBe(157.5);
    expect(t.millas).toBe(50);
    expect(t.paquetes).toBe(100);
    expect(t.propinas).toBe(0);
    expect(t.horas).toBe(0);
    expect(t.net_per_hour).toBeNull();
  });
});

describe("agregación multiplataforma", () => {
  it("$/hora usa solo registros con horas y separa por plataforma", () => {
    const vieja = rutaVieja(); // sin horas
    const flex = makeShift(flexBase); // 90, 40 mi, 4.5 h
    const spark = makeShift({
      ...flexBase,
      plataforma: "spark",
      horaInicio: "17:00",
      horaFin: "19:00",
      millas: "20",
      pago: "30",
      propina: "10",
    }); // 40, 20 mi, 2 h
    const agg = aggregate([vieja, flex, spark], CFG, platformOf);
    // flex: gas 40/20*3=6, mant 4 → neto 80. spark: gas 3, mant 2 → neto 35.
    expect(agg.total.horas).toBe(6.5);
    expect(agg.total.net_con_horas).toBe(115);
    expect(agg.total.net_per_hour).toBe(17.69);
    expect(agg.total.propinas).toBe(10);
    expect(agg.total.ganancia).toBe(300);

    const by = Object.fromEntries(agg.porGrupo.map((g) => [g.key, g]));
    expect(Object.keys(by).sort()).toEqual(["flex", "ontrac", "spark"]);
    expect(by.flex.net_per_hour).toBe(17.78);
    expect(by.spark.net_per_hour).toBe(17.5);
    expect(by.ontrac.net_per_hour).toBeNull();
    expect(by.ontrac.net_profit).toBe(157.5);
  });
  it("sin agrupador, porGrupo vacío (llamadas viejas siguen igual)", () => {
    expect(aggregate([rutaVieja()], CFG).porGrupo).toEqual([]);
  });
  it("netPerHour nunca da NaN", () => {
    expect(netPerHour({ horas: 0, net_con_horas: 10 })).toBeNull();
    expect(netPerHour(null)).toBeNull();
  });
  it("ACTIVE_PLATFORMS no incluye OnTrac", () => {
    expect(ACTIVE_PLATFORMS).toEqual(["flex", "spark", "otro"]);
  });
});
