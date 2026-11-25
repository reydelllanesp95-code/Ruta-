// Jornada: odómetro al salir y al llegar a casa. Las millas del día se reparten
// entre los trabajos de reparto de ese día al mostrar (no se reescriben).

import { makeUUID, round2, validateNonNegative } from "./earnings.js";
import { isShift, isCleaning } from "./platforms.js";

export function startJornada({ fecha, hora, vehiculo, odo }) {
  const o = validateNonNegative(odo, "El odómetro");
  if (!o.ok || !(o.value > 0)) return { ok: false, error: "Pon el odómetro al salir." };
  return {
    ok: true,
    jornada: { id: makeUUID(), fecha, vehiculo, horaSalida: hora, odoSalida: o.value, horaLlegada: "", odoLlegada: null },
  };
}

export function closeJornada(j, { hora, odo }) {
  const o = validateNonNegative(odo, "El odómetro");
  if (!o.ok || !(o.value > j.odoSalida)) {
    return { ok: false, error: `La llegada tiene que ser mayor que la salida (${j.odoSalida}).` };
  }
  const out = { ...j, horaLlegada: hora, odoLlegada: o.value };
  // Un «Paré» que quedó después de la llegada (horas editadas) no vale.
  const desde = (h) => (minutos(h) - minutos(j.horaSalida) + 1440) % 1440;
  if (out.horaParada && minutos(hora) != null && desde(out.horaParada) > desde(hora)) delete out.horaParada;
  return { ok: true, jornada: out };
}

export function openJornada(jornadas) {
  return (jornadas || []).find((j) => j.odoLlegada == null) || null;
}

export function jornadaMiles(j) {
  return j && j.odoLlegada != null ? round2(j.odoLlegada - j.odoSalida) : 0;
}

// Trabajos que reciben millas de la jornada: reparto, sin odómetro propio.
function recibe(r) {
  return isShift(r) && !isCleaning(r) && (r.odoInicio == null || r.odoInicio === "") && (r.odoFin == null || r.odoFin === "");
}

// Devuelve las rutas con `millas` (y el carro, si ese día se usó uno solo)
// sacados de las jornadas cerradas. No modifica `routes`.
export function withJornadaMiles(routes, jornadas) {
  const porDia = new Map();
  for (const j of jornadas || []) {
    if (j.odoLlegada == null) continue;
    const d = porDia.get(j.fecha) || { millas: 0, carros: new Set() };
    d.millas = round2(d.millas + jornadaMiles(j));
    d.carros.add(j.vehiculo);
    porDia.set(j.fecha, d);
  }
  if (!porDia.size) return routes;
  const reparto = new Map(); // id → { millas, vehiculo }
  for (const [fecha, d] of porDia) {
    const todos = (routes || []).filter((r) => r.fecha === fecha && recibe(r));
    if (!todos.length) continue;
    const vehiculo = d.carros.size === 1 ? [...d.carros][0] : null;
    // Lyft con millas de su captura: se las queda (sin pasar del odómetro);
    // el resto del día se reparte entre los demás por horas.
    let quedan = d.millas;
    const conPropias = todos.filter((r) => Number(r.millasLyft) > 0);
    for (const r of conPropias) {
      const m = round2(Math.min(Number(r.millasLyft), quedan));
      quedan = round2(quedan - m);
      reparto.set(r.id, { millas: m, vehiculo });
    }
    const del = todos.filter((r) => !(Number(r.millasLyft) > 0));
    if (!del.length) {
      // Día solo de Lyft: el resto del odómetro (entre viajes, volver) también es suyo.
      const ult = conPropias[conPropias.length - 1];
      reparto.set(ult.id, { millas: round2(reparto.get(ult.id).millas + quedan), vehiculo });
      continue;
    }
    const pesos = del.map((r) => Math.max(0, Number(r.horasReales) > 0 ? Number(r.horasReales) : Number(r.horas) || 0));
    const total = pesos.reduce((s, x) => s + x, 0);
    let asignado = 0;
    del.forEach((r, i) => {
      // El último se lleva el resto, para que la suma cuadre al centavo.
      const m = i === del.length - 1
        ? round2(quedan - asignado)
        : round2(total > 0 ? (quedan * pesos[i]) / total : quedan / del.length);
      asignado = round2(asignado + m);
      reparto.set(r.id, { millas: m, vehiculo });
    });
  }
  return routes.map((r) => {
    const x = reparto.get(r.id);
    if (!x) return r;
    return { ...r, millas: x.millas, ...(x.vehiculo ? { vehiculo: x.vehiculo } : {}), millasDeJornada: true };
  });
}

// «Paré de trabajar»: desde aquí hasta llegar a casa no son horas de trabajo.
export function pararTrabajo(j, hora) {
  return { ...j, horaParada: hora };
}

// «Volví a trabajar»: la parada abierta pasa a ser una pausa cerrada (desde la
// parada hasta ahora) y deja de restar como fin de jornada.
export function seguirTrabajando(j, hora) {
  const { horaParada, ...resto } = j;
  if (!horaParada || !hora) return resto;
  return { ...resto, pausas: [...(j.pausas || []), { desde: horaParada, hasta: hora }] };
}

function minutos(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Horas de trabajo de la jornada: salida → parada (o llegada), menos las
// pausas cerradas. Null si aún no hay fin.
export function horasJornada(j) {
  const a = minutos(j && j.horaSalida);
  const b = minutos((j && j.horaParada) || (j && j.horaLlegada));
  if (a == null || b == null || a === b) return null;
  const total = (b - a + 1440) % 1440;
  const pausa = (j.pausas || []).reduce((s, p) => {
    const d = minutos(p.desde), h = minutos(p.hasta);
    return d == null || h == null ? s : s + ((h - d + 1440) % 1440);
  }, 0);
  return round2(Math.max(0, total - pausa) / 60);
}

// Corregir las horas a mano (p. ej. se olvidó tocar «Paré»). Vacío en
// horaParada la quita. No toca odómetros.
export function editarHorasJornada(j, { horaSalida, horaParada = "", horaLlegada = "", pausas = j.pausas || [] }) {
  const ok = (h) => minutos(h) != null && minutos(h) < 1440;
  if (!ok(horaSalida)) return { ok: false, error: "La hora de salida no es válida." };
  if (horaParada && !ok(horaParada)) return { ok: false, error: "La hora en que paraste no es válida." };
  const cerrada = j.odoLlegada != null;
  if (cerrada && !ok(horaLlegada)) return { ok: false, error: "La hora de llegada no es válida." };
  const desde = (h) => (minutos(h) - minutos(horaSalida) + 1440) % 1440;
  if (horaParada && cerrada && !(desde(horaParada) > 0 && desde(horaParada) <= desde(horaLlegada))) {
    return { ok: false, error: "«Paré» tiene que estar entre la salida y la llegada." };
  }
  if (horaParada && desde(horaParada) === 0) return { ok: false, error: "«Paré» no puede ser la misma hora que la salida." };
  // Pausas: dentro de la jornada (antes de la parada final o la llegada) y con
  // hasta > desde.
  const fin = horaParada || (cerrada ? horaLlegada : null);
  const limpias = [];
  for (const p of pausas || []) {
    if (!p || (!p.desde && !p.hasta)) continue;
    if (!ok(p.desde) || !ok(p.hasta)) return { ok: false, error: "Revisa las horas de la pausa." };
    if (!(desde(p.hasta) > desde(p.desde))) return { ok: false, error: `La pausa de las ${p.desde} tiene que terminar después de empezar.` };
    if (desde(p.desde) === 0 || (fin && desde(p.hasta) > desde(fin))) return { ok: false, error: `La pausa ${p.desde}–${p.hasta} queda fuera de la jornada.` };
    limpias.push({ desde: p.desde, hasta: p.hasta });
  }
  limpias.sort((x, y) => desde(x.desde) - desde(y.desde));
  const out = { ...j, horaSalida, ...(cerrada ? { horaLlegada } : {}), pausas: limpias };
  if (horaParada) out.horaParada = horaParada;
  else delete out.horaParada;
  return { ok: true, jornada: out };
}

// Pausas para el editor. En una jornada cerrada, la parada final («dejé de
// trabajar» antes de llegar) se muestra como una pausa más hasta la llegada.
export function pausasParaEditar(j) {
  const ps = (j.pausas || []).map((p) => ({ ...p }));
  if (j.odoLlegada != null && j.horaParada && j.horaLlegada) ps.push({ desde: j.horaParada, hasta: j.horaLlegada });
  return ps;
}

// ¿La pausa termina al llegar a casa? (se ve como «Dejé de trabajar»)
export function esParadaFinal(j, p) {
  return Boolean(j.horaLlegada) && p.hasta === j.horaLlegada;
}
