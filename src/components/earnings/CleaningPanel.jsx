import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronRight, Plus, Trash2, Save } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, monthLabel, currentMonthKey } from "../../lib/earnings.js";
import { cleaningMonthSummary, cleaningMilesForYear, validateLocal, sanitizeLocal, corvusNet } from "../../lib/cleaning.js";
import { CORVUS_FEE_PCT_DEFAULT } from "../../lib/constants.js";

const fieldStyle = { backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` };

// Limpiezas: resumen del mes por local ($/hora real después de Corvus y del
// costo de llegar) + "Mis locales" con su facturación y fees.
export default function CleaningPanel({ routes, locales, configFor, onSaveLocales }) {
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(currentMonthKey());
  const [editing, setEditing] = useState(false);

  const resumen = cleaningMonthSummary(routes, locales, mes, configFor);
  const millasAno = cleaningMilesForYear(routes, mes.slice(0, 4));
  const meses = Array.from(
    new Set([currentMonthKey(), ...routes.filter((r) => r.plataforma === "limpieza").map((r) => String(r.fecha).slice(0, 7))])
  ).sort().reverse();

  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: T.surface }}
      >
        <span className="flex items-center gap-2 text-[13px]" style={{ color: T.textSecondary }}>
          <Sparkles size={15} /> Limpiezas · {resumen.total.visitas} viaje(s) este mes
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[12px] gc-code" style={{ color: T.textFaint }}>
            {resumen.total.millas} mi
          </span>
          <Chevron size={16} style={{ color: T.textFaint }} />
        </span>
      </button>

      {open && (
        <div className="p-3 space-y-3" style={{ backgroundColor: T.surfaceRaised, borderTop: `1px solid ${T.borderSoft}` }}>
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-[13.5px] outline-none" style={fieldStyle}>
            {meses.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Millas mes" value={`${resumen.total.millas}`} />
            <Stat label={`Millas ${mes.slice(0, 4)}`} value={`${millasAno}`} />
            <Stat label="Horas mes" value={`${resumen.total.horas}`} />
          </div>

          {resumen.locales.length === 0 ? (
            <div className="text-[12.5px]" style={{ color: T.textFaint }}>
              No hay viajes de limpieza en {monthLabel(mes)}. Apúntalos con "Añadir turno" → Limpieza.
            </div>
          ) : (
            <div className="space-y-1.5">
              {resumen.locales.map((l) => (
                <div key={l.nombre} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px]" style={{ color: T.textPrimary }}>{l.nombre}</span>
                    <span className="gc-code text-[14px] font-semibold" style={{ color: l.porHora == null ? T.textFaint : l.porHora >= 0 ? T.ok : T.red }}>
                      {l.porHora != null ? `${formatMoney(l.porHora)}/h` : "—"}
                    </span>
                  </div>
                  <div className="text-[11.5px]" style={{ color: T.textFaint }}>
                    {l.visitas} viaje(s) · {l.horas} h · {l.millas} mi · viajes −{formatMoney(l.costoViajes)}
                  </div>
                  <div className="text-[11.5px]" style={{ color: l.conDatosDePago ? T.textSecondary : T.revisar }}>
                    {l.conDatosDePago
                      ? `Corvus te deja ${formatMoney(l.netoCorvus)} · neto real ${formatMoney(l.netoReal)}`
                      : "Sin datos de pago: añade su facturación en Mis locales"}
                    {l.visitasSinHoras > 0 ? ` · ${l.visitasSinHoras} sin horas` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-[11px]" style={{ color: T.textFaint }}>
            $/hora real = (lo que te deposita Corvus ese mes − gasolina y mantenimiento de los viajes) ÷ horas de casa a casa.
            Es por mes completo: si un mes apuntas pocos viajes, sale más alto de lo real.
          </div>

          {editing ? (
            <LocalesEditor
              locales={locales}
              onSave={(list) => {
                onSaveLocales(list);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full rounded-lg py-2 text-[13px]"
              style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
            >
              Mis locales ({locales.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg py-1.5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
      <div className="text-[9.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>{label}</div>
      <div className="gc-code text-[15px]" style={{ color: T.textPrimary }}>{value}</div>
    </div>
  );
}

function LocalesEditor({ locales, onSave, onCancel }) {
  const [rows, setRows] = useState(() =>
    locales.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      facturacion: l.facturacion == null ? "" : String(l.facturacion),
      feePct: String(l.feePct ?? CORVUS_FEE_PCT_DEFAULT),
      cuotaFinder: l.cuotaFinder ? String(l.cuotaFinder) : "",
    }))
  );
  const [error, setError] = useState("");
  const set = (idx, k, v) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [k]: v } : r)));

  function save() {
    for (const r of rows) {
      const chk = validateLocal(r);
      if (!chk.ok) return setError(`${r.nombre || "Local sin nombre"}: ${chk.error}`);
    }
    onSave(rows.map(sanitizeLocal));
  }

  return (
    <div className="space-y-2">
      {rows.map((r, idx) => {
        const neto = corvusNet(sanitizeLocal(r));
        return (
          <div key={r.id || idx} className="rounded-lg p-2 space-y-1.5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex gap-1.5">
              <input value={r.nombre} onChange={(e) => set(idx, "nombre", e.target.value)} placeholder="Nombre del local"
                className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[13.5px] outline-none" style={fieldStyle} />
              <button onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))} aria-label="Quitar local">
                <Trash2 size={15} style={{ color: T.red }} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Small label="Factura $/mes" value={r.facturacion} onChange={(v) => set(idx, "facturacion", v)} />
              <Small label="Fees %" value={r.feePct} onChange={(v) => set(idx, "feePct", v)} />
              <Small label="Cuota Finder $" value={r.cuotaFinder} onChange={(v) => set(idx, "cuotaFinder", v)} />
            </div>
            <div className="text-[11px]" style={{ color: T.textFaint }}>
              {neto != null ? `Te deposita ~${formatMoney(neto)}/mes` : "Sin facturación no se puede calcular"}
            </div>
          </div>
        );
      })}
      <button
        onClick={() => setRows((rs) => [...rs, { nombre: "", facturacion: "", feePct: String(CORVUS_FEE_PCT_DEFAULT), cuotaFinder: "" }])}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px]"
        style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
      >
        <Plus size={14} /> Añadir local
      </button>
      {error && <div className="text-[12px]" style={{ color: T.red }}>{error}</div>}
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium" style={{ backgroundColor: T.red, color: "#fff" }}>
          <Save size={14} /> Guardar locales
        </button>
        <button onClick={onCancel} className="rounded-lg py-2 px-3 text-[13px]" style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Small({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[9.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal"
        className="gc-code w-full mt-0.5 rounded-lg px-2 py-1.5 text-[13px] outline-none" style={fieldStyle} />
    </label>
  );
}
