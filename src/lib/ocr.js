// Lee el texto de las capturas en el propio teléfono (tesseract.js). El motor
// y los idiomas se sirven desde la web de RUTA; las fotos no salen del móvil.
// Solo para el navegador (usa canvas y web workers).

import { readCapture } from "./captura.js";

const BASE = import.meta.env.BASE_URL;

// Dos formas de preparar la imagen; la segunda solo si la primera no cuadra.
// Elegidas probando con capturas reales de Flex y Lyft (ver criterios).
const INTENTOS = [
  { umbral: 200, psm: "4" },
  { umbral: null, psm: "11" },
];

// Si un paso se cuelga (p. ej. el teléfono se queda sin memoria), se corta y
// se dice en qué paso fue, para poder arreglarlo.
function conTiempo(promesa, segundos, paso) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`se quedó en «${paso}» más de ${segundos} s`)), segundos * 1000)),
  ]);
}

function conPaso(paso, fn) {
  return Promise.resolve().then(fn).catch((err) => {
    const e = new Error(`${paso}: ${err && err.message ? err.message : err}`);
    throw e;
  });
}

let workerPromise = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) =>
      createWorker(["spa", "eng"], 1, {
        workerPath: `${BASE}ocr/worker.min.js`,
        corePath: `${BASE}ocr`,
        langPath: `${BASE}ocr-lang`,
        gzip: false,
        errorHandler: (err) => console.error("OCR", err),
      })
    );
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

// Gris, invertida si es modo oscuro, al doble de tamaño y (opcional) en blanco
// y negro. Devuelve un canvas.
async function preparar(file, umbral) {
  const bmp = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = bmp.width * 2;
  c.height = bmp.height * 2;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let suma = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = g;
    suma += g;
  }
  const oscuro = suma / (d.length / 4) < 128;
  for (let i = 0; i < d.length; i += 4) {
    let g = oscuro ? 255 - d[i] : d[i];
    if (umbral != null) g = g > umbral ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// files: fotos elegidas. onProgress(texto). Devuelve lo mismo que readCapture
// más `text` (lo leído, para que Rey lo vea y pueda corregirlo).
export async function readCaptureImages(files, routes, onProgress = () => {}) {
  onProgress("Preparando el lector (la primera vez tarda un poco)…");
  const worker = await conTiempo(conPaso("cargar el lector", getWorker), 120, "cargar el lector");
  let primero = null;
  const leidos = [];
  for (const [n, intento] of INTENTOS.entries()) {
    await worker.setParameters({ tessedit_pageseg_mode: intento.psm });
    const textos = [];
    for (const [i, f] of [...files].entries()) {
      onProgress(`Leyendo captura ${i + 1} de ${files.length}${n ? " (segundo intento)" : ""}…`);
      const lienzo = await conPaso(`preparar la foto ${i + 1}`, () => preparar(f, intento.umbral));
      const { data } = await conTiempo(conPaso(`leer la foto ${i + 1}`, () => worker.recognize(lienzo)), 90, `leer la foto ${i + 1}`);
      textos.push(data.text);
    }
    const text = textos.join("\n");
    leidos.push(text);
    // Si esta lectura cuadra el dinero pero perdió el «Tiempo reservado», se
    // toma de otra lectura de las mismas fotos.
    let r = readCapture(text, routes, undefined, leidos.slice(0, -1));
    if (r.ok && r.plataforma === "lyft" && n < INTENTOS.length - 1 && !/reservado/.test(JSON.stringify(r.plan.cambios))) {
      await worker.setParameters({ tessedit_pageseg_mode: INTENTOS[n + 1].psm });
      const otros = [];
      for (const f of files) otros.push((await worker.recognize(await preparar(f, INTENTOS[n + 1].umbral))).data.text);
      r = readCapture(text, routes, undefined, [otros.join("\n")]);
    }
    if (r.ok) return { ...r, text };
    primero = primero || { ...r, text };
  }
  return {
    ...primero,
    error: `${primero.error} No pude leer bien la foto: pega el texto de esa captura (Fotos → icono de texto → «Copiar todo») o corrige el número aquí abajo y toca «Leer».`,
  };
}
