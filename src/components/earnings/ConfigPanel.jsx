import React, { useState } from "react";
import { Settings, Save, X, Fuel } from "lucide-react";
import { T } from "../../lib/theme.js";
import { validateNonNegative } from "../../lib/earnings.js";

// Panel para ajustar la config de costos: precio de gasolina, MPG y
// mantenimiento por milla. El gasto/neto se recalcula solo (derivado).
export default function ConfigPanel({ config, onSave }) {
  const [open, setOpen] = useState(false);
  const [gas, setGas] = useState(String(config.gas_price));
  const [mpg, setMpg] = useState(String(config.mpg));
  const [maint, setMaint] = useState(String(config.maintenance_cost_per_mile));
  const [tMpg, setTMpg] = useState(String(config.tucson_mpg));
  const [tMaint, setTMaint] = useState(String(config.tucson_maintenance_cost_per_mile));
  const [error, setError] = useState("");

  function start() {
    setGas(String(config.gas_price));
    setMpg(String(config.mpg));
    setMaint(String(config.maintenance_cost_per_mile));
    setTMpg(String(config.tucson_mpg));
    setTMaint(String(config.tucson_maintenance_cost_per_mile));
    setError("");
    setOpen(true);
  }

  function save() {
    const g = validateNonNegative(gas, "El precio de gasolina");
    const m = Number(mpg);
    const mt = validateNonNegative(maint, "El mantenimiento por milla");
    if (!g.ok) return setError(g.error);
    if (!Number.isFinite(m) || m <= 0) return setError("El MPG debe ser mayor que 0.");
    if (!mt.ok) return setError(mt.error);
    const tm = Number(tMpg);
    const tmt = validateNonNegative(tMaint, "El mantenimiento por milla del Tucson");
    if (!Number.isFinite(tm) || tm <= 0) return setError("El MPG del Tucson debe ser mayor que 0.");
    if (!tmt.ok) return setError(tmt.error);
    onSave({
      ...config,
      gas_price: g.value,
      mpg: m,
      maintenance_cost_per_mile: mt.value,
      tucson_mpg: tm,
      tucson_maintenance_cost_per_mile: tmt.value,
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={start}
        className="w-full flex items-center justify-between rounded-xl px-3 py-2.5"
        style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
      >
        <span className="flex items-center gap-2 text-[13px]" style={{ color: T.textSecondary }}>
          <Fuel size={15} /> Gas ${Number(config.gas_price).toFixed(2)}/gal · Kia {config.mpg} · Tucson{" "}
          {config.tucson_mpg} MPG
        </span>
        <Settings size={15} style={{ color: T.textFaint }} />
      </button>
    );
  }

  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: T.surfaceRaised, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="gc-eyebrow text-[11px] uppercase" style={{ color: T.textFaint }}>
          Costos (para la ganancia neta)
        </span>
        <button onClick={() => setOpen(false)} aria-label="Cerrar">
          <X size={16} style={{ color: T.textSecondary }} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Gas $/gal" value={gas} onChange={setGas} />
      </div>
      <div className="text-[11px] mt-2 mb-1" style={{ color: T.textSecondary }}>
        Kia Sorento
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="MPG asumido" value={mpg} onChange={setMpg} />
        <Field label="Mant $/mi" value={maint} onChange={setMaint} />
      </div>
      <div className="text-[11px] mt-2 mb-1" style={{ color: T.textSecondary }}>
        Hyundai Tucson
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="MPG asumido" value={tMpg} onChange={setTMpg} />
        <Field label="Mant $/mi" value={tMaint} onChange={setTMaint} />
      </div>
      {error && (
        <div className="text-[12px] mt-2" style={{ color: T.red }}>
          {error}
        </div>
      )}
      <button
        onClick={save}
        className="w-full mt-2.5 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium"
        style={{ backgroundColor: T.red, color: "#fff" }}
      >
        <Save size={14} /> Guardar
      </button>
      <div className="text-[11px] mt-2" style={{ color: T.textFaint }}>
        El MPG asumido se usa hasta que haya 2 llenados de ese carro; luego se usa
        el real. El MPG del Tucson (25) es una suposición: ajústalo si sabes el tuyo.
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="gc-code w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none"
        style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
      />
    </label>
  );
}
