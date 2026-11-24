import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, round2 } from "../../lib/earnings.js";
import { resumenDia, addDays } from "../../lib/resumen.js";
import { jornadaMiles } from "../../lib/jornada.js";
import { vehicleLabel } from "../../lib/vehicles.js";
import { Card, Eyebrow, NetoHero, Deducciones } from "./ui.jsx";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function nombreDia(fecha) {
  const [y, m, d] = fecha.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[wd][0].toUpperCase()}${DIAS[wd].slice(1)} ${d} ${MESES[m - 1]}`;
}

// Un día por dentro: neto, deducciones, jornada y cada trabajo (editable con
// `renderRegistro`, que pinta la tarjeta de siempre).
export default function DiaView({ datos, fecha, jornadas, onFecha, onBack, renderRegistro }) {
  const r = useMemo(() => resumenDia(datos, fecha), [datos, fecha]);
  const delDia = (jornadas || []).filter((j) => j.fecha === fecha);
  const apps = r.porApp;

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="text-[14px] flex items-center gap-1" style={{ color: T.textSecondary, minHeight: 44 }}>
        <ChevronLeft size={16} /> Turnos
      </button>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Día anterior" onClick={() => onFecha(addDays(fecha, -1))} className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="gc-wordmark text-[24px] leading-tight">{nombreDia(fecha)}</div>
          <div className="text-[12.5px]" style={{ color: T.textSecondary }}>
            {apps.map((a) => a.label).join(" + ") || "Sin trabajos"}
            {delDia.length > 0 && ` · ${vehicleLabel(delDia[0].vehiculo)}`}
          </div>
        </div>
        <button type="button" aria-label="Día siguiente" onClick={() => onFecha(addDays(fecha, 1))} className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {r.registros > 0 && <NetoHero r={r} netoLabel="Neto del día" />}

      {delDia.length > 0 && (
        <Card>
          <Eyebrow>Jornada</Eyebrow>
          {delDia.map((j) => (
            <div key={j.id} className="grid grid-cols-2 gap-2 mb-1">
              <Caja titulo="Salí" hora={j.horaSalida} odo={j.odoSalida} />
              <Caja titulo="Llegué" hora={j.horaLlegada || "—"} odo={j.odoLlegada} />
            </div>
          ))}
          <div className="text-[12.5px] mt-1" style={{ color: T.textSecondary }}>
            {round2(delDia.reduce((s, j) => s + jornadaMiles(j), 0))} millas · {r.horas} h trabajadas
          </div>
        </Card>
      )}

      {apps.length > 0 && (
        <Card>
          <Eyebrow>Por app</Eyebrow>
          {apps.map((a) => (
            <div key={a.plataforma} className="flex justify-between text-[14px] py-1">
              <span>{a.label} · {a.registros}{a.ganadoHora != null && <span style={{ color: T.textFaint }}> · {formatMoney(a.ganadoHora)}/h bruto</span>}</span>
              <span className="gc-code">{formatMoney(a.ganado)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[12.5px] pt-2 mt-1" style={{ color: T.textSecondary, borderTop: `1px solid ${T.border}` }}>
            <span>Propinas <span className="gc-code" style={{ color: T.textPrimary }}>{formatMoney(r.propinas)}</span></span>
            <span>Base <span className="gc-code" style={{ color: T.textPrimary }}>{formatMoney(round2(r.ganado - r.propinas))}</span></span>
          </div>
        </Card>
      )}

      {r.registros > 0 && <Deducciones d={r.deducciones} gasolinaPagada={r.gasolinaPagada} titulo="Deducciones del día" />}

      <div>
        <div className="gc-eyebrow text-[11px] uppercase px-1 py-1.5" style={{ color: T.textFaint }}>Lo que hiciste</div>
        {r.lista.length === 0 ? (
          <div className="text-center py-6 text-[13.5px]" style={{ color: T.textFaint }}>Nada apuntado este día.</div>
        ) : (
          <div className="space-y-2">{r.lista.map((x) => renderRegistro(x))}</div>
        )}
      </div>
    </div>
  );
}

function Caja({ titulo, hora, odo }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: T.surfaceRaised }}>
      <div className="text-[11.5px]" style={{ color: T.textFaint }}>{titulo}</div>
      <div className="gc-code text-[15px] font-semibold">{hora}</div>
      {odo != null && <div className="gc-code text-[12px]" style={{ color: T.textSecondary }}>{Number(odo).toLocaleString("en-US")}</div>}
    </div>
  );
}
