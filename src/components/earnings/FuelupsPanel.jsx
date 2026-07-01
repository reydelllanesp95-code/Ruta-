import React, { useState } from "react";
import { Fuel, Plus, Trash2, X, ChevronDown, ChevronRight } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO, formatMoney } from "../../lib/earnings.js";
import { validateFuelup, maxOdometro } from "../../lib/fuel.js";

// Panel de llenados de gasolina (fuel-ups) para calcular el MPG real.
export default function FuelupsPanel({ fuelups, effInfo, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(todayISO());
  const [galones, setGalones] = useState("");
  const [costo, setCosto] = useState("");
  const [odometro, setOdometro] = useState("");
  const [error, setError] = useState("");

  const prevOdo = maxOdometro(fuelups);

  function add() {
    setError("");
    const chk = validateFuelup({ galones, odometro }, prevOdo); // [ajuste 3]
    if (!chk.ok) return setError(chk.error);
    onAdd({ fecha, galones, costo, odometro });
    setGalones("");
    setCosto("");
    setOdometro("");
  }

  const listado = (fuelups || [])
    .slice()
    .sort((a, b) => Number(b.odometro) - Number(a.odometro));

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: T.surface }}
      >
        <span className="flex items-center gap-2 text-[13px]" style={{ color: T.textSecondary }}>
          <Fuel size={15} /> Gasolina · {fuelups.length} llenado(s)
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: effInfo.source === "real" ? T.ok : T.textFaint }}>
            {effInfo.source === "real" ? `MPG real ${effInfo.real}` : `MPG asumido ${effInfo.mpg}`}
          </span>
          <Chevron size={16} style={{ color: T.textFaint }} />
        </span>
      </button>

      {open && (
        <div className="p-3 space-y-3" style={{ backgroundColor: T.surfaceRaised, borderTop: `1px solid ${T.borderSoft}` }}>
          {effInfo.source !== "real" && (
            <div className="text-[12px]" style={{ color: T.textFaint }}>
              Agrega al menos 2 llenados con odómetro para calcular tu MPG real.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Fecha" value={fecha} onChange={setFecha} type="date" />
            <Field label="Odómetro (millas)" value={odometro} onChange={setOdometro} />
            <Field label="Galones" value={galones} onChange={setGalones} />
            <Field label="Costo $ (opcional)" value={costo} onChange={setCosto} />
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
            <Plus size={14} /> Agregar llenado
          </button>

          {listado.length > 0 && (
            <div className="space-y-1.5">
              {listado.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2"
                  style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
                >
                  <div className="min-w-0">
                    <div className="text-[13px]" style={{ color: T.textPrimary }}>
                      {f.fecha} · {f.galones} gal
                      {f.costo != null ? ` · ${formatMoney(f.costo)}` : ""}
                    </div>
                    <div className="gc-code text-[11.5px]" style={{ color: T.textFaint }}>
                      odómetro {Number(f.odometro).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => onDelete(f.id)} aria-label="Eliminar llenado">
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
