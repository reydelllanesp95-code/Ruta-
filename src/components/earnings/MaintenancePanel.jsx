import React, { useState } from "react";
import { Wrench, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO, formatMoney, monthLabel } from "../../lib/earnings.js";
import { MAINT_TYPES, MAINT_TYPE_LABELS } from "../../lib/constants.js";
import { validateMaint, maintByMonth, histMaintCostPerMile } from "../../lib/maintenance.js";

// Panel de mantenimiento: histórico + insights informativos. NO cambia el
// cálculo por ruta (eso usa el maintenance_cost_per_mile de la config).
export default function MaintenancePanel({ maints, onAdd, onDelete, onApplyCostPerMile }) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(todayISO());
  const [tipo, setTipo] = useState(MAINT_TYPES[0]);
  const [costo, setCosto] = useState("");
  const [odometro, setOdometro] = useState("");
  const [error, setError] = useState("");

  const porMes = maintByMonth(maints);
  const hist = histMaintCostPerMile(maints);

  function add() {
    setError("");
    const chk = validateMaint({ fecha, costo, odometro });
    if (!chk.ok) return setError(chk.error);
    onAdd({ fecha, tipo, costo, odometro });
    setCosto("");
    setOdometro("");
  }

  const listado = (maints || [])
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: T.surface }}
      >
        <span className="flex items-center gap-2 text-[13px]" style={{ color: T.textSecondary }}>
          <Wrench size={15} /> Mantenimiento · {maints.length} registro(s)
        </span>
        <Chevron size={16} style={{ color: T.textFaint }} />
      </button>

      {open && (
        <div className="p-3 space-y-3" style={{ backgroundColor: T.surfaceRaised, borderTop: `1px solid ${T.borderSoft}` }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Fecha" value={fecha} onChange={setFecha} type="date" />
            <label className="block">
              <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                Tipo
              </span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none"
                style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
              >
                {MAINT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MAINT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Costo $ (opcional)" value={costo} onChange={setCosto} />
            <Field label="Odómetro (opcional)" value={odometro} onChange={setOdometro} />
          </div>

          {error && (
            <div className="text-[12.5px] rounded-lg px-2 py-1.5" style={{ backgroundColor: T.redDim, color: T.red }}>
              {error}
            </div>
          )}

          <button
            onClick={add}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium"
            style={{ backgroundColor: T.red, color: "#fff" }}
          >
            <Plus size={14} /> Agregar mantenimiento
          </button>

          {/* Estimación histórica de costo/milla (informativa, NO es la config) */}
          <div className="rounded-lg p-2.5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
              Costo/milla histórico (estimación)
            </div>
            {hist ? (
              <>
                <div className="flex items-center justify-between mt-1">
                  <span className="gc-code text-[16px] font-semibold" style={{ color: T.textPrimary }}>
                    ~{formatMoney(hist.costPerMile)}/mi
                  </span>
                  <button
                    onClick={() => onApplyCostPerMile(hist.costPerMile)}
                    className="text-[12px] rounded-lg px-2.5 py-1"
                    style={{ backgroundColor: T.surfaceRaised, color: T.red, border: `1px solid ${T.redDim}` }}
                  >
                    Usar este valor
                  </button>
                </div>
                <div className="text-[11px] mt-1" style={{ color: T.textFaint }}>
                  Estimación sobre {hist.span.toLocaleString()} mi de odómetro. No es exacto y no
                  cambia la config hasta que toques "Usar este valor".
                  {hist.sinCosto > 0 ? ` ${hist.sinCosto} registro(s) sin costo (excluidos).` : ""}
                </div>
              </>
            ) : (
              <div className="text-[12px] mt-1" style={{ color: T.textFaint }}>
                Agrega al menos 2 registros con odómetro (y algún costo) para estimarlo.
              </div>
            )}
          </div>

          {porMes.length > 0 && (
            <div>
              <div className="text-[10.5px] uppercase gc-eyebrow mb-1" style={{ color: T.textFaint }}>
                Gasto por mes
              </div>
              <div className="space-y-1">
                {porMes.map((m) => (
                  <div key={m.key} className="flex items-center justify-between text-[12.5px]">
                    <span style={{ color: T.textSecondary }}>{monthLabel(m.key)}</span>
                    <span className="gc-code" style={{ color: T.textPrimary }}>
                      {formatMoney(m.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {listado.length > 0 && (
            <div className="space-y-1.5">
              {listado.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2"
                  style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div className="min-w-0">
                    <div className="text-[13px]" style={{ color: T.textPrimary }}>
                      {m.fecha} · {MAINT_TYPE_LABELS[m.tipo] || m.tipo}
                      {m.costo != null ? ` · ${formatMoney(m.costo)}` : " · sin costo"}
                    </div>
                    {m.odometro != null && (
                      <div className="gc-code text-[11.5px]" style={{ color: T.textFaint }}>
                        odómetro {Number(m.odometro).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button onClick={() => onDelete(m.id)} aria-label="Eliminar mantenimiento">
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

function Field({ label, value, onChange, type }) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={type === "date" ? undefined : "decimal"}
        type={type || "text"}
        className="gc-code w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none"
        style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
      />
    </label>
  );
}
