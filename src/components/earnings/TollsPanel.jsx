import React, { useRef, useState } from "react";
import { Milestone, Plus, Trash2, ChevronDown, ChevronRight, Upload } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO, formatMoney, payWeekLabel } from "../../lib/earnings.js";
import {
  TOLL_AGENCIES,
  TOLL_AGENCY_LABELS,
  validateToll,
  parseTollsCSV,
  tollSpendByPeriod,
} from "../../lib/tolls.js";

// Panel de peajes (SunPass / E-PASS): a mano o importando el CSV de la cuenta.
// El total se resta del neto de la semana/mes (ver StatsCards).
export default function TollsPanel({ tolls, weekStartDow = 6, onAdd, onImport, onDelete }) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState("");
  const [agencia, setAgencia] = useState("sunpass");
  const [lugar, setLugar] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const fileRef = useRef(null);

  const gasto = tollSpendByPeriod(tolls, weekStartDow);

  function add() {
    setError("");
    const chk = validateToll({ fecha, monto, agencia });
    if (!chk.ok) return setError(chk.error);
    onAdd({ fecha, monto, agencia, lugar });
    setMonto("");
    setLugar("");
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setAviso("");
    try {
      const res = parseTollsCSV(await file.text(), agencia, tolls);
      onImport(res.tolls);
      const partes = [`Importados ${res.tolls.length} peaje(s) de ${TOLL_AGENCY_LABELS[agencia]}.`];
      if (res.duplicados) partes.push(`${res.duplicados} ya estaban.`);
      if (res.omitidas.length) {
        const ej = res.omitidas
          .slice(0, 3)
          .map((o) => `fila ${o.fila}: ${o.motivo}`)
          .join("; ");
        partes.push(`${res.omitidas.length} fila(s) omitidas (${ej}${res.omitidas.length > 3 ? "…" : ""}).`);
      }
      setAviso(partes.join(" "));
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  const listado = (tolls || [])
    .slice()
    .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? 1 : -1))
    .slice(0, 30);

  const Chevron = open ? ChevronDown : ChevronRight;
  const fieldStyle = { backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: T.surface }}
      >
        <span className="flex items-center gap-2 text-[13px]" style={{ color: T.textSecondary }}>
          <Milestone size={15} /> Peajes · {tolls.length} cargo(s)
        </span>
        <span className="flex items-center gap-2">
          {gasto.total > 0 && (
            <span className="text-[12px] gc-code" style={{ color: T.revisar }}>
              −{formatMoney(gasto.total)}
            </span>
          )}
          <Chevron size={16} style={{ color: T.textFaint }} />
        </span>
      </button>

      {open && (
        <div className="p-3 space-y-3" style={{ backgroundColor: T.surfaceRaised, borderTop: `1px solid ${T.borderSoft}` }}>
          <div className="grid grid-cols-3 gap-1.5">
            {TOLL_AGENCIES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAgencia(a)}
                className="rounded-lg py-1.5 text-[12.5px]"
                style={{
                  backgroundColor: a === agencia ? T.surface : "transparent",
                  color: a === agencia ? T.textPrimary : T.textFaint,
                  border: `1px solid ${a === agencia ? T.textFaint : T.border}`,
                }}
              >
                {TOLL_AGENCY_LABELS[a]}
              </button>
            ))}
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px]"
            style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
          >
            <Upload size={14} /> Importar CSV de {TOLL_AGENCY_LABELS[agencia]}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" />

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="gc-code w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none" style={fieldStyle} />
            </label>
            <label className="block">
              <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>Monto $</span>
              <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal"
                className="gc-code w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none" style={fieldStyle} />
            </label>
          </div>
          <label className="block">
            <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>Lugar (opcional)</span>
            <input value={lugar} onChange={(e) => setLugar(e.target.value)}
              className="w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none" style={fieldStyle} />
          </label>

          {error && (
            <div className="text-[12.5px] rounded-lg px-2 py-1.5" style={{ backgroundColor: T.redDim, color: T.red }}>
              {error}
            </div>
          )}
          {aviso && (
            <div className="text-[12.5px] rounded-lg px-2 py-1.5" style={{ backgroundColor: T.okDim, color: T.ok }}>
              {aviso}
            </div>
          )}

          <button
            onClick={add}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium"
            style={{ backgroundColor: T.red, color: "#fff" }}
          >
            <Plus size={14} /> Agregar peaje
          </button>

          {gasto.porSemana.length > 0 && (
            <div>
              <div className="text-[10px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                Peajes por semana (sáb→vie)
              </div>
              {gasto.porSemana.slice(0, 3).map((w) => (
                <div key={w.key} className="flex justify-between text-[12px]">
                  <span style={{ color: T.textSecondary }}>{payWeekLabel(w.key)}</span>
                  <span className="gc-code" style={{ color: T.textPrimary }}>{formatMoney(w.gasto)}</span>
                </div>
              ))}
            </div>
          )}

          {listado.length > 0 && (
            <div className="space-y-1.5">
              {listado.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2"
                  style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div className="min-w-0 text-[13px] truncate" style={{ color: T.textPrimary }}>
                    {t.fecha}
                    {t.hora ? ` ${t.hora}` : ""} · {formatMoney(t.monto)} · {TOLL_AGENCY_LABELS[t.agencia] || t.agencia}
                    {t.lugar ? ` · ${t.lugar}` : ""}
                  </div>
                  <button onClick={() => onDelete(t.id)} aria-label="Eliminar peaje">
                    <Trash2 size={15} style={{ color: T.red }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
