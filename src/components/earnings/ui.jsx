import React from "react";
import { T } from "../../lib/theme.js";
import { formatMoney } from "../../lib/earnings.js";

// Piezas visuales compartidas por las pestañas nuevas.

export function Card({ children, className = "" }) {
  return (
    <section className={`rounded-2xl p-4 ${className}`} style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, right }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <span className="gc-eyebrow text-[11px] uppercase" style={{ color: T.textFaint }}>{children}</span>
      {right && <span className="text-[12.5px]" style={{ color: T.textSecondary }}>{right}</span>}
    </div>
  );
}

export function Row({ label, value, color, hint, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[14px]" style={{ color: T.textPrimary }}>
        {label}
        {hint && <span className="text-[12px] ml-1" style={{ color: T.textFaint }}>{hint}</span>}
      </span>
      <span className={`gc-code ${strong ? "text-[17px] font-semibold" : "text-[14px]"}`} style={{ color: color || T.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

// Ganado − Deducciones = Neto, con neto/hora, horas y millas.
export function NetoHero({ r, netoLabel = "Neto" }) {
  return (
    <Card>
      <Row label="Ganado" value={formatMoney(r.ganado)} strong />
      <Row label="− Deducciones" value={`−${formatMoney(r.deducciones.total)}`} color="#FF7A72" strong />
      <div className="my-2" style={{ height: 1, backgroundColor: T.border }} />
      <div className="flex items-baseline justify-between">
        <span className="gc-eyebrow text-[13px] uppercase">{netoLabel}</span>
        <span className="gc-code text-[30px] font-semibold" style={{ color: r.neto >= 0 ? T.ok : T.red }}>{formatMoney(r.neto)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Mini label="Neto / hora" value={r.netoHora != null ? formatMoney(r.netoHora) : "—"} />
        <Mini label="Horas" value={r.horas ? `${r.horas} h` : "—"} />
        <Mini label="Millas" value={`${Math.round(r.millas)} mi`} />
      </div>
    </Card>
  );
}

export function Mini({ label, value }) {
  return (
    <div>
      <div className="text-[11.5px]" style={{ color: T.textFaint }}>{label}</div>
      <div className="gc-code text-[15px] font-semibold">{value}</div>
    </div>
  );
}

export function Deducciones({ d, titulo = "Deducciones" }) {
  const max = Math.max(d.gasolina, d.mantenimiento, d.comida, d.peajes, 1);
  const bar = (v) => (
    <div className="h-1.5 rounded-full mt-0.5 mb-1" style={{ backgroundColor: T.border }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round((v / max) * 100)}%`, backgroundColor: "#FF7A72" }} />
    </div>
  );
  return (
    <Card>
      <Eyebrow>{titulo}</Eyebrow>
      <Row label="Gasolina" hint="(pagada, repartida por millas)" value={formatMoney(d.gasolina)} />
      {bar(d.gasolina)}
      <Row label="Mantenimiento" hint="(estimado)" value={formatMoney(d.mantenimiento)} />
      {bar(d.mantenimiento)}
      <Row label="Comida" value={formatMoney(d.comida)} />
      <Row label="Peajes" value={formatMoney(d.peajes)} />
    </Card>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="grid gap-1 rounded-xl p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className="rounded-lg py-2.5 text-[13.5px]"
            style={{ minHeight: 44, backgroundColor: active ? T.red : "transparent", color: active ? "#fff" : T.textSecondary, fontWeight: active ? 600 : 500 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const APP_COLOR = { flex: "#4A9BE8", lyft: "#C86DD7", spark: "#F0A33B", otro: "#9A9A9C", ontrac: "#7C7C7E" };
export const APP_BADGE = {
  flex: { bg: "#12324F", fg: "#8CC4F5" },
  lyft: { bg: "#3A1E40", fg: "#E6A6F0" },
  spark: { bg: "#3A2E14", fg: "#F7C77A" },
  limpieza: { bg: "#16301F", fg: "#8EE8AC" },
};

export function AppBadge({ plataforma, label }) {
  const c = APP_BADGE[plataforma] || { bg: T.surfaceRaised, fg: T.textSecondary };
  return (
    <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.fg }}>
      {label}
    </span>
  );
}

// Barra de la meta semanal: se llena hacia el tramo dorado, con marcas en
// cada umbral, color del tramo y una frase.
export function MetaBar({ neta, u, tramo, porLlegar = 0, compact = false }) {
  const pct = (v) => `${Math.max(0, Math.min(100, (v / u.dorado) * 100))}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="gc-eyebrow text-[11px] uppercase" style={{ color: T.textFaint }}>Meta de la semana</span>
        <span className={`gc-code ${compact ? "text-[14px]" : "text-[18px]"} font-semibold`} style={{ color: tramo.color }}>
          {formatMoney(neta)}
        </span>
      </div>
      <div className="relative rounded-full" style={{ height: compact ? 12 : 18, backgroundColor: T.border }}>
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: pct(neta), backgroundColor: tramo.color }} />
        {[u.basico, u.invertir].map((v) => (
          <div key={v} className="absolute top-[-3px] bottom-[-3px]" style={{ left: pct(v), width: 2, backgroundColor: T.textSecondary }} aria-hidden="true" />
        ))}
      </div>
      <div className="relative h-4 mt-0.5 text-[10.5px] gc-code" style={{ color: T.textFaint }}>
        {[u.basico, u.invertir, u.dorado].map((v) => (
          <span key={v} className="absolute -translate-x-1/2" style={{ left: pct(v) === "100%" ? "calc(100% - 14px)" : pct(v) }}>${v}</span>
        ))}
      </div>
      <div className={`${compact ? "text-[13px]" : "text-[14px]"} mt-1`} style={{ color: T.textPrimary }}>{tramo.texto}</div>
      {porLlegar > 0 && (
        <div className="text-[12px] mt-0.5" style={{ color: T.revisar }}>
          {porLlegar} propina(s) de Flex por llegar (no cuentan hasta que las subas).
        </div>
      )}
    </div>
  );
}
