import React from "react";
import { DollarSign, Package, MapPin, Navigation, Clock } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, round2 } from "../../lib/earnings.js";

function Card({ title, totals, gastos = 0 }) {
  return (
    <div
      className="flex-1 rounded-xl p-3"
      style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
    >
      <div className="gc-eyebrow text-[10px] uppercase mb-1.5" style={{ color: T.textFaint }}>
        {title}
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <DollarSign size={18} style={{ color: T.red }} />
        <span className="gc-code text-[22px] font-semibold" style={{ color: T.textPrimary }}>
          {formatMoney(totals.ganancia)}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[12px]" style={{ color: T.textSecondary }}>
        {totals.paquetes > 0 && (
          <>
            <span className="flex items-center gap-1">
              <Package size={12} /> {totals.paquetes}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {totals.paradas}
            </span>
          </>
        )}
        {totals.horas > 0 && (
          <span className="flex items-center gap-1">
            <Clock size={12} /> {totals.horas} h
          </span>
        )}
        <span className="flex items-center gap-1">
          <Navigation size={12} /> {totals.millas} mi
        </span>
      </div>
      <div
        className="mt-2 pt-2 flex items-baseline justify-between"
        style={{ borderTop: `1px solid ${T.borderSoft}` }}
      >
        <span className="text-[10px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
          Neto
        </span>
        <span
          className="gc-code text-[15px] font-semibold"
          style={{ color: (totals.net_profit ?? 0) >= 0 ? T.ok : T.red }}
        >
          {formatMoney(totals.net_profit)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-[10px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
          Neto/hora
        </span>
        <span className="gc-code text-[13px]" style={{ color: T.textPrimary }}>
          {totals.net_per_hour != null ? formatMoney(totals.net_per_hour) : "—"}
        </span>
      </div>
      {gastos > 0 && (
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-[10px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
            Tras comida y peajes
          </span>
          <span className="gc-code text-[13px]" style={{ color: T.textPrimary }}>
            {formatMoney(round2((totals.net_profit || 0) - gastos))}
          </span>
        </div>
      )}
      {totals.propinas > 0 && (
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-[10px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
            Propinas
          </span>
          <span className="gc-code text-[13px]" style={{ color: T.textSecondary }}>
            {formatMoney(totals.propinas)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function StatsCards({
  semana,
  mes,
  semanaLabel = "Esta semana",
  mesLabel = "Este mes",
  gastosSemana = 0,
  gastosMes = 0,
}) {
  return (
    <div className="flex gap-2.5">
      <Card title={semanaLabel} totals={semana} gastos={gastosSemana} />
      <Card title={mesLabel} totals={mes} gastos={gastosMes} />
    </div>
  );
}
