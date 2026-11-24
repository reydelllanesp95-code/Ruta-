// Resúmenes por periodo (semana de pago, mes, año) y por día: lo ganado, las
// deducciones (gasolina y mantenimiento estimados + comida y peajes apuntados)
// y el neto. Lógica pura; se calcula al mostrar, no se guarda.

import { round2, routeEconomics, payWeekStart, payWeekEnd, fechaCorta, monthLabel } from "./earnings.js";
import { deliveryOnly, platformOf, platformLabel, isShift } from "./platforms.js";
import { horasJornada } from "./jornada.js";

function iso(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function addDays(fecha, n) {
  const [y, m, d] = fecha.split("-").map(Number);
  return iso(new Date(Date.UTC(y, m - 1, d + n)));
}

// Periodo que contiene `ref`: { tipo, desde, hasta, label }.
export function periodo(tipo, ref, startDow = 6) {
  const [y, m] = ref.split("-").map(Number);
  if (tipo === "semana") {
    const desde = payWeekStart(ref, startDow);
    const hasta = payWeekEnd(desde);
    return { tipo, desde, hasta, label: `${fechaCorta(desde)} – ${fechaCorta(hasta)}` };
  }
  if (tipo === "mes") {
    const desde = `${y}-${String(m).padStart(2, "0")}-01`;
    const hasta = iso(new Date(Date.UTC(y, m, 0)));
    return { tipo, desde, hasta, label: monthLabel(desde.slice(0, 7)) };
  }
  return { tipo: "año", desde: `${y}-01-01`, hasta: `${y}-12-31`, label: String(y) };
}

// El periodo anterior (delta -1) o siguiente (+1) del mismo tipo.
export function moverPeriodo(p, delta, startDow = 6) {
  if (p.tipo === "semana") return periodo("semana", addDays(p.desde, 7 * delta), startDow);
  if (p.tipo === "mes") {
    const [y, m] = p.desde.split("-").map(Number);
    return periodo("mes", iso(new Date(Date.UTC(y, m - 1 + delta, 1))), startDow);
  }
  return periodo("año", `${Number(p.desde.slice(0, 4)) + delta}-01-01`, startDow);
}

const enRango = (f, desde, hasta) => f >= desde && f <= hasta;

function costoReal(v) {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : 0;
}

// datos: { routes (con millas de jornada ya repartidas), meals, tolls,
// fuelups, jornadas, configFor }. Devuelve los totales del rango [desde, hasta].
// Las horas de un día con jornada son las de la jornada (salida → «paré» o
// llegada); sin jornada, las de sus turnos.
export function resumenRango(datos, desde, hasta) {
  const { routes = [], meals = [], tolls = [], fuelups = [], jornadas = [], configFor } = datos;
  const horasDia = new Map();
  for (const j of jornadas) {
    if (!enRango(j.fecha, desde, hasta)) continue;
    const h = horasJornada(j);
    if (h != null) horasDia.set(j.fecha, round2((horasDia.get(j.fecha) || 0) + h));
  }
  const regs = deliveryOnly(routes).filter((r) => enRango(r.fecha, desde, hasta));
  let ganado = 0, propinas = 0, horas = 0, millas = 0, gasolina = 0, mantenimiento = 0;
  const apps = new Map();
  const dias = new Set();
  for (const r of regs) {
    const eco = routeEconomics(r, configFor ? configFor(r) : undefined);
    const g = Number(r.ganancia) || 0;
    const h = Number(r.horasReales) > 0 ? Number(r.horasReales) : Number(r.horas) > 0 ? Number(r.horas) : 0;
    ganado += g;
    propinas += Number(r.propina) || 0;
    if (!horasDia.has(r.fecha)) horas += h;
    millas += Number(r.millas) || 0;
    gasolina += eco.fuel_cost;
    mantenimiento += eco.maintenance_est;
    dias.add(r.fecha);
    const k = platformOf(r);
    const a = apps.get(k) || { plataforma: k, label: platformLabel(k), ganado: 0, horas: 0, registros: 0 };
    a.ganado += g;
    a.horas += h;
    a.registros += 1;
    apps.set(k, a);
  }
  for (const [f, h] of horasDia) if (dias.has(f)) horas += h;
  const comida = meals.filter((m) => enRango(String(m.fecha), desde, hasta)).reduce((s, m) => s + costoReal(m.costo), 0);
  const peajes = tolls.filter((t) => enRango(String(t.fecha), desde, hasta)).reduce((s, t) => s + costoReal(t.monto), 0);
  const gasolinaPagada = fuelups.filter((f) => enRango(String(f.fecha), desde, hasta)).reduce((s, f) => s + costoReal(f.costo), 0);
  const deducciones = {
    gasolina: round2(gasolina),
    mantenimiento: round2(mantenimiento),
    comida: round2(comida),
    peajes: round2(peajes),
  };
  deducciones.total = round2(deducciones.gasolina + deducciones.mantenimiento + deducciones.comida + deducciones.peajes);
  const neto = round2(ganado - deducciones.total);
  return {
    desde,
    hasta,
    registros: regs.length,
    dias: dias.size,
    ganado: round2(ganado),
    propinas: round2(propinas),
    horas: round2(horas),
    millas: round2(millas),
    deducciones,
    neto,
    netoHora: horas > 0 ? round2(neto / horas) : null,
    gasolinaPagada: round2(gasolinaPagada),
    porApp: [...apps.values()]
      .map((a) => ({ ...a, ganado: round2(a.ganado), horas: round2(a.horas), ganadoHora: a.horas > 0 ? round2(a.ganado / a.horas) : null }))
      .sort((a, b) => b.ganado - a.ganado),
  };
}

// Resumen del periodo, del anterior y del neto de los últimos `n` periodos.
export function resumenPeriodo(datos, p, startDow = 6, n = 4) {
  const actual = resumenRango(datos, p.desde, p.hasta);
  const prevP = moverPeriodo(p, -1, startDow);
  const anterior = { ...resumenRango(datos, prevP.desde, prevP.hasta), label: prevP.label };
  const serie = [];
  let q = p;
  for (let i = 0; i < n; i++) {
    const r = resumenRango(datos, q.desde, q.hasta);
    serie.unshift({ label: q.label, desde: q.desde, neto: r.neto });
    q = moverPeriodo(q, -1, startDow);
  }
  return { actual, anterior, serie };
}

// El día: resumen + `lista` con sus registros (todos, incluidas limpiezas) en orden.
export function resumenDia(datos, fecha) {
  const r = resumenRango(datos, fecha, fecha);
  const registros = (datos.routes || [])
    .filter((x) => x.fecha === fecha)
    .sort((a, b) => String(a.horaInicio || "99").localeCompare(String(b.horaInicio || "99")));
  return { ...r, fecha, lista: registros };
}

// Bloques de Flex de los últimos `dias` días (sin hoy) con propina $0: la
// propina de Flex llega al día siguiente.
export function propinasPendientes(routes, hoy, dias = 3) {
  const desde = addDays(hoy, -dias);
  return (routes || []).filter(
    (r) => isShift(r) && r.plataforma === "flex" && r.horaInicio && r.fecha >= desde && r.fecha < hoy && !(Number(r.propina) > 0)
  );
}

// Filas para el resumen del año (CSV para el contador).
export function filasAño(datos, año) {
  const r = resumenRango(datos, `${año}-01-01`, `${año}-12-31`);
  const filas = [["concepto", "valor"]];
  for (const a of r.porApp) filas.push([`ingresos ${a.label}`, a.ganado.toFixed(2)]);
  filas.push(["ingresos total", r.ganado.toFixed(2)]);
  filas.push(["propinas (incluidas en ingresos)", r.propinas.toFixed(2)]);
  filas.push(["millas de trabajo", r.millas.toFixed(1)]);
  filas.push(["horas", r.horas.toFixed(1)]);
  filas.push(["gasolina pagada", r.gasolinaPagada.toFixed(2)]);
  filas.push(["comida", r.deducciones.comida.toFixed(2)]);
  filas.push(["peajes", r.deducciones.peajes.toFixed(2)]);
  const mant = (datos.maints || []).filter((m) => String(m.fecha).startsWith(String(año))).reduce((s, m) => s + costoReal(m.costo), 0);
  filas.push(["mantenimiento pagado", round2(mant).toFixed(2)]);
  return { resumen: r, filas, mantenimientoPagado: round2(mant) };
}
