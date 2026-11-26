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

const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fechaCortaUI = (f) => `${Number(f.slice(8, 10))} ${MES_CORTO[Number(f.slice(5, 7)) - 1]}`;

// Deducciones con cada fila tocable: abre la lista de gastos de esa categoría
// (`detalle` de detalleGastos).
export function Deducciones({ d, detalle = null, titulo = "Deducciones" }) {
  const [abierta, setAbierta] = React.useState(null);
  const max = Math.max(d.gasolina, d.mantenimiento, d.comida, d.peajes, 1);
  const filas = [
    ["gasolina", "Gasolina", "(pagada, repartida por millas)"],
    ["mantenimiento", "Mantenimiento", "(pagado)"],
    ["comida", "Comida", ""],
    ["peajes", "Peajes", ""],
  ];
  return (
    <Card>
      <Eyebrow right={detalle ? "toca para ver" : null}>{titulo}</Eyebrow>
      {filas.map(([k, label, hint]) => {
        const open = abierta === k;
        const items = detalle ? detalle[k] || [] : [];
        return (
          <div key={k}>
            <button type="button" disabled={!detalle} aria-expanded={open} onClick={() => setAbierta(open ? null : k)} className="w-full text-left" style={{ minHeight: 40 }}>
              <Row label={<>{detalle ? (open ? "▾ " : "▸ ") : ""}{label}</>} hint={hint} value={formatMoney(d[k])} />
              <div className="h-1.5 rounded-full mt-0.5 mb-1" style={{ backgroundColor: T.border }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((d[k] / max) * 100)}%`, backgroundColor: "#FF7A72" }} />
              </div>
            </button>
            {open && (
              <div className="rounded-lg px-2.5 py-1.5 mb-2" style={{ backgroundColor: T.surfaceRaised }}>
                {k === "gasolina" && (
                  <div className="text-[11.5px] mb-1" style={{ color: T.textFaint }}>
                    Pagado en la(s) semana(s) {fechaCortaUI(detalle.gasolinaSemanas.desde)} – {fechaCortaUI(detalle.gasolinaSemanas.hasta)}; aquí se resta la parte de estas millas.
                  </div>
                )}
                {items.length === 0 ? (
                  <div className="text-[12.5px] py-1" style={{ color: T.textFaint }}>Nada apuntado.</div>
                ) : (
                  items.map((x, i) => (
                    <div key={i} className="flex justify-between text-[13px] py-0.5">
                      <span style={{ color: T.textSecondary }}>{fechaCortaUI(x.fecha)}{x.nota ? ` · ${x.nota}` : ""}</span>
                      <span className="gc-code">{formatMoney(x.monto)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
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

export const APP_COLOR = { flex: "#4A9BE8", lyft: "#C86DD7", spark: "#2EC4B6", ups: "#B08968", otro: "#9A9A9C", ontrac: "#7C7C7E" };
export const APP_BADGE = {
  flex: { bg: "#12324F", fg: "#8CC4F5" },
  lyft: { bg: "#3A1E40", fg: "#E6A6F0" },
  spark: { bg: "#0F3330", fg: "#7FE0D6" },
  ups: { bg: "#33261C", fg: "#D9B89A" },
  limpieza: { bg: "#16301F", fg: "#8EE8AC" },
};

// Número que sube contando desde su valor anterior (o 0) hasta `valor` en
// ~0.8 s. Con «Reducir movimiento» sale directo.
export function useContando(valor, ms = 800) {
  const [v, setV] = React.useState(() => (reducirMovimiento() ? valor : 0));
  const desde = React.useRef(v);
  React.useEffect(() => {
    if (reducirMovimiento()) { setV(valor); desde.current = valor; return; }
    const a = desde.current, t0 = performance.now();
    let id;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const x = a + (valor - a) * (1 - Math.pow(1 - k, 3));
      setV(x);
      desde.current = x;
      if (k < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor, ms]);
  return v;
}

export function reducirMovimiento() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

export function AppBadge({ plataforma, label }) {
  const c = APP_BADGE[plataforma] || { bg: T.surfaceRaised, fg: T.textSecondary };
  return (
    <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: c.bg, color: c.fg }}>
      {label}
    </span>
  );
}

// Barra de meta por tramos (semanal o mensual): cada tramo con su color, se
// llena en orden hasta la meta, con una marca en cada hito y una frase.
export function MetaBar({ titulo = "Meta de la semana", neta, tramos, meta, color, texto, lineas = [], porLlegar = 0, compact = false }) {
  const pct = (v) => Math.max(0, Math.min(100, (v / (meta || 1)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="gc-eyebrow text-[11px] uppercase" style={{ color: T.textFaint }}>{titulo}</span>
        <span className={`gc-code ${compact ? "text-[14px]" : "text-[18px]"} font-semibold`} style={{ color }}>
          {formatMoney(neta)} <span className="text-[12px] font-normal" style={{ color: T.textFaint }}>/ {formatMoney(meta)}</span>
        </span>
      </div>
      <div className="relative rounded-full overflow-hidden" style={{ height: compact ? 12 : 18, backgroundColor: T.border }} role="img" aria-label={`${titulo}: ${formatMoney(neta)} de ${formatMoney(meta)}`}>
        {tramos.map((t) => (
          <React.Fragment key={t.id}>
            <div className="absolute top-0 h-full" style={{ left: `${pct(t.desde)}%`, width: `${pct(t.hasta) - pct(t.desde)}%`, backgroundColor: t.color, opacity: 0.18 }} />
            <div className="absolute top-0 h-full" style={{ left: `${pct(t.desde)}%`, width: `${pct(Math.min(Math.max(neta, t.desde), t.hasta)) - pct(t.desde)}%`, backgroundColor: t.color }} />
          </React.Fragment>
        ))}
        {tramos.slice(0, -1).map((t) => (
          <div key={t.id + "m"} className="absolute top-0 h-full" style={{ left: `${pct(t.hasta)}%`, width: 2, backgroundColor: T.bg || "#000" }} aria-hidden="true" />
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px]" style={{ color: T.textFaint }}>
          {tramos.map((t) => (
            <span key={t.id} className="flex items-center gap-1">
              <span className="inline-block rounded-full" style={{ width: 7, height: 7, backgroundColor: t.color }} />
              {t.label} <span className="gc-code">{formatMoney(t.hasta)}</span>
            </span>
          ))}
        </div>
      )}
      {texto && <div className={`${compact ? "text-[13px]" : "text-[14px]"} mt-1.5`} style={{ color: T.textPrimary }}>{texto}</div>}
      {lineas.filter(Boolean).map((l, i) => (
        <div key={i} className="text-[12.5px] mt-0.5" style={{ color: T.textSecondary }}>{l}</div>
      ))}
      {porLlegar > 0 && (
        <div className="text-[12px] mt-0.5" style={{ color: T.revisar }}>
          {porLlegar} propina(s) de Flex por llegar (no cuentan hasta que las subas).
        </div>
      )}
    </div>
  );
}
