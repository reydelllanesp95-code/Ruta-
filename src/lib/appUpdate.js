// Forzar actualización de la PWA instalada: pide al service worker que busque
// la versión nueva y recarga. Con skipWaiting/clientsClaim (vite.config.js) el
// SW nuevo toma el control enseguida, así que la recarga ya carga el build nuevo.
export async function updateAndReload() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.update();
  } catch {
    // Sin service worker (o sin red): recargar igual es lo mejor que podemos hacer.
  }
  window.location.reload();
}

// Fecha del build actual, para comprobar a simple vista qué versión se ve.
/* global __BUILD_TIME__ */
export const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";
