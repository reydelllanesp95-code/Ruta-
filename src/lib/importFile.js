// Lectura del archivo que sube el usuario. OnTrac exporta el manifest dentro de
// un .zip; un mismo .zip puede traer VARIOS manifests (uno por día). Aquí lo
// descomprimimos y devolvemos TODOS los CSV de adentro. También acepta .csv/.json.

import { unzipSync, strFromU8 } from "fflate";

// Dado el contenido de un .zip, devuelve TODOS los CSV/JSON de adentro como
// [{ text, filename }], ordenados por nombre. Función pura, fácil de testear.
export function extractAllFromZip(uint8) {
  const files = unzipSync(uint8);
  const names = Object.keys(files)
    .filter((n) => !n.endsWith("/") && !n.startsWith("__MACOSX"))
    .filter((n) => /\.(csv|json)$/i.test(n))
    .sort();
  if (names.length === 0) {
    throw new Error("El archivo .zip no contiene ningún CSV.");
  }
  return names.map((n) => ({ text: strFromU8(files[n]), filename: n }));
}

// Compatibilidad: primer CSV del zip.
export function extractFromZip(uint8) {
  return extractAllFromZip(uint8)[0];
}

// Lee un File del navegador y devuelve una lista [{ text, filename }].
// Un .zip puede producir varios; un .csv/.json produce uno.
export async function readRouteFiles(file) {
  const name = (file && file.name) || "";
  if (name.toLowerCase().endsWith(".zip")) {
    const buf = new Uint8Array(await file.arrayBuffer());
    return extractAllFromZip(buf);
  }
  return [{ text: await file.text(), filename: name }];
}
