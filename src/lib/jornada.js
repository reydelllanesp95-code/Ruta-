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
  return { ok: true, jornada: { ...j, horaLlegada: hora, odoLlegada: o.value } };
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
    const del = (routes || []).filter((r) => r.fecha === fecha && recibe(r));
    if (!del.length) continue;
    const pesos = del.map((r) => Math.max(0, Number(r.horasReales) > 0 ? Number(r.horasReales) : Number(r.horas) || 0));
    const total = pesos.reduce((s, x) => s + x, 0);
    const vehiculo = d.carros.size === 1 ? [...d.carros][0] : null;
    let asignado = 0;
    del.forEach((r, i) => {
      // El último se lleva el resto, para que la suma cuadre al centavo.
      const m = i === del.length - 1
        ? round2(d.millas - asignado)
        : round2(total > 0 ? (d.millas * pesos[i]) / total : d.millas / del.length);
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

// «Volví a trabajar»: anula la parada.
export function seguirTrabajando(j) {
  const { horaParada, ...resto } = j;
  return resto;
}

function minutos(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Horas de trabajo de la jornada: salida → parada (o llegada). Null si aún no
// hay fin.
export function horasJornada(j) {
  const a = minutos(j && j.horaSalida);
  const b = minutos((j && j.horaParada) || (j && j.horaLlegada));
  if (a == null || b == null || a === b) return null;
  return round2(((b - a + 1440) % 1440) / 60);
}
