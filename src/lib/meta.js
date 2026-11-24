// Meta semanal v2 (fondo colchón → deuda → inversión → meta), barra mensual,
// fondo colchón y plan de deuda. Semana lunes→domingo. Lógica pura: RUTA no
// mueve dinero ni se conecta a bancos. Criterios: docs/criterios-meta-v2.md.

import { round2, formatMoney } from "./earnings.js";
import { deliveryOnly } from "./platforms.js";
import { addDays, periodo, propinasPendientes } from "./resumen.js";

export const INVERSIONES_DEFAULT = [
  { nombre: "VOO", monto: 40 },
  { nombre: "SCHD", monto: 15 },
  { nombre: "NVDA", monto: 10 },
  { nombre: "BTC", monto: 15 },
  { nombre: "ETH", monto: 13 },
  { nombre: "altcoins", monto: 7 },
];

export const UMBRALES_DEFAULT = {
  colchon: 80, // al fondo colchón
  deuda: 680, // a tarjetas (con el fondo lleno: + colchón)
  inversion: 100,
  extra: 40, // extra a deuda al cumplir la meta
  fondoTope: 500,
  fondoInicial: 0,
  fondoDesde: "2026-11-23",
  planInicio: "2026-11-23",
  planMeses: 5,
  inversiones: INVERSIONES_DEFAULT,
};

export const TRAMO_COLOR = { colchon: "#4A9BE8", deuda: "#F0A33B", inversion: "#3DD56D", meta: "#E7C15A" };
export const TRAMO_LABEL = { colchon: "Colchón", deuda: "Deuda", inversion: "Inversión", meta: "Meta" };
export const SEMANAS_POR_MES = 52 / 12;

const enRango = (f, desde, hasta) => String(f) >= desde && String(f) <= hasta;
const pos = (v) => (Number(v) > 0 ? Number(v) : 0);
const m = (v) => formatMoney(round2(v));

// Neta = reparto − gasolina pagada − mantenimiento pagado − comidas − peajes.
// Las propinas pendientes no suman (no están apuntadas); se cuentan aparte.
export function netaMeta(datos, desde, hasta, hoy = hasta) {
  const { routes = [], fuelups = [], maints = [], meals = [], tolls = [] } = datos;
  const reparto = deliveryOnly(routes).filter((r) => enRango(r.fecha, desde, hasta));
  const ganado = round2(reparto.reduce((s, r) => s + (Number(r.ganancia) || 0), 0));
  const suma = (lista, campo) => round2(lista.filter((x) => enRango(x.fecha, desde, hasta)).reduce((s, x) => s + pos(x[campo]), 0));
  const gasolina = suma(fuelups, "costo");
  const mantenimiento = suma(maints, "costo");
  const comida = suma(meals, "costo");
  const peajes = suma(tolls, "monto");
  const total = round2(gasolina + mantenimiento + comida + peajes);
  const porLlegar = propinasPendientes(reparto, addDays(hoy, 1), 3).length;
  return { desde, hasta, ganado, gastos: { gasolina, mantenimiento, comida, peajes, total }, neta: round2(ganado - total), porLlegar };
}

// Hitos de una semana según el saldo del fondo. Con el fondo lleno no hay
// tramo de colchón y la deuda absorbe esos dólares (la meta no cambia).
export function hitosSemana(u, saldoFondo = 0) {
  const colchon = round2(Math.max(0, Math.min(u.colchon, u.fondoTope - saldoFondo)));
  const deuda = round2(u.deuda + (u.colchon - colchon));
  const h = { colchon, deuda: round2(colchon + deuda) };
  h.inversion = round2(h.deuda + u.inversion);
  h.meta = round2(h.inversion + u.extra);
  const tramos = [];
  let desde = 0;
  for (const id of ["colchon", "deuda", "inversion", "meta"]) {
    if (h[id] > desde) tramos.push({ id, desde, hasta: h[id], color: TRAMO_COLOR[id], label: TRAMO_LABEL[id] });
    desde = Math.max(desde, h[id]);
  }
  return { colchon, deuda, h, tramos, meta: h.meta };
}

// Mismos hitos a escala de un mes (meta semanal × 52 / 12).
export function hitosMes(u, saldoFondo = 0) {
  const s = hitosSemana(u, saldoFondo);
  const f = (v) => Math.round(v * SEMANAS_POR_MES);
  const tramos = s.tramos.map((t) => ({ ...t, desde: f(t.desde), hasta: f(t.hasta) }));
  return { tramos, meta: f(s.meta), h: Object.fromEntries(Object.entries(s.h).map(([k, v]) => [k, f(v)])) };
}

// Fase 1 mientras quede saldo en alguna tarjeta de fase 1.
export function restanteTarjeta(t, pagos = []) {
  return round2(Math.max(0, pos(t.saldo) - pagos.filter((p) => p.tarjetaId === t.id).reduce((s, p) => s + pos(p.monto), 0)));
}

export function faseDeuda(deudas) {
  const { tarjetas = [], pagos = [] } = deudas || {};
  const f1 = tarjetas.filter((t) => Number(t.fase) === 1);
  if (!f1.length) return tarjetas.some((t) => Number(t.fase) === 2) ? 2 : 1;
  return f1.some((t) => restanteTarjeta(t, pagos) > 0) ? 1 : 2;
}

export function tarjetaMayorApr(deudas) {
  const { tarjetas = [], pagos = [] } = deudas || {};
  const vivas = tarjetas.filter((t) => Number(t.fase) === 1 && restanteTarjeta(t, pagos) > 0);
  vivas.sort((a, b) => pos(b.apr) - pos(a.apr));
  return vivas[0] || null;
}

function consejoExcedente(excedente, deudas) {
  if (!(excedente > 0)) return "";
  if (faseDeuda(deudas) === 1) {
    const t = tarjetaMayorApr(deudas);
    return `Tienes ${m(excedente)} de más. Recomendado: todo a ${t ? t.nombre : "la tarjeta con mayor interés"}.`;
  }
  const d = (deudas?.tarjetas || []).find((t) => Number(t.fase) === 2);
  return `Tienes ${m(excedente)} de más. Recomendado: mitad a ${d ? d.nombre : "Discover"}, mitad a ahorro para la casa.`;
}

// Estado de la semana: tramo, frase, reparto y hitos cruzados.
export function estadoSemana(neta, u, { saldoFondo = 0, deudas = null } = {}) {
  const hs = hitosSemana(u, saldoFondo);
  const { h } = hs;
  const n = round2(neta);
  const cruzados = hs.tramos.filter((t) => n >= t.hasta).map((t) => t.id);
  const reparto = {
    fondo: round2(Math.min(Math.max(n, 0), h.colchon)),
    tarjetas: round2(Math.min(Math.max(n - h.colchon, 0), h.deuda - h.colchon)),
    inversion: n >= h.inversion ? u.inversion : 0,
    sinAsignar: n >= h.deuda && n < h.inversion ? round2(n - h.deuda) : 0,
    extra: n >= h.meta ? u.extra : 0,
    excedente: n > h.meta ? round2(n - h.meta) : 0,
  };
  let tramo, texto;
  if (n < h.colchon) {
    tramo = "colchon";
    texto = `Te faltan ${m(h.colchon - Math.max(0, n))} para el colchón.`;
  } else if (n < h.deuda) {
    tramo = "deuda";
    texto = `Llevas ${m(n - h.colchon)} para tarjetas. Te faltan ${m(h.deuda - n)} para cubrir la deuda de la semana.`;
  } else if (n < h.inversion) {
    tramo = "inversion";
    texto = `Deuda de la semana cubierta. Te faltan ${m(h.inversion - n)} para invertir.`;
  } else if (n < h.meta) {
    tramo = "meta";
    texto = `¡Ya puedes invertir tus ${m(u.inversion)}!`;
  } else {
    tramo = "meta";
    texto = `Meta cumplida. ${m(u.extra)} extra a deuda.`;
  }
  const color = n >= h.meta ? TRAMO_COLOR.meta : TRAMO_COLOR[cruzados.length ? cruzados[cruzados.length - 1] : "colchon"];
  return {
    neta: n,
    tramo,
    color,
    texto,
    consejo: consejoExcedente(reparto.excedente, deudas),
    inversiones: n >= h.inversion ? u.inversiones : [],
    reparto,
    cruzados,
    invertir: n >= h.inversion,
    hitos: hs,
  };
}

// Fondo colchón: desde `fondoDesde`, cada semana que la neta cruza su tramo de
// colchón suma ese tramo (sin pasar del tope). Los usos restan desde su fecha.
// Devuelve el saldo con que arranca cada semana y el saldo actual.
export function fondoColchon(datos, u, usos = [], hoy) {
  const semanas = new Map(); // desde → { saldoTramo, aporte, saldoFin }
  let saldo = pos(u.fondoInicial);
  let p = periodo("semana", u.fondoDesde, 1);
  const ultima = periodo("semana", hoy, 1).desde;
  let lleno = null;
  while (p.desde <= ultima) {
    const hasta = p.hasta < hoy ? p.hasta : hoy;
    const usado = (usos || []).filter((x) => enRango(x.fecha, p.desde, hasta)).reduce((s, x) => s + pos(x.monto), 0);
    saldo = round2(Math.max(0, saldo - usado));
    const saldoTramo = saldo;
    const { colchon } = hitosSemana(u, saldo);
    const neta = netaMeta(datos, p.desde, hasta, hoy).neta;
    const aporte = colchon > 0 && neta >= colchon ? colchon : 0;
    saldo = round2(saldo + aporte);
    if (aporte > 0 && saldo >= u.fondoTope && lleno == null) lleno = p.desde;
    semanas.set(p.desde, { saldoTramo, aporte, saldoFin: saldo });
    p = periodo("semana", addDays(p.desde, 7), 1);
  }
  return {
    saldo,
    lleno: saldo >= u.fondoTope,
    llenoEn: lleno,
    semanas,
    // Saldo con que se calcula el tramo de la semana que empieza en `desde`.
    saldoPara(desde) {
      if (semanas.has(desde)) return semanas.get(desde).saldoTramo;
      return desde < u.fondoDesde ? pos(u.fondoInicial) : saldo;
    },
  };
}

export const MENSAJE_FONDO_LLENO = (u) => `Fondo de colchón completo (${m(u.fondoTope)}). Desde ahora tus ${m(u.colchon)} van a deuda.`;

// Barra mensual: neta del mes hasta `hoy` y ritmo esperado por días.
export function mesMeta(datos, u, saldoFondo, ref, hoy) {
  const p = periodo("mes", ref, 1);
  const corte = p.hasta < hoy ? p.hasta : hoy;
  const neta = corte >= p.desde ? netaMeta(datos, p.desde, corte, hoy).neta : 0;
  const hm = hitosMes(u, saldoFondo);
  const diasMes = Number(p.hasta.slice(8, 10));
  const dia = corte >= p.desde ? Number(corte.slice(8, 10)) : 0;
  const esperado = round2((hm.meta * dia) / diasMes);
  const diferencia = round2(neta - esperado);
  const texto = diferencia >= 0 ? `Vas ${m(diferencia)} por delante del ritmo del mes.` : `Vas ${m(-diferencia)} por detrás del ritmo del mes.`;
  return { ...p, neta, esperado, diferencia, adelante: diferencia >= 0, texto, hitos: hm, meta: hm.meta };
}

// Semana floja (no llegó a invertir) pero el mes va por delante del ritmo al
// cierre de esa semana → puede invertir igual.
export const MENSAJE_COMPENSACION = "Esta semana fue floja, pero el mes va bien: puedes invertir igual.";
export function compensacion(datos, u, saldoFondo, semana, hoy) {
  const est = estadoSemana(netaMeta(datos, semana.desde, semana.hasta, hoy).neta, u, { saldoFondo });
  if (est.invertir) return false;
  return mesMeta(datos, u, saldoFondo, semana.hasta, semana.hasta).adelante;
}

// Últimas `n` semanas (lunes→domingo) hasta la que contiene `ref`.
export function historialMeta(datos, ref, u, n = 8, fondo = null) {
  const out = [];
  let p = periodo("semana", ref, 1);
  for (let i = 0; i < n; i++) {
    const r = netaMeta(datos, p.desde, p.hasta);
    const est = estadoSemana(r.neta, u, { saldoFondo: fondo ? fondo.saldoPara(p.desde) : pos(u.fondoInicial) });
    out.unshift({ desde: p.desde, hasta: p.hasta, label: p.label, neta: r.neta, color: est.color, cumplida: r.neta >= est.hitos.meta, invirtio: est.invertir });
    p = periodo("semana", addDays(p.desde, -7), 1);
  }
  return out;
}

// Últimos `n` meses: ¿llegó a la meta mensual?
export function historialMeses(datos, u, ref, hoy, n = 6, saldoFondo = 0) {
  const out = [];
  let [y, mo] = ref.split("-").map(Number);
  for (let i = 0; i < n; i++) {
    const r = mesMeta(datos, u, saldoFondo, `${y}-${String(mo).padStart(2, "0")}-01`, hoy);
    out.unshift({ desde: r.desde, label: r.label, neta: r.neta, meta: r.meta, llego: r.neta >= r.meta });
    mo -= 1;
    if (mo === 0) { mo = 12; y -= 1; }
  }
  return out;
}

// Plan de deuda de `planMeses` meses: lo pagado («Pagué») contra lo que tocaba.
export function planDeuda(deudas, u, hoy) {
  const { tarjetas = [], pagos = [], promoFin = "" } = deudas || {};
  const total = round2(tarjetas.reduce((s, t) => s + pos(t.saldo), 0));
  const pagado = round2(pagos.filter((p) => tarjetas.some((t) => t.id === p.tarjetaId)).reduce((s, p) => s + pos(p.monto), 0));
  const restante = round2(Math.max(0, total - pagado));
  const semanasPlan = u.planMeses * SEMANAS_POR_MES;
  const semanal = total > 0 ? round2(total / semanasPlan) : 0;
  const dias = Math.max(0, (Date.parse(hoy) - Date.parse(u.planInicio)) / 86400000);
  const transcurridas = dias / 7;
  const esperado = Math.min(total, semanal * transcurridas);
  const diff = semanal > 0 ? Math.round((pagado - esperado) / semanal) : 0;
  const plural = (k) => `${k} semana${k === 1 ? "" : "s"}`;
  const textoPlan = !total
    ? "Apunta tus tarjetas en Ajustes para ver el plan de deuda."
    : diff > 0
    ? `Vas ${plural(diff)} por delante del plan de ${u.planMeses} meses.`
    : diff < 0
    ? `Vas ${plural(-diff)} por detrás del plan de ${u.planMeses} meses.`
    : `Vas al día con el plan de ${u.planMeses} meses.`;
  const ritmo = transcurridas >= 1 && pagado > 0 ? pagado / transcurridas : semanal || u.deuda;
  const fechaFin = restante > 0 && ritmo > 0 ? addDays(hoy, Math.ceil((restante / ritmo) * 7)) : null;
  const porTarjeta = tarjetas
    .map((t) => ({ ...t, restante: restanteTarjeta(t, pagos) }))
    .sort((a, b) => Number(a.fase) - Number(b.fase) || pos(b.apr) - pos(a.apr));
  let discover = null;
  const d = tarjetas.find((t) => Number(t.fase) === 2);
  if (d && promoFin) {
    const objetivo = addDays(promoFin, -21);
    const semanas = Math.max(0, (Date.parse(objetivo) - Date.parse(hoy)) / 86400000 / 7);
    const quedan = restanteTarjeta(d, pagos);
    discover = { nombre: d.nombre, objetivo, restante: quedan, porSemana: semanas > 0 ? round2(quedan / semanas) : quedan };
  }
  return { total, pagado, restante, semanal, semanasDiff: diff, textoPlan, fase: faseDeuda(deudas), fechaFin, porTarjeta, discover };
}

// Hitos de la semana `desde` que aún no se avisaron (uno por semana cada uno).
export function hitosNuevos(desde, cruzados, avisados = {}) {
  const ya = new Set(avisados[desde] || []);
  return cruzados.filter((id) => !ya.has(id));
}

export function marcarAvisados(desde, ids, avisados = {}) {
  return { ...avisados, [desde]: [...new Set([...(avisados[desde] || []), ...ids])] };
}

export const TEXTO_AVISO = {
  colchon: "Colchón cubierto: van al fondo.",
  deuda: "Deuda de la semana cubierta.",
  inversion: "¡Inversión desbloqueada!",
  meta: "Meta de la semana cumplida.",
};

// Umbrales desde la config (con valores por defecto).
export function umbralesDe(config) {
  const c = config || {};
  const num = (v, d) => (v !== "" && v != null && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  const fecha = (v, d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : d);
  const D = UMBRALES_DEFAULT;
  const inv = Array.isArray(c.meta_inversiones) && c.meta_inversiones.length ? c.meta_inversiones : D.inversiones;
  const inversiones = inv.map((x) => ({ nombre: String(x.nombre || ""), monto: num(x.monto, 0) }));
  return {
    colchon: num(c.meta_colchon, D.colchon),
    deuda: num(c.meta_deuda_semana, D.deuda),
    inversion: round2(inversiones.reduce((s, x) => s + x.monto, 0)),
    extra: num(c.meta_extra, D.extra),
    fondoTope: num(c.fondo_tope, D.fondoTope),
    fondoInicial: num(c.fondo_inicial, D.fondoInicial),
    fondoDesde: fecha(c.fondo_desde, D.fondoDesde),
    planInicio: fecha(c.plan_inicio, D.planInicio),
    planMeses: num(c.plan_meses, D.planMeses) || D.planMeses,
    inversiones,
  };
}
