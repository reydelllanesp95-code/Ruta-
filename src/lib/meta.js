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

export const TRAMO_COLOR = { colchon: "#4A9BE8", deuda: "#9B87F5", inversion: "#3DD56D", meta: "#C9BCFF" };
export const TRAMO_LABEL = { colchon: "Colchón", deuda: "Deuda", inversion: "Inversión", meta: "Extra a deuda" };
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

// ---- Deuda por cierres: cada tarjeta tiene su día de cierre y Rey apunta el
// saldo que quedó. Nada de pagos sueltos.

// Normaliza lo guardado. Tarjetas de la versión anterior (con `saldo`) pasan
// ese saldo a un primer cierre en la fecha de inicio del plan.
export function sanitizeDeudas(raw, planInicio = UMBRALES_DEFAULT.planInicio) {
  const d = raw && typeof raw === "object" ? raw : {};
  const tarjetas = [];
  const cierres = Array.isArray(d.cierres) ? d.cierres.filter((c) => c && c.tarjetaId && c.fecha && Number.isFinite(Number(c.saldo))) : [];
  for (const t of Array.isArray(d.tarjetas) ? d.tarjetas : []) {
    if (!t || !String(t.nombre || "").trim()) continue;
    const dia = Number(t.diaCierre);
    tarjetas.push({
      id: t.id,
      nombre: String(t.nombre).trim(),
      fase: Number(t.fase) === 2 ? 2 : 1,
      diaCierre: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null,
      apr: pos(t.apr),
    });
    if (pos(t.saldo) > 0 && !cierres.some((c) => c.tarjetaId === t.id)) {
      cierres.push({ id: `${t.id}-inicio`, tarjetaId: t.id, fecha: planInicio, saldo: round2(pos(t.saldo)) });
    }
  }
  return { tarjetas, cierres, promoFin: /^\d{4}-\d{2}-\d{2}$/.test(String(d.promoFin || "")) ? d.promoFin : "" };
}

const porFecha = (a, b) => String(a.fecha).localeCompare(String(b.fecha));

// Saldo de cada tarjeta según el último cierre con fecha < `antesDe` (o ≤ si
// `incluye`). Tarjetas sin cierre aún no cuentan.
export function saldosTarjetas(deudas, antesDe = "9999-12-31", incluye = false) {
  const { tarjetas = [], cierres = [] } = deudas || {};
  const out = [];
  for (const t of tarjetas) {
    const cs = cierres.filter((c) => c.tarjetaId === t.id && (incluye ? c.fecha <= antesDe : c.fecha < antesDe)).sort(porFecha);
    if (!cs.length) continue;
    out.push({ ...t, saldo: round2(pos(cs[cs.length - 1].saldo)), inicial: round2(pos(cs[0].saldo)), ultimoCierre: cs[cs.length - 1].fecha });
  }
  return out;
}

export function faseDeuda(deudas) {
  const ss = saldosTarjetas(deudas);
  if (!ss.some((t) => t.saldo > 0)) return 1;
  return ss.some((t) => t.fase === 1 && t.saldo > 0) ? 1 : 2;
}

export function tarjetaMayorApr(deudas) {
  const vivas = saldosTarjetas(deudas).filter((t) => t.fase === 1 && t.saldo > 0 && t.apr > 0);
  vivas.sort((a, b) => b.apr - a.apr);
  return vivas[0] || null;
}

function semanasPlan(u) {
  return u.planMeses * SEMANAS_POR_MES;
}

// Cuota de deuda para la semana que empieza en `desde`: lo que queda (según
// los cierres anteriores a esa semana) ÷ semanas que faltan del plan.
// Mientras falte el saldo de alguna tarjeta, no se ajusta (evita creer que se
// debe menos y mandar dinero a inversión por error).
export function cuotaSemana(deudas, u, desde) {
  const ss = saldosTarjetas(deudas, desde);
  if (!ss.length || ss.length < (deudas?.tarjetas || []).length) return null;
  const restante = round2(ss.reduce((s, t) => s + t.saldo, 0));
  const pasadas = Math.max(0, (Date.parse(desde) - Date.parse(u.planInicio)) / 86400000 / 7);
  const faltan = Math.max(1, semanasPlan(u) - pasadas);
  return { restante, faltan: round2(faltan), cuota: round2(restante / faltan) };
}

// Umbrales de la semana con la cuota del plan: si baja, lo que sobra va a
// inversión (en la misma proporción); si sube, sube la meta.
export function umbralesConCuota(u, cq) {
  if (!cq) return u;
  const sobra = round2(Math.max(0, u.deuda - cq.cuota));
  const inversion = round2(u.inversion + sobra);
  const k = u.inversion > 0 ? inversion / u.inversion : 1;
  return { ...u, deuda: cq.cuota, inversion, inversiones: u.inversiones.map((x) => ({ ...x, monto: round2(x.monto * k) })) };
}

function textoCuota(u, cq) {
  if (!cq) return "";
  const d = round2(cq.cuota - u.deuda);
  if (Math.abs(d) < 0.01) return "";
  return d < 0
    ? `Vas adelantado con la deuda: la cuota baja a ${m(cq.cuota)}/semana y ${m(-d)} más van a inversión.`
    : `Vas atrasado con la deuda: la cuota sube a ${m(cq.cuota)}/semana (${m(d)} más).`;
}

// Tarjetas cuyo último cierre (según su día) aún no tiene saldo apuntado.
export function cierresPendientes(deudas, hoy) {
  const { tarjetas = [], cierres = [] } = deudas || {};
  const [y, mo, d] = hoy.split("-").map(Number);
  const fechaCierre = (yy, mm, dia) => {
    const ult = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(dia, ult)).padStart(2, "0")}`;
  };
  const out = [];
  for (const t of tarjetas) {
    if (!t.diaCierre) continue;
    let c = fechaCierre(y, mo, t.diaCierre);
    if (c > hoy) c = mo === 1 ? fechaCierre(y - 1, 12, t.diaCierre) : fechaCierre(y, mo - 1, t.diaCierre);
    if (!cierres.some((x) => x.tarjetaId === t.id && x.fecha >= c)) out.push({ tarjeta: t, fechaCierre: c });
  }
  return out;
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
// Con `deudas` y `desde`, la deuda de la semana es la cuota del plan.
export function estadoSemana(neta, uBase, { saldoFondo = 0, deudas = null, desde = null } = {}) {
  const cq = deudas && desde ? cuotaSemana(deudas, uBase, desde) : null;
  const u = umbralesConCuota(uBase, cq);
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
    cuota: cq,
    textoCuota: textoCuota(uBase, cq),
    u,
    inversiones: n >= h.inversion ? u.inversiones : [],
    reparto,
    cruzados,
    invertir: n >= h.inversion,
    hitos: hs,
  };
}

// Para qué es cada parte de la meta, en llano.
const PARA = { colchon: "para el colchón", deuda: "para la deuda de la semana", inversion: "para invertir", meta: "para el extra a la deuda" };
function queEs(id, u) {
  if (id === "colchon") return `Tu fondo de emergencia (hasta ${m(u.fondoTope)}): para una semana mala o un imprevisto.`;
  if (id === "deuda") return "La cuota de las tarjetas de esta semana.";
  if (id === "inversion") return `Para ${(u.inversiones || []).filter((x) => x.monto > 0).map((x) => x.nombre).join(", ") || "tus inversiones"}.`;
  return "Un pago de más a las tarjetas. Con esto cumples la meta.";
}

// Partes de la meta en su orden, con el monto de cada una (no el acumulado),
// lo que llevas en ella y su estado: "hecha", "en curso" o "pendiente".
export function partesSemana(estado) {
  const n = estado.neta;
  return estado.hitos.tramos.map((t) => {
    const monto = round2(t.hasta - t.desde);
    const llevas = round2(Math.min(monto, Math.max(0, n - t.desde)));
    const est = n >= t.hasta ? "hecha" : n > t.desde ? "en curso" : "pendiente";
    return { id: t.id, label: t.label, color: t.color, desde: t.desde, hasta: t.hasta, monto, llevas, estado: est, que: queEs(t.id, estado.u) };
  });
}

// Lo próximo por completar, para ponerlo arriba en grande.
export function proximaMeta(estado) {
  const p = partesSemana(estado).find((x) => x.estado !== "hecha");
  if (p) {
    const falta = round2(p.hasta - estado.neta);
    return { id: p.id, falta, color: p.color, titulo: `Faltan ${m(falta)} ${PARA[p.id]}`, que: p.que };
  }
  const exc = estado.reparto.excedente;
  return {
    id: "cumplida",
    falta: 0,
    color: TRAMO_COLOR.meta,
    excedente: exc,
    titulo: "¡Meta de la semana cumplida!",
    que: exc > 0 ? `Llevas ${m(exc)} de más esta semana.` : "Lo que hagas desde aquí es de más.",
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
export function compensacion(datos, u, saldoFondo, semana, hoy, deudas = null) {
  const est = estadoSemana(netaMeta(datos, semana.desde, semana.hasta, hoy).neta, u, { saldoFondo, deudas, desde: semana.desde });
  if (est.invertir) return false;
  return mesMeta(datos, u, saldoFondo, semana.hasta, semana.hasta).adelante;
}

// Últimas `n` semanas (lunes→domingo) hasta la que contiene `ref`.
export function historialMeta(datos, ref, u, n = 8, fondo = null, deudas = null) {
  const out = [];
  let p = periodo("semana", ref, 1);
  for (let i = 0; i < n; i++) {
    const r = netaMeta(datos, p.desde, p.hasta);
    const est = estadoSemana(r.neta, u, { saldoFondo: fondo ? fondo.saldoPara(p.desde) : pos(u.fondoInicial), deudas, desde: p.desde });
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

// Plan de deuda de `planMeses` meses según los saldos de cierre: lo que queda
// contra lo que tocaba quedar hoy, y la cuota de esta semana.
export function planDeuda(deudas, u, hoy) {
  const { promoFin = "" } = deudas || {};
  const ss = saldosTarjetas(deudas, hoy, true);
  const total = round2(ss.reduce((s, t) => s + t.inicial, 0));
  const restante = round2(ss.reduce((s, t) => s + t.saldo, 0));
  const pagado = round2(Math.max(0, total - restante));
  const sp = semanasPlan(u);
  const semanal = total > 0 ? round2(total / sp) : 0;
  const transcurridas = Math.max(0, (Date.parse(hoy) - Date.parse(u.planInicio)) / 86400000 / 7);
  const esperadoQuede = Math.max(0, total * (1 - transcurridas / sp));
  const diff = semanal > 0 ? Math.round((esperadoQuede - restante) / semanal) : 0;
  const plural = (k) => `${k} semana${k === 1 ? "" : "s"}`;
  const faltan = (deudas?.tarjetas || []).filter((t) => !ss.some((x) => x.id === t.id)).map((t) => t.nombre);
  const textoPlan = !ss.length
    ? "Pon tus tarjetas y su día de cierre en Ajustes; RUTA te pedirá el saldo de cada cierre."
    : faltan.length
    ? `Falta el saldo de ${faltan.join(", ")}: hasta tenerlo, la cuota se queda en ${m(u.deuda)}.`
    : diff > 0
    ? `Vas ${plural(diff)} por delante del plan de ${u.planMeses} meses.`
    : diff < 0
    ? `Vas ${plural(-diff)} por detrás del plan de ${u.planMeses} meses.`
    : `Vas al día con el plan de ${u.planMeses} meses.`;
  const fechaPlan = addDays(u.planInicio, Math.round(sp * 7));
  const cq = cuotaSemana(deudas, u, periodo("semana", hoy, 1).desde);
  const porTarjeta = saldosTarjetas(deudas, hoy, true).sort((a, b) => a.fase - b.fase || b.apr - a.apr);
  let discover = null;
  const d = ss.find((t) => t.fase === 2);
  if (d && promoFin) {
    const objetivo = addDays(promoFin, -21);
    const semanas = Math.max(0, (Date.parse(objetivo) - Date.parse(hoy)) / 86400000 / 7);
    discover = { nombre: d.nombre, objetivo, restante: d.saldo, porSemana: semanas > 0 ? round2(d.saldo / semanas) : d.saldo };
  }
  return { total, pagado, restante, semanal, semanasDiff: diff, textoPlan, fase: faseDeuda(deudas), fechaPlan, cuota: cq, porTarjeta, discover, pendientes: cierresPendientes(deudas, hoy) };
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Cuánto bajó o subió cada tarjeta: su último saldo (hasta `hoy`) contra el
// último cierre de un mes anterior. Devuelve { [id]: { diff, mes, texto } };
// diff null si aún no hay mes anterior.
export function cambioTarjetas(deudas, hoy) {
  const out = {};
  for (const t of deudas?.tarjetas || []) {
    const cs = (deudas.cierres || []).filter((c) => c.tarjetaId === t.id && c.fecha <= hoy).sort(porFecha);
    if (!cs.length) continue;
    const ult = cs[cs.length - 1];
    const mesUlt = String(ult.fecha).slice(0, 7);
    const prev = cs.filter((c) => String(c.fecha).slice(0, 7) < mesUlt).at(-1);
    if (!prev) {
      out[t.id] = { diff: null, mes: null, texto: "sin mes anterior todavía" };
      continue;
    }
    const diff = round2(pos(ult.saldo) - pos(prev.saldo));
    const mes = MESES[Number(String(prev.fecha).slice(5, 7)) - 1];
    const texto = diff === 0 ? `igual que ${mes}` : `${diff < 0 ? "−" : "+"}${m(Math.abs(diff))} vs ${mes}`;
    out[t.id] = { diff, mes, texto };
  }
  return out;
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
