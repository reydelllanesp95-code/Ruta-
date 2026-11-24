// Pegar captura: lee el texto que copia el iPhone de una captura de ganancias
// (Amazon Flex) y propone cambios a los turnos guardados. Lógica pura.

import { round2 } from "./earnings.js";
import { makeShift, isShift } from "./platforms.js";

const MESES = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const AMOUNT = "([\\d,]+(?:\\.\\d{1,2})?)";
const TOKEN = new RegExp(
  [
    // fecha: «dom, nov 22», «sáb, nov 21», «Sun, Nov 22»
    "(?<fecha>\\b(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom|mon|tue|wed|thu|fri|sat|sun)[a-záéíóú]*\\.?,?\\s+([a-z]{3})[a-z]*\\.?\\s+(\\d{1,2})\\b)",
    // horario: «2:00 pm - 4:00 pm» (ya normalizado)
    "(?<rango>(\\d{1,2}):(\\d{2})\\s*(am|pm)\\s*[-–—a]\\s*(\\d{1,2}):(\\d{2})\\s*(am|pm))",
    "(?<ajuste>ajuste manual|manual adjustment)",
    "(?<pago>pago enviado|payment sent)",
    `(?<base>\\bbase\\s*:?\\s*\\$\\s*${AMOUNT})`,
    `(?<tip>\\b(?:consejos|propinas?|tips?)\\s*:?\\s*\\$\\s*${AMOUNT})`,
    `(?<dinero>\\$\\s*${AMOUNT})`,
  ].join("|"),
  "giu"
);

function normalize(text) {
  return String(text || "")
    .replace(/ | /g, " ")
    .toLowerCase()
    .replace(/([ap])\.?\s?m\.?(?![a-z])/g, "$1m");
}

function money(s) {
  return round2(Number(String(s).replace(/,/g, "")));
}

function to24(h, m, ampm) {
  let hh = Number(h) % 12;
  if (ampm === "pm") hh += 12;
  return `${String(hh).padStart(2, "0")}:${m}`;
}

function inferYear(month, day, today) {
  const y = today.getFullYear();
  const ref = (today.getMonth() + 1) * 100 + today.getDate();
  return month * 100 + day > ref ? y - 1 : y;
}

// Devuelve { ok, items, pagos, error }. items: { tipo: "bloque"|"ajuste",
// fecha, horaInicio, horaFin, base, propina, total }.
export function parseFlexText(text, today = new Date()) {
  const headers = [];
  const grupos = [];
  let payoutNext = false;
  for (const m of normalize(text).matchAll(TOKEN)) {
    const g = m.groups;
    if (g.fecha) {
      const mes = MESES[m[2]];
      if (!mes) continue;
      const dia = Number(m[3]);
      const y = inferYear(mes, dia, today);
      const fecha = `${y}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      headers.push({ fecha, tipo: payoutNext ? "pago" : null });
      payoutNext = false;
    } else if (g.rango) {
      const h = headers.at(-1);
      if (h && !h.tipo) Object.assign(h, { tipo: "bloque", horaInicio: to24(m[5], m[6], m[7]), horaFin: to24(m[8], m[9], m[10]) });
    } else if (g.ajuste) {
      const h = headers.at(-1);
      if (h && !h.tipo) h.tipo = "ajuste";
    } else if (g.pago) {
      payoutNext = true;
    } else if (g.base) {
      const gr = grupos.at(-1);
      if (gr) gr.base = money(m[14]);
    } else if (g.tip) {
      const gr = grupos.at(-1);
      if (gr) gr.propina = money(m[16]);
    } else if (g.dinero) {
      grupos.push({ total: money(m[18]) });
    }
  }
  if (!headers.length) return { ok: false, error: "No encontré ningún bloque de Flex en el texto pegado." };
  if (headers.length !== grupos.length) {
    return {
      ok: false,
      error: `No cuadra el texto: veo ${headers.length} fecha(s) y ${grupos.length} importe(s). Copia la captura completa (sin filas cortadas arriba o abajo).`,
    };
  }
  const items = [];
  const pagos = [];
  const vistos = new Set();
  for (const [i, h] of headers.entries()) {
    const gr = grupos[i];
    if (h.tipo === "pago") {
      pagos.push({ fecha: h.fecha, total: gr.total });
      continue;
    }
    if (!h.tipo) return { ok: false, error: `La fila del ${h.fecha} no tiene horario ni dice «Ajuste manual».` };
    let item;
    if (h.tipo === "ajuste") {
      item = { tipo: "ajuste", fecha: h.fecha, base: gr.total, propina: 0, total: gr.total };
    } else {
      const base = gr.base ?? null;
      const propina = gr.propina ?? 0;
      if (base == null || round2(base + propina) !== gr.total) {
        return { ok: false, error: `El bloque del ${h.fecha} ${h.horaInicio}–${h.horaFin}: el total $${gr.total} no es base + propina. Revisa que el texto esté completo.` };
      }
      item = { tipo: "bloque", fecha: h.fecha, horaInicio: h.horaInicio, horaFin: h.horaFin, base, propina, total: gr.total };
    }
    const key = [item.tipo, item.fecha, item.horaInicio || "", item.total].join("|");
    if (vistos.has(key)) continue; // dos capturas que se solapan
    vistos.add(key);
    items.push(item);
  }
  return { ok: true, items, pagos };
}

// ---- Emparejar con lo guardado ----

function mins(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function overlap(a1, a2, b1, b2) {
  const [s1, e1, s2, e2] = [mins(a1), mins(a2), mins(b1), mins(b2)];
  if ([s1, e1, s2, e2].includes(null)) return 0;
  const f1 = e1 <= s1 ? e1 + 1440 : e1;
  const f2 = e2 <= s2 ? e2 + 1440 : e2;
  return Math.max(0, Math.min(f1, f2) - Math.max(s1, s2));
}

// Bloques de un turno (los viejos sin `bloques` cuentan como uno).
function blocksOf(r) {
  if (r.bloques?.length) return r.bloques;
  if (r.horaInicio && r.horaFin) return [{ horaInicio: r.horaInicio, horaFin: r.horaFin, pago: r.pagoBase, propina: r.propina }];
  return [];
}

const AJUSTE_NOTA = "Ajuste manual de Flex";

// Devuelve { cambios, sinCambios, total }. Cada cambio:
// { tipo: "actualizar", routeId, fecha, bloques: [{ idx, horario, antes, despues }] }
// { tipo: "nuevo" | "ajuste", fecha, horario, pago, propina }
export function planFlexImport(items, routes) {
  const flex = (routes || []).filter((r) => isShift(r) && r.plataforma === "flex");
  const asignados = new Map(); // routeId → Map(idx → items[])
  const cambios = [];
  let sinCambios = 0;
  for (const it of items) {
    const delDia = flex.filter((r) => r.fecha === it.fecha);
    if (it.tipo === "ajuste") {
      const ya = delDia.some((r) => !r.horaInicio && round2(r.ganancia) === it.total && String(r.nota || "").startsWith(AJUSTE_NOTA));
      if (ya) sinCambios += 1;
      else cambios.push({ tipo: "ajuste", fecha: it.fecha, horario: "Ajuste manual", pago: it.total, propina: 0 });
      continue;
    }
    let mejor = null;
    for (const r of delDia) {
      blocksOf(r).forEach((b, idx) => {
        const o = overlap(it.horaInicio, it.horaFin, b.horaInicio, b.horaFin);
        if (o > 0 && (!mejor || o > mejor.o)) mejor = { r, idx, o };
      });
    }
    if (!mejor) {
      cambios.push({ tipo: "nuevo", fecha: it.fecha, horario: `${it.horaInicio}–${it.horaFin}`, horaInicio: it.horaInicio, horaFin: it.horaFin, pago: it.base, propina: it.propina });
      continue;
    }
    const porBloque = asignados.get(mejor.r.id) || new Map();
    porBloque.set(mejor.idx, [...(porBloque.get(mejor.idx) || []), it]);
    asignados.set(mejor.r.id, porBloque);
  }
  for (const [routeId, porBloque] of asignados) {
    const r = flex.find((x) => x.id === routeId);
    const bloques = blocksOf(r);
    const cambiosBloque = [];
    for (const [idx, its] of porBloque) {
      const b = bloques[idx];
      const pago = round2(its.reduce((s, x) => s + x.base, 0));
      const propina = round2(its.reduce((s, x) => s + x.propina, 0));
      const antes = { pago: round2(Number(b.pago) || 0), propina: round2(Number(b.propina) || 0) };
      if (antes.pago === pago && antes.propina === propina) {
        sinCambios += its.length;
        continue;
      }
      cambiosBloque.push({ idx, horario: `${b.horaInicio}–${b.horaFin}`, antes, despues: { pago, propina } });
    }
    if (cambiosBloque.length) cambios.push({ tipo: "actualizar", routeId, fecha: r.fecha, bloques: cambiosBloque });
  }
  cambios.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const total = round2(items.reduce((s, x) => s + x.total, 0));
  return { cambios, sinCambios, total };
}

// Aplica el plan. Solo toca pago/propina de los bloques afectados (y los
// totales del turno); añade los turnos que faltan. Nunca borra.
export function applyFlexPlan(routes, plan, { vehiculo } = {}) {
  const porId = new Map(plan.cambios.filter((c) => c.tipo === "actualizar").map((c) => [c.routeId, c]));
  const next = routes.map((r) => {
    const c = porId.get(r.id);
    if (!c) return r;
    let bloques = blocksOf(r).map((b) => ({ ...b }));
    for (const cb of c.bloques) Object.assign(bloques[cb.idx], cb.despues);
    const pagoBase = round2(bloques.reduce((s, b) => s + Number(b.pago || 0), 0));
    const propina = round2(bloques.reduce((s, b) => s + Number(b.propina || 0), 0));
    const out = { ...r, pagoBase, propina, ganancia: round2(pagoBase + propina) };
    if (r.bloques?.length) out.bloques = bloques;
    return out;
  });
  for (const c of plan.cambios) {
    if (c.tipo === "nuevo") {
      next.push(makeShift({
        plataforma: "flex", fecha: c.fecha, vehiculo,
        bloques: [{ horaInicio: c.horaInicio, horaFin: c.horaFin, pago: c.pago, propina: c.propina }],
        nota: "Desde captura de Flex (no estaba apuntado; sin millas)",
      }));
    } else if (c.tipo === "ajuste") {
      next.push(makeShift({ plataforma: "flex", fecha: c.fecha, vehiculo, pago: c.pago, propina: 0, nota: AJUSTE_NOTA }));
    }
  }
  return next;
}

