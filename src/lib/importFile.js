// Lectura del archivo que sube el usuario. OnTrac exporta el manifest dentro de
// un .zip, así que aquí lo descomprimimos y sacamos el CSV de adentro. También
// acepta .csv/.json sueltos.

import { unzipSync, strFromU8 } from "fflate";

// Dado el contenido de un .zip, devuelve el texto del primer CSV (o JSON) que
// encuentre y su nombre. Función pura, fácil de testear.
export function extractFromZip(uint8) {
  const files = unzipSync(uint8);
  const names = Object.keys(files).filter((n) => !n.endsWith("/") && !n.startsWith("__MACOSX"));
  const target =
    names.find((n) => n.toLowerCase().endsWith(".csv")) ||
    names.find((n) => n.toLowerCase().endsWith(".json"));
  if (!target) {
    throw new Error("El archivo .zip no contiene ningún CSV.");
  }
  return { text: strFromU8(files[target]), filename: target };
}

// Lee un File del navegador y devuelve { text, filename }, descomprimiendo si
// es un .zip.
export async function readRouteFile(file) {
  const name = (file && file.name) || "";
  if (name.toLowerCase().endsWith(".zip")) {
    const buf = new Uint8Array(await file.arrayBuffer());
    return extractFromZip(buf);
  }
  return { text: await file.text(), filename: name };
}
