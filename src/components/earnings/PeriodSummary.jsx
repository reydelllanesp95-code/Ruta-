import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney } from "../../lib/earnings.js";

// Lista colapsable reutilizable para "por semana" y "por mes". [Aud 22]
export default function PeriodSummary({ title, items, labelFor, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items || items.length === 0) return null;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary }}
      >
        <span className="gc-eyebrow text-[11px] uppercase" style={{ color: T.textSecondary }}>
          {title}
        </span>
        <Chevron size={16} style={{ color: T.textFaint }} />
      </button>
      {open &&
        items.map((it, idx) => (
          <div
            key={it.key}
            className="flex items-center justify-between px-3 py-2.5"
            style={{
              backgroundColor: T.surface,
              borderTop: `1px solid ${T.borderSoft}`,
            }}
          >
            <div className="min-w-0">
              <div className="text-[13.5px]" style={{ color: T.textPrimary }}>
                {labelFor(it.key)}
              </div>
              <div className="text-[11.5px]" style={{ color: T.textFaint }}>
                {it.paquetes} paq · {it.paradas} paradas · {it.millas} mi · {it.rutas} rutas
              </div>
            </div>
            <div
              className="gc-code text-[14px] font-semibold shrink-0"
              style={{ color: T.ok }}
            >
              {formatMoney(it.ganancia)}
            </div>
          </div>
        ))}
    </div>
  );
}
