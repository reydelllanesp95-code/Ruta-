import React from "react";
import PeriodSummary from "./PeriodSummary.jsx";
import { payWeekLabel } from "../../lib/earnings.js";

// La clave de cada semana es la fecha de inicio (sábado). Mostramos el rango
// "27 jun – 3 jul" (sábado→viernes, el día de cobro).
export default function WeeklySummary({ items }) {
  return <PeriodSummary title="Por semana (sáb→vie)" items={items} labelFor={payWeekLabel} />;
}
