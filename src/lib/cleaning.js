// Limpiezas (EverOP / Corvus): locales y resumen mensual por local. Lógica PURA.
//
// Corvus paga una cantidad fija al mes por local y descuenta fees (%) y la
// cuota del Finder's Fee. Lo que cuesta llegar (gas + mantenimiento) sale de
// los viajes apuntados. Con las horas puerta a puerta se saca el $/hora real.
//
// Los locales viven SOLO en el teléfono (el repositorio es público).

import { CORVUS_FEE_PCT_DEFAULT } from "./constants.js";
import { makeUUID, round2, routeEconomics, monthKey } from "./earnings.js";
import { isCleaning } from "./platforms.js";

function num(v, fallback = 0) {
  const n = Number(v);
  return v !== "" && v != null && Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function sanitizeLocal(l) {
  const x = l && typeof l === "object" ? l : {};
  const fee = num(x.feePct, CORVUS_FEE_PCT_DEFAULT);
  return {
    id: x.id || makeUUID(),
    nombre: String(x.nombre || "").trim(),
    facturacion: x.facturacion === "" || x.facturacion == null ? null : num(x.facturacion, null),
    feePct: fee > 100 ? 100 : fee,
    cuotaFinder: num(x.cuotaFinder, 0),
  };
}

export function validateLocal(l) {
  if (!String((l && l.nombre) || "").trim()) return { ok: false, error: "Pon el nombre del local." };
  for (const [k, label] of [["facturacion", "La facturación"], ["feePct", "El % de fees"], ["cuotaFinder", "La cuota"]]) {
    const v = l[k];
    if (v === "" || v == null) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${label} debe ser un número ≥ 0.` };
  }
  if (Number(l.feePct) > 100) return { ok: false, error: "El % de fees no puede pasar de 100." };
  return { ok: true };
}

// Lo que deposita Corvus al mes por ese local. Sin facturación → null.
export function corvusNet(local) {
  if (!local || local.facturacion == null) return null;
  return round2(local.facturacion * (1 - local.feePct / 100) - local.cuotaFinder);
}

function key(s) {
  return String(s || "").trim().toLowerCase();
}

// Resumen de un mes (YYYY-MM): por local y total.
// `configFor(route)` da la config de costos del carro de cada viaje.
export function cleaningMonthSummary(routes, locales, mes, configFor) {
  const porNombre = new Map((locales || []).map((l) => [key(l.nombre), sanitizeLocal(l)]));
  const grupos = new Map();
  for (const r of routes || []) {
    if (!isCleaning(r) || monthKey(r.fecha) !== mes) continue;
    const nombre = String(r.local || "").trim() || "Sin local";
    const k = key(nombre);
    if (!grupos.has(k)) grupos.set(k, { nombre, visitas: 0, horas: 0, millas: 0, costoViajes: 0, visitasSinHoras: 0 });
    const g = grupos.get(k);
    const eco = routeEconomics(r, configFor ? configFor(r) : undefined);
    g.visitas += 1;
    g.millas = round2(g.millas + (Number(r.millas) || 0));
    g.costoViajes = round2(g.costoViajes + eco.fuel_cost + eco.maintenance_est);
    const h = Number(r.horasReales) > 0 ? Number(r.horasReales) : 0;
    if (h > 0) g.horas = round2(g.horas + h);
    else g.visitasSinHoras += 1;
  }
  const locales_ = Array.from(grupos.entries()).map(([k, g]) => {
    const local = porNombre.get(k) || null;
    const neto = corvusNet(local);
    const netoReal = neto == null ? null : round2(neto - g.costoViajes);
    return {
      ...g,
      conDatosDePago: neto != null,
      netoCorvus: neto,
      netoReal,
      porHora: netoReal != null && g.horas > 0 ? round2(netoReal / g.horas) : null,
    };
  });
  locales_.sort((a, b) => a.nombre.localeCompare(b.nombre));
  const total = locales_.reduce(
    (t, l) => ({
      visitas: t.visitas + l.visitas,
      horas: round2(t.horas + l.horas),
      millas: round2(t.millas + l.millas),
      costoViajes: round2(t.costoViajes + l.costoViajes),
    }),
    { visitas: 0, horas: 0, millas: 0, costoViajes: 0 }
  );
  return { mes, locales: locales_, total };
}

// Millas de limpieza de un año (para los taxes).
export function cleaningMilesForYear(routes, year) {
  let m = 0;
  for (const r of routes || []) {
    if (isCleaning(r) && String(r.fecha).startsWith(String(year))) m = round2(m + (Number(r.millas) || 0));
  }
  return m;
}
