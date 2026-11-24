import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, round2, todayISO } from "../../lib/earnings.js";
import { periodo, moverPeriodo, resumenPeriodo } from "../../lib/resumen.js";
import { Card, Eyebrow, NetoHero, Deducciones, Segmented, APP_COLOR } from "./ui.jsx";

const TIPOS = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "año", label: "Año" },
];

// Pestaña Resumen: periodo con ‹ ›, Ganado − Deducciones = Neto, deducciones,
// comparación con el periodo anterior, últimos periodos y reparto por app.
export default function ResumenView({ datos, startDow }) {
  const [p, setP] = useState(() => periodo("semana", todayISO(), startDow));
  const { actual: r, anterior: a, serie } = useMemo(() => resumenPeriodo(datos, p, startDow), [datos, p, startDow]);
  const maxSerie = Math.max(...serie.map((s) => Math.abs(s.neto)), 1);
  const nombre = p.tipo === "semana" ? "semana" : p.tipo === "mes" ? "mes" : "año";

  return (
    <div className="space-y-3">
      <Segmented label="Periodo" options={TIPOS} value={p.tipo} onChange={(t) => setP(periodo(t, todayISO(), startDow))} />
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Periodo anterior" onClick={() => setP(moverPeriodo(p, -1, startDow))} className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-semibold capitalize">{p.label}</span>
        <button type="button" aria-label="Periodo siguiente" onClick={() => setP(moverPeriodo(p, 1, startDow))} className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {r.registros === 0 ? (
        <Card>
          <div className="text-[14px] text-center py-4" style={{ color: T.textFaint }}>Sin trabajos apuntados en este {nombre}.</div>
        </Card>
      ) : (
        <>
          <NetoHero r={r} />
          <Deducciones d={r.deducciones} gasolinaPagada={r.gasolinaPagada} />
        </>
      )}

      <Card>
        <Eyebrow right={`vs ${a.label}`}>Comparación</Eyebrow>
        <div className="grid gap-x-2 gap-y-1.5 text-[13px] items-baseline" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}>
          <span />
          <span className="text-right text-[11.5px]" style={{ color: T.textFaint }}>Este</span>
          <span className="text-right text-[11.5px]" style={{ color: T.textFaint }}>Anterior</span>
          <span className="text-right text-[11.5px]" style={{ color: T.textFaint }}>Cambio</span>
          <Fila label="Ganado" a={r.ganado} b={a.ganado} money />
          <Fila label="Neto" a={r.neto} b={a.neto} money />
          <Fila label="Neto/hora" a={r.netoHora} b={a.netoHora} money />
          <Fila label="Horas" a={r.horas} b={a.horas} neutral />
          <Fila label="Millas" a={Math.round(r.millas)} b={Math.round(a.millas)} neutral />
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="text-[12.5px] mb-2" style={{ color: T.textFaint }}>Neto de los últimos periodos</div>
          <div className="flex items-end gap-2" style={{ height: 110 }}>
            {serie.map((s, i) => {
              const ult = i === serie.length - 1;
              return (
                <div key={s.desde} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="gc-code text-[11px]" style={{ color: ult ? T.textPrimary : T.textSecondary }}>{Math.round(s.neto) ? `$${Math.round(s.neto)}` : "—"}</span>
                  <div className="w-full rounded-t-md" style={{ height: Math.max(3, Math.round((Math.abs(s.neto) / maxSerie) * 70)), backgroundColor: s.neto < 0 ? T.red : ult ? T.ok : "#3A3A3D" }} />
                  <span className="text-[10.5px] text-center leading-tight" style={{ color: ult ? T.textPrimary : T.textFaint }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {r.porApp.length > 0 && (
        <Card>
          <Eyebrow>Por app</Eyebrow>
          <div className="flex h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: T.border }}>
            {r.porApp.map((x) => (
              <div key={x.plataforma} style={{ width: `${r.ganado > 0 ? (x.ganado / r.ganado) * 100 : 0}%`, backgroundColor: APP_COLOR[x.plataforma] || T.textFaint }} />
            ))}
          </div>
          {r.porApp.map((x) => (
            <div key={x.plataforma} className="flex justify-between text-[14px] py-1">
              <span>
                <span className="inline-block rounded-sm mr-1.5" style={{ width: 10, height: 10, backgroundColor: APP_COLOR[x.plataforma] || T.textFaint }} />
                {x.label} · {x.registros}
                {x.ganadoHora != null && <span style={{ color: T.textFaint }}> · {formatMoney(x.ganadoHora)}/h bruto</span>}
              </span>
              <span className="gc-code">{formatMoney(x.ganado)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Fila({ label, a, b, money, neutral }) {
  const fmt = (v) => (v == null ? "—" : money ? formatMoney(v) : String(v));
  const diff = a != null && b != null ? round2(a - b) : null;
  const color = neutral || diff == null || diff === 0 ? T.textSecondary : diff > 0 ? T.ok : T.red;
  const txt = diff == null ? "—" : `${diff > 0 ? "▲ " : diff < 0 ? "▼ " : ""}${money ? formatMoney(Math.abs(diff)) : (diff > 0 ? "+" : "") + diff}`;
  return (
    <>
      <span>{label}</span>
      <span className="gc-code text-right">{fmt(a)}</span>
      <span className="gc-code text-right" style={{ color: T.textSecondary }}>{fmt(b)}</span>
      <span className="gc-code text-right" style={{ color }}>{txt}</span>
    </>
  );
}
