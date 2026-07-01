import React from "react";
import PeriodSummary from "./PeriodSummary.jsx";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// "2026-06" -> "junio 2026"
function labelForMonth(key) {
  const m = String(key).match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  const nombre = MESES[Number(m[2]) - 1] || m[2];
  return `${nombre} ${m[1]}`;
}

export default function MonthlySummary({ items }) {
  return <PeriodSummary title="Por mes" items={items} labelFor={labelForMonth} />;
}
