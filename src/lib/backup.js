// Respaldo: exportar/importar toda la app como JSON. [Aud 13][Aud 14]

import { KEY_CODES, KEY_ROUTES, KEY_FUELUPS, KEY_MAINT, KEY_MEALS, KEY_TOLLS, KEY_LOCALES, SCHEMA_VERSION } from "./constants.js";
import { loadJSON, saveJSON } from "./storage.js";
import { loadConfig, saveConfig } from "./config.js";
import { SHIFT_CSV_HEADER } from "./platforms.js";

const BACKUP_TYPE = "ruta-backup";

// Construye el objeto de respaldo con todo lo guardado. Se EXTIENDE con `config`
// sin reestructurar: se mantienen `type` y las claves en español. [Aud 14]
export async function buildBackup() {
  const codigos = (await loadJSON(KEY_CODES, [])) || [];
  const rutas = (await loadJSON(KEY_ROUTES, [])) || [];
  const config = await loadConfig();
  const fuelups = (await loadJSON(KEY_FUELUPS, [])) || [];
  const mantenimiento = (await loadJSON(KEY_MAINT, [])) || [];
  const comidas = (await loadJSON(KEY_MEALS, [])) || [];
  const peajes = (await loadJSON(KEY_TOLLS, [])) || [];
  const locales = (await loadJSON(KEY_LOCALES, [])) || [];
  return {
    type: BACKUP_TYPE,
    schemaVersion: SCHEMA_VERSION,
    exportadoEn: new Date().toISOString(),
    data: { codigos, rutas, config, fuelups, mantenimiento, comidas, peajes, locales },
  };
}

// Descarga el respaldo como archivo .json (en el navegador).
export async function downloadBackup() {
  const backup = await buildBackup();
  const fecha = backup.exportadoEn.slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  triggerDownload(blob, `ruta-respaldo-${fecha}.json`);
  return backup;
}

// Valida y aplica un respaldo. Devuelve un resumen { codigos, rutas }.
export async function restoreBackup(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("El archivo de respaldo no es un JSON válido.");
  }
  if (!parsed || parsed.type !== BACKUP_TYPE || !parsed.data) {
    throw new Error("Este archivo no parece un respaldo de Ruta.");
  }
  // migración futura: if (parsed.schemaVersion < SCHEMA_VERSION) { ... }
  const codigos = Array.isArray(parsed.data.codigos) ? parsed.data.codigos : [];
  const rutas = Array.isArray(parsed.data.rutas) ? parsed.data.rutas : [];
  await saveJSON(KEY_CODES, codigos);
  await saveJSON(KEY_ROUTES, rutas);
  // config es opcional: backups viejos (sin config) usan defaults seguros. [Aud 14]
  let config = false;
  if (parsed.data.config) {
    await saveConfig(parsed.data.config); // saveConfig ya sanea/defaultea
    config = true;
  }
  // fuelups opcional: backups viejos (sin fuelups) → []. [Fase 2]
  const fuelups = Array.isArray(parsed.data.fuelups) ? parsed.data.fuelups : [];
  await saveJSON(KEY_FUELUPS, fuelups);
  // mantenimiento opcional: backups viejos (sin mantenimiento) → []. [Fase 3]
  const mantenimiento = Array.isArray(parsed.data.mantenimiento) ? parsed.data.mantenimiento : [];
  await saveJSON(KEY_MAINT, mantenimiento);
  // comidas opcional: backups viejos (sin comidas) → []. [Fase 4]
  const comidas = Array.isArray(parsed.data.comidas) ? parsed.data.comidas : [];
  await saveJSON(KEY_MEALS, comidas);
  // peajes opcional: backups viejos (sin peajes) → [].
  const peajes = Array.isArray(parsed.data.peajes) ? parsed.data.peajes : [];
  await saveJSON(KEY_TOLLS, peajes);
  // locales opcional: backups viejos (sin locales) → [].
  const locales = Array.isArray(parsed.data.locales) ? parsed.data.locales : [];
  await saveJSON(KEY_LOCALES, locales);
  return {
    codigos: codigos.length,
    rutas: rutas.length,
    config,
    fuelups: fuelups.length,
    mantenimiento: mantenimiento.length,
    comidas: comidas.length,
    peajes: peajes.length,
    locales: locales.length,
  };
}

// Plantilla de turnos (Flex/Spark).
export function downloadPlantillaTurnos() {
  // Solo encabezado: una fila de ejemplo se importaría como un turno real.
  triggerDownload(new Blob([SHIFT_CSV_HEADER + "\n"], { type: "text/csv" }), "ruta-plantilla-turnos.csv");
}

function triggerDownload(blob, filename) {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
