import React, { useState } from "react";
import { Utensils, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO, formatMoney, payWeekLabel, monthLabel, round2 } from "../../lib/earnings.js";
import { MEAL_TYPES, MEAL_TYPE_LABELS } from "../../lib/constants.js";
import { validateMeal, mealSpendByPeriod, mealSpendForKey } from "../../lib/meals.js";

// Panel de gastos de comida. RESTA del neto semanal/mensual (no del por-ruta).
export default function MealsPanel({
  meals,
  weekStartDow = 6,
  semanaLabel,
  semanaNet,
  semanaKey,
  mesLabel,
  mesNet,
  mesKey,
  onAdd,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(todayISO());
  const [tipo, setTipo] = useState("almuerzo");
  const [costo, setCosto] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");

  const gasto = mealSpendByPeriod(meals, weekStartDow);
  const gastoSemana = mealSpendForKey(meals, semanaKey, weekStartDow);
  const gastoMes = mealSpendForKey(meals, mesKey, weekStartDow);
  const netoSemana = round2((Number(semanaNet) || 0) - gastoSemana);
  const netoMes = round2((Number(mesNet) || 0) - gastoMes);

  function add() {
    setError("");
    const chk = validateMeal({ fecha, tipo, costo });
    if (!chk.ok) return setError(chk.error);
    onAdd({ fecha, tipo, costo, nota });
    setCosto("");
    setNota("");
  }

  const listado = (meals || [])
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
          <Utensils size={15} /> Comida · {meals.length} gasto(s)
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
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEAL_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Costo $ (opcional)" value={costo} onChange={setCosto} />
            <Field label="Nota (opcional)" value={nota} onChange={setNota} type="text" />
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
            <Plus size={14} /> Agregar comida
          </button>

          {/* Neto después de comida (derivado; resta del neto del período) */}
          <div className="rounded-lg p-2.5 space-y-1" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
            <div className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
              Neto después de comida
            </div>
            <NetoLine label={semanaLabel} gasto={gastoSemana} neto={netoSemana} />
            <NetoLine label={mesLabel} gasto={gastoMes} neto={netoMes} />
          </div>

          {gasto.sinCosto > 0 && (
            <div className="text-[11.5px]" style={{ color: T.revisar }}>
              {gasto.sinCosto} de {gasto.count} comidas sin costo — total parcial.
            </div>
          )}

          {gasto.porSemana.length > 0 && (
            <div>
              <div className="text-[10px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                Gasto de comida por semana (sáb→vie)
              </div>
              {gasto.porSemana.slice(0, 3).map((w) => (
                <div key={w.key} className="flex justify-between text-[12px]">
                  <span style={{ color: T.textSecondary }}>{payWeekLabel(w.key)}</span>
                  <span className="gc-code" style={{ color: T.textPrimary }}>{formatMoney(w.gasto)}</span>
                </div>
              ))}
            </div>
          )}

          {gasto.porMes.length > 0 && (
            <div>
              <div className="text-[10px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                Gasto de comida por mes
              </div>
              {gasto.porMes.slice(0, 3).map((m) => (
                <div key={m.key} className="flex justify-between text-[12px]">
                  <span style={{ color: T.textSecondary }}>{monthLabel(m.key)}</span>
                  <span className="gc-code" style={{ color: T.textPrimary }}>{formatMoney(m.gasto)}</span>
                </div>
              ))}
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
                      {m.fecha} · {MEAL_TYPE_LABELS[m.tipo] || m.tipo}
                      {m.costo != null ? ` · ${formatMoney(m.costo)}` : " · sin costo"}
                    </div>
                    {m.nota ? (
                      <div className="text-[11.5px]" style={{ color: T.textFaint }}>{m.nota}</div>
                    ) : null}
                  </div>
                  <button onClick={() => onDelete(m.id)} aria-label="Eliminar comida">
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

function NetoLine({ label, gasto, neto }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span style={{ color: T.textSecondary }}>
        {label}
        {gasto > 0 ? ` (−${formatMoney(gasto)} comida)` : ""}
      </span>
      <span className="gc-code font-semibold" style={{ color: neto >= 0 ? T.ok : T.red }}>
        {formatMoney(neto)}
      </span>
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
        inputMode={type === "date" || type === "text" ? undefined : "decimal"}
        type={type === "date" ? "date" : "text"}
        className="gc-code w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none"
        style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
      />
    </label>
  );
}
