// Borrador del turno en curso. El iPhone cierra la app minimizada y el estado
// de React se pierde; por eso cada cambio del formulario se guarda aquí al
// instante (síncrono) y se recupera al volver a abrir.

import { KEY_SHIFT_DRAFT } from "./constants.js";

function store(s) {
  try {
    return s || (typeof localStorage !== "undefined" ? localStorage : null);
  } catch {
    return null;
  }
}

export function loadDraft(s) {
  try {
    const raw = store(s)?.getItem(KEY_SHIFT_DRAFT);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d === "object" && !Array.isArray(d) ? d : null;
  } catch {
    return null; // corrupto o sin almacenamiento → formulario vacío
  }
}

export function saveDraft(draft, s) {
  try {
    store(s)?.setItem(KEY_SHIFT_DRAFT, JSON.stringify({ ...draft, actualizadoEn: new Date().toISOString() }));
  } catch {
    // Sin espacio o sin almacenamiento: no rompe el formulario.
  }
}

export function clearDraft(s) {
  try {
    store(s)?.removeItem(KEY_SHIFT_DRAFT);
  } catch {
    /* noop */
  }
}

// ¿El borrador tiene algo escrito de verdad? (ignora plataforma/vehículo/fecha,
// que siempre traen un valor por defecto).
export function draftHasData(d) {
  if (!d) return false;
  return ["salidaCasa", "horaInicio", "horaFin", "llegadaCasa", "odoInicio", "odoFin", "millas", "pago", "propina", "nota"].some(
    (k) => d[k] != null && String(d[k]).trim() !== ""
  );
}

// Hora actual "HH:MM".
export function nowHHMM(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
