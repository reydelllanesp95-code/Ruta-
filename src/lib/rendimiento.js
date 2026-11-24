// ¿Cuándo le rinde más a Rey? $/h después de gasolina por día de la semana y
// por franja horaria, separado por app. Lógica pura. Criterios:
// docs/criterios-por-hora-millas-lyft.md.

import { round2, routeEconomics } from "./earnings.js";
import { deliveryOnly, platformOf } from "./platforms.js";
import { addDays } from "./resumen.js";

export const FRANJAS = [
  { id: "madrugada", label: "Madrugada", desde: 0, hasta: 6 * 60 },
  { id: "manana", label: "Mañana", desde: 6 * 60, hasta: 12 * 60 },
  { id: "tarde", label: "Tarde", desde: 12 * 60, hasta: 17 * 60 },
  { id: "noche", label: "Noche", desde: 17 * 60, hasta: 24 * 60 },
];
// Lunes primero, como la semana de Rey.
export const DIAS_SEMANA = [
  { dow: 1, label: "Lunes" }, { dow: 2, label: "Martes" }, { dow: 3, label: "Miércoles" }, { dow: 4, label: "Jueves" },
  { dow: 5, label: "Viernes" }, { dow: 6, label: "Sábado" }, { dow: 0, label: "Domingo" },
];
export const MIN_HORAS = 1;

const mins = (h) => {
  const m = String(h || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const dowDe = (fecha) => {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

// Minutos del tramo [a, b) (b puede pasar de medianoche) dentro de cada franja.
function minutosPorFranja(a, b) {
  const fin = b > a ? b : b + 1440;
  const out = Object.fromEntries(FRANJAS.map((f) => [f.id, 0]));
  for (const off of [0, 1440]) {
    for (const f of FRANJAS) {
      const ini = Math.max(a, f.desde + off), hasta = Math.min(fin, f.hasta + off);
      if (hasta > ini) out[f.id] += hasta - ini;
    }
  }
  return out;
}

// datos: { routes (con millas de jornada), configFor }. Ventana: `semanas`
// semanas que terminan en `hasta`.
export function rendimiento(datos, hasta, semanas = 8) {
  const desde = addDays(hasta, -7 * semanas + 1);
  const { routes = [], configFor } = datos;
  const celda = () => ({ ganado: 0, horas: 0 });
  const dias = new Map(DIAS_SEMANA.map((d) => [d.dow, {}]));
  const franjas = new Map(FRANJAS.map((f) => [f.id, {}]));
  const apps = new Set();
  const suma = (mapa, k, app, g, h) => {
    const c = (mapa.get(k)[app] ||= celda());
    c.ganado += g;
    c.horas += h;
  };
  for (const r of deliveryOnly(routes)) {
    if (!(r.fecha >= desde && r.fecha <= hasta)) continue;
    const h = Number(r.horasReales) > 0 ? Number(r.horasReales) : Number(r.horas) || 0;
    if (!(h > 0)) continue;
    const app = platformOf(r);
    apps.add(app);
    const gas = configFor ? routeEconomics(r, configFor(r)).fuel_cost : 0;
    const g = (Number(r.ganancia) || 0) - gas;
    suma(dias, dowDe(r.fecha), app, g, h);
    const a = mins(r.horaInicio), b = mins(r.horaFin);
    if (a == null || b == null || a === b) continue;
    const pf = minutosPorFranja(a, b);
    const total = Object.values(pf).reduce((s, x) => s + x, 0);
    for (const f of FRANJAS) if (pf[f.id] > 0) suma(franjas, f.id, app, (g * pf[f.id]) / total, (h * pf[f.id]) / total);
  }
  const fmt = (c) => (c && c.horas >= MIN_HORAS ? { horas: round2(c.horas), ganado: round2(c.ganado), porHora: round2(c.ganado / c.horas) } : c ? { horas: round2(c.horas), ganado: round2(c.ganado), porHora: null } : null);
  const listaApps = [...apps].sort();
  const filas = (mapa, defs, key) =>
    defs.map((d) => ({ id: d[key], label: d.label, porApp: Object.fromEntries(listaApps.map((a) => [a, fmt(mapa.get(d[key])[a])])) }));
  const porDia = filas(dias, DIAS_SEMANA, "dow");
  const porFranja = filas(franjas, FRANJAS, "id");
  const mejor = (fs) => {
    let best = null;
    for (const f of fs) for (const a of listaApps) {
      const c = f.porApp[a];
      if (c && c.porHora != null && (!best || c.porHora > best.porHora)) best = { label: f.label, app: a, porHora: c.porHora };
    }
    return best;
  };
  return { desde, hasta, apps: listaApps, porDia, porFranja, mejorDia: mejor(porDia), mejorFranja: mejor(porFranja) };
}
