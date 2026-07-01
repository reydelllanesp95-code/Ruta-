// Utilidades de CSV puras, compartidas por el orquestador y los parsers. [Aud 3]

// Lector CSV tolerante: comillas con comas dentro, comillas escapadas (""),
// BOM, saltos \r\n y \n.
export function parseCSV(text) {
  const rows = [];
  if (text == null) return rows;
  const s = String(text).replace(/^﻿/, ""); // quitar BOM
  let row = [];
  let field = "";
  let inQuotes = false;
  let sawAny = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    sawAny = false;
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    sawAny = true;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\r") {
      // ignorar; el \n cierra la fila
    } else if (c === "\n") {
      endRow();
    } else {
      field += c;
    }
  }
  if (sawAny || field !== "" || row.length > 0) endRow();
  return rows;
}

// Normaliza un encabezado para comparar por nombre, nunca por posición:
// minúsculas, sin acentos, colapsando espacios/guiones/guiones bajos. [Aud 3]
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
export function normalizeHeader(h) {
  return String(h == null ? "" : h)
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
}

// Mapa nombreNormalizado -> índice de columna.
export function buildColumnMap(headerCells) {
  const map = {};
  headerCells.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key && !(key in map)) map[key] = i;
  });
  return map;
}

// Índice de la primera columna candidata encontrada, o -1.
export function findColumn(colMap, candidates) {
  for (const cand of candidates) {
    const key = normalizeHeader(cand);
    if (key in colMap) return colMap[key];
  }
  return -1;
}

// Filtra filas completamente vacías (el manifest de OnTrac trae una). [Aud 3]
export function dropEmptyRows(rows) {
  return rows.filter((r) => r.some((c) => String(c == null ? "" : c).trim() !== ""));
}

export function cell(row, idx) {
  if (idx < 0 || idx >= row.length) return "";
  return String(row[idx] == null ? "" : row[idx]).trim();
}
