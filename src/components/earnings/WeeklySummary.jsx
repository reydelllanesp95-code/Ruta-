import React from "react";
import PeriodSummary from "./PeriodSummary.jsx";

// "2026-W26" -> "Semana 26 · 2026"
function labelForWeek(key) {
  const m = String(key).match(/^(\d{4})-W(\d{2})$/);
  if (!m) return key;
  return `Semana ${Number(m[2])} · ${m[1]}`;
}

export default function WeeklySummary({ items }) {
  return <PeriodSummary title="Por semana" items={items} labelFor={labelForWeek} />;
}
