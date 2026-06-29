// Capa de almacenamiento sobre localStorage. [Aud 12][Aud 15][Aud 18]
//
// - Reemplaza window.storage (que solo existe dentro de claude.ai).
// - Cada blob se guarda como { schemaVersion, data } para permitir migraciones.
// - Si existe window.storage con datos viejos, se migran una sola vez.
// - Todo va en try/catch: si localStorage falla, no se rompe la app.

import { SCHEMA_VERSION } from "./constants.js";

function hasLocalStorage() {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

// Lleva un blob persistido a la versión de esquema actual. Hoy solo hay v1;
// las migraciones futuras se encadenan aquí. [Aud 12]
function migrate(blob) {
  // Formato nuevo: { schemaVersion, data }
  if (blob && typeof blob === "object" && "schemaVersion" in blob && "data" in blob) {
    let { schemaVersion, data } = blob;
    // while (schemaVersion < SCHEMA_VERSION) { ...transformar...; schemaVersion++; }
    return data;
  }
  // Formato viejo (window.storage guardaba el dato pelado): se acepta tal cual.
  return blob;
}

function wrap(data) {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, data });
}

// Copia datos desde window.storage a localStorage una sola vez, si aplica.
// [Aud 15]
async function migrateFromWindowStorage(key) {
  try {
    if (
      typeof window === "undefined" ||
      !window.storage ||
      typeof window.storage.get !== "function"
    ) {
      return null;
    }
    const marker = key + "_migrated";
    if (hasLocalStorage() && localStorage.getItem(marker)) return null;
    const res = await window.storage.get(key, false);
    if (res && res.value) {
      const data = JSON.parse(res.value);
      if (hasLocalStorage()) {
        localStorage.setItem(key, wrap(data));
        localStorage.setItem(marker, "1");
      }
      return { value: JSON.stringify(data) };
    }
    if (hasLocalStorage()) localStorage.setItem(marker, "1");
  } catch {
    // Si la migración falla, seguimos sin datos: no es fatal.
  }
  return null;
}

// API de bajo nivel compatible con la que usaba window.storage:
// get(key) -> { value: <string JSON del dato> } | null
export async function get(key) {
  try {
    if (!hasLocalStorage()) return await migrateFromWindowStorage(key);
    const raw = localStorage.getItem(key);
    if (raw == null) return await migrateFromWindowStorage(key);
    const data = migrate(JSON.parse(raw));
    return { value: JSON.stringify(data) };
  } catch {
    return null;
  }
}

// set(key, value) donde value es un string JSON del dato. Lanza si falla, para
// que la UI muestre el estado de error y permita reintentar. [Aud 18]
export async function set(key, value) {
  if (!hasLocalStorage()) {
    throw new Error("El almacenamiento del navegador no está disponible");
  }
  const data = JSON.parse(value);
  localStorage.setItem(key, wrap(data));
  return true;
}

// Helpers de alto nivel para módulos que trabajan con objetos directamente.
export async function loadJSON(key, fallback = null) {
  const res = await get(key);
  if (!res) return fallback;
  try {
    return JSON.parse(res.value);
  } catch {
    return fallback;
  }
}

export async function saveJSON(key, data) {
  return set(key, JSON.stringify(data));
}
