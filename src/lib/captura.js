// Pegar captura: lee el texto que copia el iPhone de una captura de ganancias
// (Amazon Flex) y propone cambios a los turnos guardados. Lógica pura.

import { round2 } from "./earnings.js";
import { makeShift, isShift, hoursBetween } from "./platforms.js";

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
    "(?<pendiente>(?:consejos|propinas?|tips?)\\s+pendientes?|tips? pending)",
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

// Devuelve { ok, items, pagos, avisos, error }. items: { tipo: "bloque"|"ajuste",
// fecha, horaInicio, horaFin, base, propina, total, propinaPendiente? }.
// Lo que no se puede leer bien NO se adivina: se deja fuera y se avisa, y el
// resto sigue. Solo es error si no queda nada.
export function parseFlexText(text, today = new Date()) {
  const filas = [];
  const sueltos = []; // importes en el orden en que salen (para columnas separadas)
  let actual = null;
  let payoutNext = false;
  for (const m of normalize(text).matchAll(TOKEN)) {
    const g = m.groups;
    if (g.fecha) {
      const mes = MESES[m[2]];
      if (!mes) continue;
      const dia = Number(m[3]);
      const fecha = `${inferYear(mes, dia, today)}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      actual = { fecha, pago: payoutNext, tipo: null };
      filas.push(actual);
      payoutNext = false;
    } else if (g.pago) {
      payoutNext = true;
    } else if (g.dinero || g.base || g.tip || g.pendiente) {
      const ev = g.dinero ? { total: money(m[18]) } : g.base ? { base: money(m[14]) } : g.tip ? { propina: money(m[16]) } : { pendiente: true };
      sueltos.push(ev);
      if (!actual) continue; // p. ej. «Saldo actual» arriba del todo
      if (ev.total != null) {
        if (actual.total == null) actual.total = ev.total;
        else actual.extra = true;
      } else Object.assign(actual, ev.pendiente ? { pendiente: true } : ev);
    } else if (g.rango && actual && !actual.tipo) {
      Object.assign(actual, { tipo: "bloque", horaInicio: to24(m[5], m[6], m[7]), horaFin: to24(m[8], m[9], m[10]) });
    } else if (g.ajuste && actual && !actual.tipo) {
      actual.tipo = "ajuste";
    }
  }
  if (!filas.length) return { ok: false, error: "No encontré ningún bloque de Flex en el texto." };

  // Columnas separadas (primero todas las fechas, luego todos los importes):
  // se emparejan por orden, solo si las cuentas cuadran.
  const columnas = filas.length > 1 && filas.slice(0, -1).every((f) => f.total == null) && sueltos.length;
  if (columnas) {
    for (const f of filas) for (const k of ["total", "base", "propina", "pendiente", "extra"]) delete f[k];
    const grupos = [];
    for (const ev of sueltos) {
      if (ev.total != null) grupos.push({ total: ev.total });
      else if (grupos.length) Object.assign(grupos.at(-1), ev);
    }
    if (grupos.length !== filas.length) {
      return { ok: false, error: `No cuadra el texto: veo ${filas.length} fecha(s) y ${grupos.length} importe(s).` };
    }
    filas.forEach((f, i) => Object.assign(f, grupos[i]));
  }

  const items = [];
  const pagos = [];
  const avisos = [];
  const vistos = new Set();
  for (const f of filas) {
    const donde = `${fechaCortaISO(f.fecha)}${f.horaInicio ? ` ${f.horaInicio}–${f.horaFin}` : ""}`;
    if (f.pago) {
      if (f.total != null) pagos.push({ fecha: f.fecha, total: f.total });
      continue;
    }
    if (f.total == null) {
      // Una fecha suelta sin importe (p. ej. «Pago programado para el …») no es un bloque.
      if (f.tipo) avisos.push(`${donde}: no se ve el importe; no lo puse.`);
      continue;
    }
    if (!f.tipo) {
      avisos.push(`${donde} $${f.total}: no se ve el horario; no lo puse.`);
      continue;
    }
    let item;
    if (f.tipo === "ajuste") {
      item = { tipo: "ajuste", fecha: f.fecha, base: f.total, propina: 0, total: f.total };
    } else {
      // Sin desglose (sin propina, «Pagado» o propina pendiente): todo es base.
      const sinDesglose = f.base == null && f.propina == null;
      const base = sinDesglose ? f.total : f.base ?? null;
      const propina = f.propina ?? 0;
      if (base == null || round2(base + propina) !== f.total) {
        avisos.push(`${donde}: el total $${f.total} no es base + propina (posible error al leer); no lo puse.`);
        continue;
      }
      item = { tipo: "bloque", fecha: f.fecha, horaInicio: f.horaInicio, horaFin: f.horaFin, base, propina, total: f.total };
      if (f.pendiente && sinDesglose) {
        item.propinaPendiente = true;
        avisos.push(`${donde}: propina pendiente; la pongo cuando Flex la muestre.`);
      }
    }
    const key = [item.tipo, item.fecha, item.horaInicio || "", item.total].join("|");
    if (vistos.has(key)) continue; // dos capturas que se solapan
    vistos.add(key);
    items.push(item);
  }
  if (!items.length) return { ok: false, error: avisos[0] || "No encontré ningún bloque de Flex que se pudiera leer.", avisos };
  return { ok: true, items, pagos, avisos };
}

function fechaCortaISO(iso) {
  const [, mo, d] = iso.split("-").map(Number);
  return `${d} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][mo - 1]}`;
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
      const antes = { pago: round2(Number(b.pago) || 0), propina: round2(Number(b.propina) || 0) };
      // Propina pendiente en Flex: no se baja la que ya hubiera apuntada.
      const propina = its.every((x) => x.propinaPendiente)
        ? antes.propina
        : round2(its.reduce((s, x) => s + (x.propinaPendiente ? 0 : x.propina), 0));
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


// ---- Lyft («Actividad diaria» + opcional «Estadísticas de manejo») ----

const LYFT_TOKEN = new RegExp(
  [
    // «dom 22 de nov»
    // «dom 22 de nov» (sin año: «domingo, 22 de noviembre de 2026» es la
    // pantalla de un cobro, no la actividad del día)
    // «Hoy 24 de nov» / «Ayer 23 de nov»: el día de hoy/ayer no lleva día de la semana.
    "(?<fecha>\\b(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom|hoy|ayer)[a-záéíóú]*\\.?,?\\s+(\\d{1,2})\\s+de\\s+([a-z]{3})[a-z]*\\b(?!\\s+de\\s+\\d{4}))",
    `(?<extra>\\b(propina|bono|ajuste)\\s+de\\s+\\$\\s*${AMOUNT})`,
    // «de $1.00» suelto: el iPhone a veces parte «Bono … de $1.00» con la hora en medio
    `(?<suelto>\\bde\\s+\\$\\s*${AMOUNT})`,
    "(?<semana>semana del\\s+([a-z]{3})[a-z]*\\s+(\\d{1,2})\\s+al\\s+(?:([a-z]{3})[a-z]*\\s+)?(\\d{1,2}))",
    "(?<conectado>tiempo (conectado|reservado)(?:(?!tiempo (?:conectado|reservado)|kil)[^\\d]){0,80}?(\\d+)\\s*h(?:\\s*(\\d+)\\s*min)?)",
    // Lyft siempre muestra centavos; así se ignora el «$89» de la gráfica.
    "(?<dinero>\\$\\s*([\\d,]+\\.\\d{2}))",
    "(?<hora>\\b(\\d{1,2}):(\\d{2})\\s*(am|pm)\\b)",
    // «nov 22» (pantalla Diario de Lyft y sus hojas de estadísticas)
    // «‹ nov 21» y «nov 23 ›» son los días de al lado; la flecha lo dice.
    "(?<fecha2>(<\\s*)?\\b(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic|jan|apr|aug|dec)[a-z]*\\.?\\s*(\\d{1,2})\\b(?!\\s*(?:de|al|:))(\\s*[>›])?)",
    "(?<diario>ver toda la actividad diaria)",
  ].join("|"),
  "giu"
);

export function isLyftText(text) {
  return /\blyft\b|actividad diaria|\d{1,2}\s+de\s+[a-z]{3}/i.test(String(text || "")) && !/consejos\s*:/i.test(String(text || ""));
}

// Devuelve { ok, dias: [{ fecha, total, propina, viajes, horaInicio, horaFin, horasTrabajo }], error }
// extra: textos alternativos (otras lecturas de la misma foto) de los que
// tomar el «Tiempo reservado» si esta lectura no lo trae.
export function parseLyftText(text, today = new Date(), extra = []) {
  const dias = [];
  let conectado = null;
  let reservado = null;
  let semana = null;
  let pantallaDiario = false;
  const isoDe = (mes, dia) => `${inferYear(mes, dia, today)}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  // Un día ya visto se continúa (la hoja de estadísticas repite la fecha).
  const empezar = (fecha) => {
    const ya = dias.find((x) => x.fecha === fecha);
    if (ya) {
      dias.splice(dias.indexOf(ya), 1);
      dias.push(ya);
    } else dias.push({ fecha, total: null, viajes: [], todos: [], propina: 0, horas: [], bonos: 0 });
  };
  // Barra «‹ nov 21  nov 22  nov 23 ›»: fechas seguidas; la elegida es la del medio.
  let racha = [];
  const cerrarRacha = () => {
    if (!racha.length) return;
    const sin = racha.filter((x) => !x.flecha);
    const elegida = sin.length ? sin.at(-1) : racha.length >= 3 ? racha[1] : racha.at(-1);
    empezar(elegida.fecha);
    racha = [];
  };
  const norm = normalize(text);
  for (const m of norm.matchAll(LYFT_TOKEN)) {
    const g = m.groups;
    if (g.fecha2) {
      const mes = MESES[m[26]];
      if (mes) racha.push({ fecha: isoDe(mes, Number(m[27])), flecha: Boolean(m[25] || m[28]) });
      continue;
    }
    cerrarRacha();
    const d = dias.at(-1);
    if (g.diario) {
      pantallaDiario = true;
    } else if (g.fecha) {
      const mes = MESES[m[3]];
      if (!mes) continue;
      empezar(isoDe(mes, Number(m[2])));
    } else if (g.extra) {
      if (d && m[5].toLowerCase() === "propina") d.propina = round2(d.propina + money(m[6]));
    } else if (g.semana) {
      const m1 = MESES[m[10]], m2 = MESES[m[12] || m[10]];
      if (m1 && m2) {
        const iso = (mes, dia) => `${inferYear(mes, dia, today)}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        semana = { desde: iso(m1, Number(m[11])), hasta: iso(m2, Number(m[13])) };
      }
    } else if (g.conectado) {
      // Horas trabajadas = «Tiempo reservado» (llevando pasajeros). El conectado
      // incluye ratos sin trabajar (p. ej. volviendo a casa): solo si no hay otro.
      const h = round2(Number(m[16]) + Number(m[17] || 0) / 60);
      if (m[15].toLowerCase() === "reservado") reservado = h;
      else conectado = h;
    } else if (g.dinero) {
      if (!d) continue;
      if (d.total == null) d.total = money(m[19]);
      // Al llegar al total del día se deja de sumar: lo que venga después
      // (p. ej. el total repetido detrás de las estadísticas) no es un viaje.
      else {
        const v = money(m[19]);
        // Todos los importes (menos el total repetido): sirven para comprobar
        // que el total no se leyó de menos.
        // El total repetido (detrás de una hoja de estadísticas) no es un viaje.
        if (v !== d.total) {
          d.todos.push(v);
          if (round2(d.viajes.reduce((x, y) => x + y, 0)) < d.total) {
            d.viajes.push(v);
            // «$50.00 Bonos»: suma al día pero no es un viaje.
            if (/^\s*bonos?\b/.test(norm.slice(m.index + m[0].length, m.index + m[0].length + 12))) d.bonos += 1;
          }
        }
      }
    } else if (g.hora && d) {
      d.horas.push(to24(m[21], m[22], m[23]));
    }
  }
  cerrarRacha();
  if (!dias.length) return { ok: false, error: "No encontré el día de Lyft («dom 22 de nov» o «nov 22»)." };
  // «Kilómetros reservados / manejados durante el tiempo reservado: 86,79 mi»:
  // Lyft lo da en millas e incluye el camino a recoger al pasajero.
  let millasR = null;
  for (const t of [text, ...extra]) {
    const mm = normalize(t).match(/kil[oó]metros (?:reservados|manejados)[\s\S]{0,120}?(\d{1,4}(?:[.,]\d{1,2})?)\s*mi\b/);
    if (mm) { millasR = round2(Number(mm[1].replace(",", "."))); break; }
  }
  if (reservado == null) {
    for (const t of extra) {
      const m = normalize(t).match(/tiempo reservado(?:(?!tiempo (?:conectado|reservado)|kil)[^\d]){0,80}?(\d+)\s*h(?:\s*(\d+)\s*min)?/);
      if (m) { reservado = round2(Number(m[1]) + Number(m[2] || 0) / 60); break; }
    }
  }
  const out = [];
  const avisos = [];
  for (const d of dias) {
    const suma = round2(d.viajes.reduce((s, x) => s + x, 0));
    const sumaTodos = round2(d.todos.reduce((s, x) => s + x, 0));
    if (d.total == null || suma > d.total || (suma < d.total && sumaTodos > d.total)) {
      // Sin total, o viajes que suman más que el día: algo se leyó mal; ese
      // día se deja fuera y los demás siguen.
      avisos.push(`Lyft ${fechaCortaISO(d.fecha)}: los viajes suman $${suma} y el día dice $${d.total ?? "?"}; no lo puse.`);
      continue;
    }
    const propinaDesconocida = pantallaDiario && d.propina === 0;
    if (propinaDesconocida) {
      avisos.push(`Lyft ${fechaCortaISO(d.fecha)}: esta pantalla no muestra las propinas; sube la «Actividad diaria» de ese día para ponerlas.`);
    }
    if (suma < d.total && !pantallaDiario) {
      // Se perdió algún viaje al leer (letra verde, iconos), pero el total del
      // día, grande y claro, sí: vale el total; se avisa para comprobarlo.
      avisos.push(`Lyft ${fechaCortaISO(d.fecha)}: usé el total del día ($${d.total}); no pude comprobar viaje por viaje. Compáralo con Lyft.`);
    }
    const orden = [...d.horas].sort();
    out.push({
      fecha: d.fecha,
      total: d.total,
      propina: d.propina,
      viajes: d.viajes.filter((x) => x > 0).length - d.bonos,
      horaInicio: orden[0] || "",
      horaFin: orden.at(-1) || "",
      horasTrabajo: dias.length === 1 ? reservado ?? conectado : null,
      horasFuente: dias.length !== 1 ? null : reservado != null ? "tiempo reservado" : conectado != null ? "tiempo conectado" : null,
      ...(dias.length === 1 && millasR > 0 ? { millasApp: millasR } : {}),
      ...(dias.length === 1 && (reservado ?? conectado) && semana ? { semana } : {}),
      ...(propinaDesconocida ? { propinaDesconocida: true } : {}),
    });
  }
  if (!out.length) return { ok: false, error: avisos[0], avisos };
  // Estadísticas leídas pero sin las millas: no es grave, se reparten por horas.
  if (out.length === 1 && reservado != null && millasR == null) {
    avisos.push(`Lyft ${fechaCortaISO(out[0].fecha)}: no leí las millas («Kilómetros reservados»); se reparten por horas. Si las quieres exactas, pega el texto de esa captura.`);
  }
  return { ok: true, dias: out, avisos };
}

function lyftHoras(d) {
  if (d.horasTrabajo) return d.horasTrabajo;
  const a = mins(d.horaInicio), b = mins(d.horaFin);
  return a == null || b == null || a === b ? null : round2(((b - a + 1440) % 1440) / 60);
}

// Un registro de Lyft por día. Mismo formato de plan que Flex.
export function planLyftImport(dias, routes) {
  const lyft = (routes || []).filter((r) => isShift(r) && r.plataforma === "lyft");
  const cambios = [];
  let sinCambios = 0;
  for (let d of dias) {
    let pago = round2(d.total - d.propina);
    // El tiempo conectado de las estadísticas es de la SEMANA: solo vale como
    // horas del día si no hay otros días de Lyft en esa semana.
    const otrosEnSemana = d.semana && lyft.some((x) => x.fecha !== d.fecha && x.fecha >= d.semana.desde && x.fecha <= d.semana.hasta);
    let horas = lyftHoras(otrosEnSemana ? { ...d, horasTrabajo: null } : d);
    let horasFuente = otrosEnSemana ? "primer a último viaje" : d.horasFuente || "primer a último viaje";
    // Las millas de las estadísticas también son de la semana: misma regla.
    const millasLyft = !otrosEnSemana && d.millasApp > 0 ? d.millasApp : null;
    const nota = `Lyft: ${d.viajes} viaje(s) (desde captura)`;
    const horario = d.horaInicio ? `${d.horaInicio}–${d.horaFin}` : "";
    const r = lyft.find((x) => x.fecha === d.fecha);
    // No se empeora lo que ya hay: sin tiempo reservado/conectado se quedan las
    // horas guardadas, y si esta pantalla no trae propinas se quedan las guardadas.
    if (r && !d.horasFuente && Number(r.horas) > 0) {
      horas = Number(r.horas);
      horasFuente = "las que ya tenía";
    }
    if (r && d.propinaDesconocida) {
      d = { ...d, propina: round2(r.propina || 0) };
      pago = round2(d.total - d.propina);
    }
    if (!r) {
      cambios.push({ tipo: "nuevo", plataforma: "lyft", fecha: d.fecha, horario, horaInicio: d.horaInicio, horaFin: d.horaFin, horas, horasFuente, millasLyft, pago, propina: d.propina, nota });
      continue;
    }
    const antes = { pago: round2(r.pagoBase || 0), propina: round2(r.propina || 0) };
    if (antes.pago === pago && antes.propina === d.propina && (horas == null || r.horas === horas) && (millasLyft == null || r.millasLyft === millasLyft)) {
      sinCambios += 1;
      continue;
    }
    cambios.push({ tipo: "actualizar", plataforma: "lyft", routeId: r.id, fecha: d.fecha, horas, horasFuente, millasLyft, horaInicio: d.horaInicio, horaFin: d.horaFin,
      bloques: [{ idx: 0, horario: horario || "día", antes, despues: { pago, propina: d.propina } }] });
  }
  cambios.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { cambios, sinCambios, total: round2(dias.reduce((s, d) => s + d.total, 0)) };
}

export function applyLyftPlan(routes, plan, { vehiculo } = {}) {
  const porId = new Map(plan.cambios.filter((c) => c.tipo === "actualizar").map((c) => [c.routeId, c]));
  const next = routes.map((r) => {
    const c = porId.get(r.id);
    if (!c) return r;
    const { pago, propina } = c.bloques[0].despues;
    const out = { ...r, pagoBase: pago, propina, ganancia: round2(pago + propina) };
    if (c.horaInicio && !r.bloques?.length) Object.assign(out, { horaInicio: c.horaInicio, horaFin: c.horaFin });
    if (c.horas != null) out.horas = c.horas;
    if (c.millasLyft != null) out.millasLyft = c.millasLyft;
    return out;
  });
  for (const c of plan.cambios) {
    if (c.tipo !== "nuevo") continue;
    // Un solo viaje da inicio = fin: sin horario válido el día se guarda igual.
    const horario = hoursBetween(c.horaInicio, c.horaFin) != null ? { horaInicio: c.horaInicio, horaFin: c.horaFin } : {};
    const s = makeShift({ plataforma: "lyft", fecha: c.fecha, vehiculo, ...horario, pago: c.pago, propina: c.propina, nota: c.nota });
    if (c.horas != null) s.horas = c.horas;
    if (c.millasLyft != null) s.millasLyft = c.millasLyft;
    next.push(s);
  }
  return next;
}

// Avisos que solo informan (propinas que llegan después) frente a los que
// dicen que algo se dejó fuera o no se pudo comprobar.
function graves(avisos = []) {
  return avisos.filter((a) => !/propina pendiente|no muestra las propinas|no leí las millas/.test(a)).length;
}

// Un solo punto de entrada para la pantalla: decide Flex o Lyft.
export function readCapture(text, routes, today = new Date(), extra = []) {
  if (isLyftText(text)) {
    const r = parseLyftText(text, today, extra);
    if (!r.ok) return r;
    return { ok: true, plataforma: "lyft", plan: planLyftImport(r.dias, routes), avisos: r.avisos, graves: graves(r.avisos), leidos: r.dias.length };
  }
  const r = parseFlexText(text, today);
  if (!r.ok) return r;
  return { ok: true, plataforma: "flex", plan: planFlexImport(r.items, routes), avisos: r.avisos, graves: graves(r.avisos), leidos: r.items.length };
}

export function applyCapture(plataforma, routes, plan, opts) {
  return plataforma === "lyft" ? applyLyftPlan(routes, plan, opts) : applyFlexPlan(routes, plan, opts);
}
