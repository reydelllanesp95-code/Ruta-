// Meta semanal (deuda + inversión): con lo que de verdad entró en la semana
// (lunes→domingo), en qué tramo está Rey y qué toca mover. Lógica pura; RUTA
// no mueve dinero.

import { round2, formatMoney } from "./earnings.js";
import { deliveryOnly } from "./platforms.js";
import { addDays, periodo, propinasPendientes } from "./resumen.js";

export const UMBRALES_DEFAULT = {
  basico: 250, // tramo 1 → 2
  invertir: 700, // tramo 2 → 3
  dorado: 900, // tramo 3 → 4
  deuda: 350, // en tramo 3+
  inversion: 100, // en tramo 3+
  tradingPct: 5, // parte de la inversión a trading (resto, largo plazo)
};

export const TRAMO_COLOR = { 1: "#E2231A", 2: "#F0A33B", 3: "#3DD56D", 4: "#E7C15A" };

const enRango = (f, desde, hasta) => String(f) >= desde && String(f) <= hasta;
const pagado = (v) => (Number(v) > 0 ? Number(v) : 0);

// Neta de la meta = reparto − gasolina pagada − mantenimiento pagado − comidas.
// Las propinas pendientes no suman (no están apuntadas); se cuentan aparte.
export function netaMeta(datos, desde, hasta, hoy = hasta) {
  const { routes = [], fuelups = [], maints = [], meals = [] } = datos;
  const reparto = deliveryOnly(routes).filter((r) => enRango(r.fecha, desde, hasta));
  const ganado = round2(reparto.reduce((s, r) => s + (Number(r.ganancia) || 0), 0));
  const gasolina = round2(fuelups.filter((f) => enRango(f.fecha, desde, hasta)).reduce((s, f) => s + pagado(f.costo), 0));
  const mantenimiento = round2(maints.filter((m) => enRango(m.fecha, desde, hasta)).reduce((s, m) => s + pagado(m.costo), 0));
  const comida = round2(meals.filter((m) => enRango(m.fecha, desde, hasta)).reduce((s, m) => s + pagado(m.costo), 0));
  const porLlegar = propinasPendientes(reparto, addDays(hoy, 1), 3).length;
  return {
    desde,
    hasta,
    ganado,
    gastos: { gasolina, mantenimiento, comida, total: round2(gasolina + mantenimiento + comida) },
    neta: round2(ganado - gasolina - mantenimiento - comida),
    porLlegar,
  };
}

// Tramo, color, frase y reparto para una neta.
export function tramoMeta(neta, u = UMBRALES_DEFAULT) {
  const m = (v) => formatMoney(round2(v));
  const inv = Number(u.inversion) || 0;
  const trading = round2((inv * (Number(u.tradingPct) || 0)) / 100);
  if (neta >= u.dorado) {
    const extra = round2(neta - u.invertir);
    return {
      n: 4,
      color: TRAMO_COLOR[4],
      texto: `Semana dorada: ${m(extra)} extra para ahorro o inversión.`,
      reparto: { tarjetas: 0, deuda: u.deuda, inversion: inv, largoPlazo: round2(inv - trading), trading, extra },
    };
  }
  if (neta >= u.invertir) {
    return {
      n: 3,
      color: TRAMO_COLOR[3],
      texto: `Listo: ${m(u.deuda)} a deuda y ${m(inv)} a invertir. Te faltan ${m(u.dorado - neta)} para el extra.`,
      reparto: { tarjetas: 0, deuda: u.deuda, inversion: inv, largoPlazo: round2(inv - trading), trading, extra: 0 },
    };
  }
  if (neta >= u.basico) {
    const tarjetas = round2(neta - u.basico);
    return {
      n: 2,
      color: TRAMO_COLOR[2],
      texto: `Llevas ${m(tarjetas)} para tarjetas. Te faltan ${m(u.invertir - neta)} para invertir.`,
      reparto: { tarjetas, deuda: 0, inversion: 0, largoPlazo: 0, trading: 0, extra: 0 },
    };
  }
  return {
    n: 1,
    color: TRAMO_COLOR[1],
    texto: `Te faltan ${m(u.basico - Math.max(0, neta))} para cubrir lo básico.`,
    reparto: { tarjetas: 0, deuda: 0, inversion: 0, largoPlazo: 0, trading: 0, extra: 0 },
  };
}

// Las últimas `n` semanas (lunes→domingo) hasta la que contiene `ref`.
export function historialMeta(datos, ref, u = UMBRALES_DEFAULT, n = 8) {
  const out = [];
  let p = periodo("semana", ref, 1);
  for (let i = 0; i < n; i++) {
    const r = netaMeta(datos, p.desde, p.hasta);
    out.unshift({ desde: p.desde, hasta: p.hasta, label: p.label, neta: r.neta, tramo: tramoMeta(r.neta, u).n });
    p = periodo("semana", addDays(p.desde, -7), 1);
  }
  return out;
}

// Umbrales desde la config (con valores por defecto).
export function umbralesDe(config) {
  const c = config || {};
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  return {
    basico: num(c.meta_basico, UMBRALES_DEFAULT.basico),
    invertir: num(c.meta_invertir, UMBRALES_DEFAULT.invertir),
    dorado: num(c.meta_dorado, UMBRALES_DEFAULT.dorado),
    deuda: num(c.meta_deuda, UMBRALES_DEFAULT.deuda),
    inversion: num(c.meta_inversion, UMBRALES_DEFAULT.inversion),
    tradingPct: num(c.meta_trading_pct, UMBRALES_DEFAULT.tradingPct),
  };
}
