// Meta de respaldo: detecta si hay cambios sin respaldar para recordarle al
// usuario que exporte su .json (única forma real de no perder datos si iOS
// borra el localStorage de la PWA instalada). Nada de esto va dentro del backup.

import {
  KEY_CODES,
  KEY_ROUTES,
  KEY_FUELUPS,
  KEY_MAINT,
  KEY_MEALS,
  KEY_META,
} from "./constants.js";
import { loadJSON, saveJSON } from "./storage.js";
import { hashStable } from "./earnings.js";

const EMPTY_META = { lastBackupAt: null, lastBackupSignature: null };

// Lee todos los datos y devuelve { signature, hasData }. La firma es un hash
// estable de TODO el contenido → cambia si el usuario agrega/edita algo.
export async function computeDataSignature() {
  const [codigos, rutas, fuelups, maints, meals] = await Promise.all([
    loadJSON(KEY_CODES, []),
    loadJSON(KEY_ROUTES, []),
    loadJSON(KEY_FUELUPS, []),
    loadJSON(KEY_MAINT, []),
    loadJSON(KEY_MEALS, []),
  ]);
  const arr = (x) => (Array.isArray(x) ? x : []);
  const payload = JSON.stringify({
    codigos: arr(codigos),
    rutas: arr(rutas),
    fuelups: arr(fuelups),
    maints: arr(maints),
    meals: arr(meals),
  });
  const total =
    arr(codigos).length +
    arr(rutas).length +
    arr(fuelups).length +
    arr(maints).length +
    arr(meals).length;
  return { signature: hashStable(payload), hasData: total > 0 };
}

export async function loadMeta() {
  const m = await loadJSON(KEY_META, null);
  if (!m || typeof m !== "object") return { ...EMPTY_META };
  return {
    lastBackupAt: m.lastBackupAt || null,
    lastBackupSignature: m.lastBackupSignature || null,
  };
}

export async function saveMeta(meta) {
  await saveJSON(KEY_META, meta);
  return meta;
}

// Pura: ¿hay que recordar un respaldo? Necesita datos Y (nunca respaldado O la
// firma actual difiere de la del último respaldo).
export function backupStatus({ meta, signature, hasData, now = Date.now() }) {
  const lastBackupAt = (meta && meta.lastBackupAt) || null;
  const lastSig = (meta && meta.lastBackupSignature) || null;
  const dias =
    lastBackupAt != null && Number.isFinite(Date.parse(lastBackupAt))
      ? Math.floor((now - Date.parse(lastBackupAt)) / 86400000)
      : null;
  const needsBackup = !!hasData && (!lastSig || lastSig !== signature);
  return { needsBackup, lastBackupAt, dias };
}

// Marca "respaldado ahora": guarda la firma actual + fecha, y avisa a la UI.
export async function markBackedUp() {
  const { signature } = await computeDataSignature();
  const meta = { lastBackupAt: new Date().toISOString(), lastBackupSignature: signature };
  await saveMeta(meta);
  try {
    window.dispatchEvent(new Event("ruta:backup"));
  } catch {
    /* noop (entorno sin window) */
  }
  return meta;
}
