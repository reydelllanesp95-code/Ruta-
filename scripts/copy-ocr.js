// Copia el motor del lector de texto (tesseract.js) a public/ocr para que
// RUTA lo sirva desde su propia web: sin CDN de terceros y con versión fija.
import { mkdirSync, copyFileSync } from "node:fs";

const out = "public/ocr";
mkdirSync(out, { recursive: true });
copyFileSync("node_modules/tesseract.js/dist/worker.min.js", `${out}/worker.min.js`);
for (const v of ["", "-simd", "-relaxedsimd"]) {
  for (const ext of [".js", ".wasm.js"]) {
    copyFileSync(`node_modules/tesseract.js-core/tesseract-core${v}-lstm${ext}`, `${out}/tesseract-core${v}-lstm${ext}`);
  }
}
