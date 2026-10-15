import React from "react";
import { T } from "../../lib/theme.js";
import { formatMoney } from "../../lib/earnings.js";
import { platformLabel, PLATFORMS } from "../../lib/platforms.js";

// Comparación por plataforma (todo el historial): bruto, neto y neto por hora.
export default function PlatformSummary({ items }) {
  if (!items || items.length < 2) return null;
  const order = Object.keys(PLATFORMS);
  const sorted = [...items].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
      <div className="px-3 py-2.5 gc-eyebrow text-[11px] uppercase" style={{ backgroundColor: T.surfaceRaised, color: T.textSecondary }}>
        Por plataforma
      </div>
      {sorted.map((it) => (
        <div
          key={it.key}
          className="flex items-center justify-between px-3 py-2.5"
          style={{ backgroundColor: T.surface, borderTop: `1px solid ${T.borderSoft}` }}
        >
          <div className="min-w-0">
            <div className="text-[13.5px]" style={{ color: T.textPrimary }}>
              {platformLabel(it.key)}
              {PLATFORMS[it.key] && PLATFORMS[it.key].archived ? " (historial)" : ""}
            </div>
            <div className="text-[11.5px]" style={{ color: T.textFaint }}>
              {it.rutas} registro(s) · neto {formatMoney(it.net_profit)}
              {it.propinas > 0 ? ` · propinas ${formatMoney(it.propinas)}` : ""}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="gc-code text-[14px] font-semibold" style={{ color: T.ok }}>
              {it.net_per_hour != null ? `${formatMoney(it.net_per_hour)}/h` : "—"}
            </div>
            <div className="text-[10.5px]" style={{ color: T.textFaint }}>
              bruto {formatMoney(it.ganancia)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
