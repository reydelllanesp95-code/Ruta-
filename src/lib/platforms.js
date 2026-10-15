// Plataformas de trabajo y turnos manuales (Amazon Flex, Spark Driver, …).
//
// Los turnos se guardan en la MISMA colección que las rutas (KEY_ROUTES) con
// campos opcionales extra, así no hace falta migrar datos: una ruta vieja sin
// `plataforma` se considera OnTrac (todas las rutas CSV vinieron de OnTrac).

import { SCHEMA_VERSION } from "./constants.js";
import { makeUUID, round2, validateNonNegative, parseDatePart } from "./earnings.js";

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
  const millas = validateNonNegative(i.millas, "Las millas");
  if (!millas.ok) return { ok: false, error: millas.error };
  const hayInicio = Boolean(i.horaInicio);
  const hayFin = Boolean(i.horaFin);
  if (hayInicio !== hayFin) {
    return { ok: false, error: "Pon la hora de inicio y la de fin, o ninguna." };
  }
  if (hayInicio && hoursBetween(i.horaInicio, i.horaFin) == null) {
    return { ok: false, error: "Las horas no son válidas." };
  }
  return {
    ok: true,
    values: {
      plataforma: i.plataforma,
      fecha,
      pago: pago.value,
      propina: propina.value,
      millas: millas.value,
      horaInicio: hayInicio ? i.horaInicio : "",
      horaFin: hayFin ? i.horaFin : "",
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
    millas: v.millas,
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
