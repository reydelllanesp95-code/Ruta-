// Plataformas de trabajo y turnos manuales (Amazon Flex, Spark Driver, …).
//
// Los turnos se guardan en la MISMA colección que las rutas (KEY_ROUTES) con
// campos opcionales extra, así no hace falta migrar datos: una ruta vieja sin
// `plataforma` se considera OnTrac (todas las rutas CSV vinieron de OnTrac).

import { SCHEMA_VERSION } from "./constants.js";
import { makeUUID, round2, validateNonNegative, parseDatePart } from "./earnings.js";
import { VEHICLES, DEFAULT_VEHICLE } from "./vehicles.js";

export const PLATFORMS = {
  flex: { label: "Amazon Flex", archived: false },
  spark: { label: "Spark Driver", archived: false },
  otro: { label: "Otro", archived: false },
  ontrac: { label: "OnTrac", archived: true },
};

// Plataformas que se ofrecen al registrar un turno nuevo.
export const ACTIVE_PLATFORMS = Object.keys(PLATFORMS).filter((k) => !PLATFORMS[k].archived);

export function platformOf(route) {
  const p = route && route.plataforma;
  return p && PLATFORMS[p] ? p : "ontrac";
}

export function platformLabel(id) {
  return (PLATFORMS[id] && PLATFORMS[id].label) || id;
}

// "HH:MM" → minutos desde medianoche, o null si no es válida.
function toMinutes(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

// Horas entre inicio y fin. Si fin < inicio, el turno cruzó la medianoche.
// Falta alguna hora o son iguales → null (desconocido, NO 0).
export function hoursBetween(inicio, fin) {
  const a = toMinutes(inicio);
  const b = toMinutes(fin);
  if (a == null || b == null || a === b) return null;
  const diff = b > a ? b - a : b + 24 * 60 - a;
  return round2(diff / 60);
}

// Valida la entrada del formulario de turno. Devuelve { ok, error, values }.
export function validateShift(input) {
  const i = input || {};
  if (!ACTIVE_PLATFORMS.includes(i.plataforma)) {
    return { ok: false, error: "Elige una plataforma." };
  }
  const fecha = parseDatePart(i.fecha);
  if (!fecha) return { ok: false, error: "La fecha no es válida." };
  if (i.pago === "" || i.pago == null) return { ok: false, error: "Escribe el pago." };
  const pago = validateNonNegative(i.pago, "El pago");
  if (!pago.ok) return { ok: false, error: pago.error };
  const propina = validateNonNegative(i.propina, "La propina");
  if (!propina.ok) return { ok: false, error: propina.error };
  const vehiculo = i.vehiculo || DEFAULT_VEHICLE;
  if (!VEHICLES[vehiculo]) return { ok: false, error: "Elige un vehículo." };
  // Odómetro opcional: si vienen inicio y fin, las millas salen de ahí.
  const hayOdoIni = i.odoInicio !== "" && i.odoInicio != null;
  const hayOdoFin = i.odoFin !== "" && i.odoFin != null;
  if (hayOdoIni !== hayOdoFin) {
    return { ok: false, error: "Pon el odómetro de inicio y el de fin, o ninguno." };
  }
  let odoInicio = null;
  let odoFin = null;
  let millasInput = i.millas;
  if (hayOdoIni) {
    const a = validateNonNegative(i.odoInicio, "El odómetro de inicio");
    const b = validateNonNegative(i.odoFin, "El odómetro de fin");
    if (!a.ok) return { ok: false, error: a.error };
    if (!b.ok) return { ok: false, error: b.error };
    if (!(b.value > a.value)) {
      return { ok: false, error: "El odómetro de fin debe ser mayor que el de inicio." };
    }
    odoInicio = a.value;
    odoFin = b.value;
    millasInput = round2(b.value - a.value);
  }
  const millas = validateNonNegative(millasInput, "Las millas");
  if (!millas.ok) return { ok: false, error: millas.error };
  const hayInicio = Boolean(i.horaInicio);
  const hayFin = Boolean(i.horaFin);
  if (hayInicio !== hayFin) {
    return { ok: false, error: "Pon la hora de inicio y la de fin, o ninguna." };
  }
  if (hayInicio && hoursBetween(i.horaInicio, i.horaFin) == null) {
    return { ok: false, error: "Las horas no son válidas." };
  }
  // Salida y llegada a casa (opcionales): horas reales puerta a puerta.
  const haySalida = Boolean(i.salidaCasa);
  const hayLlegada = Boolean(i.llegadaCasa);
  if (haySalida !== hayLlegada) {
    return { ok: false, error: "Pon la hora de salida de casa y la de llegada, o ninguna." };
  }
  if (haySalida) {
    const reales = hoursBetween(i.salidaCasa, i.llegadaCasa);
    if (reales == null) return { ok: false, error: "Las horas de salida y llegada no son válidas." };
    const bloque = hayInicio ? hoursBetween(i.horaInicio, i.horaFin) : null;
    if (bloque != null && reales < bloque) {
      return {
        ok: false,
        error: "La salida y llegada a casa no cuadran: dan menos horas que el bloque.",
      };
    }
  }
  return {
    ok: true,
    values: {
      plataforma: i.plataforma,
      fecha,
      pago: pago.value,
      propina: propina.value,
      millas: millas.value,
      vehiculo,
      odoInicio,
      odoFin,
      horaInicio: hayInicio ? i.horaInicio : "",
      horaFin: hayFin ? i.horaFin : "",
      salidaCasa: haySalida ? i.salidaCasa : "",
      llegadaCasa: hayLlegada ? i.llegadaCasa : "",
    },
  };
}

// Campos derivados de un turno válido (se usa al crear y al editar).
function shiftFields(v, nota) {
  return {
    plataforma: v.plataforma,
    origen: v.plataforma,
    fecha: v.fecha,
    horaInicio: v.horaInicio,
    horaFin: v.horaFin,
    horas: hoursBetween(v.horaInicio, v.horaFin),
    salidaCasa: v.salidaCasa,
    llegadaCasa: v.llegadaCasa,
    // Horas reales (puerta a puerta) si hay salida/llegada; si no, null.
    horasReales: hoursBetween(v.salidaCasa, v.llegadaCasa),
    millas: v.millas,
    vehiculo: v.vehiculo,
    odoInicio: v.odoInicio,
    odoFin: v.odoFin,
    pagoBase: round2(v.pago),
    propina: round2(v.propina),
    ganancia: round2(v.pago + v.propina),
    nota: String(nota || "").trim(),
  };
}

// Crea un turno persistible. Lanza si la entrada no es válida.
export function makeShift(input) {
  const chk = validateShift(input);
  if (!chk.ok) throw new Error(chk.error);
  const id = makeUUID();
  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    tipo: "turno",
    ...shiftFields(chk.values, input.nota),
    paquetes: 0,
    paradas: 0,
    huella: "turno-" + id, // único: nunca choca con la detección de duplicados del CSV
    detalle: [],
    filasCrudas: [],
    importadoEn: new Date().toISOString(),
  };
}

// Campos a actualizar al editar un turno existente.
export function shiftUpdate(input) {
  const chk = validateShift(input);
  if (!chk.ok) throw new Error(chk.error);
  return shiftFields(chk.values, input.nota);
}

export function isShift(route) {
  return Boolean(route && route.tipo === "turno");
}

// ---- Importar turnos desde CSV (plantilla) ----
// Columnas: plataforma,fecha,inicio,fin,pago,propina,millas,vehiculo,nota
// Pensado para el flujo foto del resumen → Claude → CSV → RUTA.

const PLATFORM_ALIASES = {
  flex: "flex", "amazon flex": "flex", amazon: "flex",
  spark: "spark", "spark driver": "spark", walmart: "spark",
  otro: "otro", other: "otro",
};
const VEHICLE_ALIASES = { kia: "kia", sorento: "kia", "kia sorento": "kia", tucson: "tucson", hyundai: "tucson", "hyundai tucson": "tucson" };

export const SHIFT_CSV_HEADER = "plataforma,fecha,salida,inicio,fin,llegada,pago,propina,millas,vehiculo,nota";

export function isShiftsCSVHeader(normHeader) {
  return normHeader.includes("plataforma") && normHeader.includes("pago");
}

// Clave para no importar dos veces el mismo turno.
function shiftDupKey(s) {
  return [s.plataforma, s.fecha, s.horaInicio || "", round2(s.ganancia)].join("|");
}

// rows: filas ya parseadas (la 0 es el encabezado). Devuelve
// { shifts, omitidas: [{ fila, motivo }], duplicados }.
export function parseShiftRows(rows, existentes = []) {
  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const get = (row, name) => {
    const i = idx(name);
    return i < 0 || i >= row.length ? "" : String(row[i] == null ? "" : row[i]).trim();
  };
  const vistas = new Set((existentes || []).filter(isShift).map(shiftDupKey));
  const shifts = [];
  const omitidas = [];
  let duplicados = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const fila = i + 1;
    const platRaw = get(row, "plataforma").toLowerCase();
    const vehRaw = get(row, "vehiculo").toLowerCase();
    const input = {
      plataforma: PLATFORM_ALIASES[platRaw] || platRaw,
      fecha: get(row, "fecha"),
      horaInicio: get(row, "inicio"),
      horaFin: get(row, "fin"),
      salidaCasa: get(row, "salida"),
      llegadaCasa: get(row, "llegada"),
      pago: get(row, "pago").replace(/[$,]/g, ""),
      propina: get(row, "propina").replace(/[$,]/g, ""),
      millas: get(row, "millas"),
      vehiculo: vehRaw ? VEHICLE_ALIASES[vehRaw] || vehRaw : DEFAULT_VEHICLE,
      nota: get(row, "nota"),
    };
    const chk = validateShift(input);
    if (!chk.ok) {
      omitidas.push({ fila, motivo: chk.error });
      continue;
    }
    const s = makeShift(input);
    const k = shiftDupKey(s);
    if (vistas.has(k)) {
      duplicados += 1;
      continue;
    }
    vistas.add(k);
    shifts.push(s);
  }
  return { shifts, omitidas, duplicados };
}
