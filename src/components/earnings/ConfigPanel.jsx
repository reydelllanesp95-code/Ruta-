import React, { useState } from "react";
import { Settings, Save, X, Wrench } from "lucide-react";
import { T } from "../../lib/theme.js";
import { validateNonNegative } from "../../lib/earnings.js";

// Panel para ajustar el mantenimiento por milla y la meta semanal. La
// gasolina no se configura: se usa la pagada. El neto se recalcula solo.
export default function ConfigPanel({ config, onSave }) {
  const [open, setOpen] = useState(false);
  const [maint, setMaint] = useState(String(config.maintenance_cost_per_mile));
  const [tMaint, setTMaint] = useState(String(config.tucson_maintenance_cost_per_mile));
  const META = [
    ["meta_basico", "Básico $"],
    ["meta_invertir", "Invertir desde $"],
    ["meta_dorado", "Dorado desde $"],
    ["meta_deuda", "A deuda $"],
    ["meta_inversion", "A inversión $"],
    ["meta_trading_pct", "Trading %"],
  ];
  const metaDe = (c) => Object.fromEntries(META.map(([k]) => [k, String(c[k] ?? "")]));
  const [meta, setMeta] = useState(() => metaDe(config));
  const [error, setError] = useState("");

  function start() {
    setMaint(String(config.maintenance_cost_per_mile));
    setTMaint(String(config.tucson_maintenance_cost_per_mile));
    setMeta(metaDe(config));
    setError("");
    setOpen(true);
  }

  function save() {
    const mt = validateNonNegative(maint, "El mantenimiento por milla");
    if (!mt.ok) return setError(mt.error);
    const tmt = validateNonNegative(tMaint, "El mantenimiento por milla del Tucson");
    if (!tmt.ok) return setError(tmt.error);
    const metaVals = {};
    for (const [k, label] of META) {
      const v = validateNonNegative(meta[k], label.replace(/ [$%]$/, ""));
      if (!v.ok) return setError(v.error);
      metaVals[k] = v.value;
    }
    if (!(metaVals.meta_basico <= metaVals.meta_invertir && metaVals.meta_invertir <= metaVals.meta_dorado)) {
      return setError("Los tramos deben ir de menor a mayor: básico ≤ invertir ≤ dorado.");
    }
    if (metaVals.meta_trading_pct > 100) return setError("Trading % no puede pasar de 100.");
    onSave({
      ...config,
      maintenance_cost_per_mile: mt.value,
      tucson_maintenance_cost_per_mile: tmt.value,
      ...metaVals,
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
          <Wrench size={15} /> Mantenimiento y meta semanal
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
      <div className="text-[11px] mb-1" style={{ color: T.textSecondary }}>
        Kia Sorento
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Mant $/mi" value={maint} onChange={setMaint} />
      </div>
      <div className="text-[11px] mt-2 mb-1" style={{ color: T.textSecondary }}>
        Hyundai Tucson
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Mant $/mi" value={tMaint} onChange={setTMaint} />
      </div>
      <div className="text-[11px] mt-3 mb-1" style={{ color: T.textSecondary }}>
        Meta semanal (neta de lunes a domingo)
      </div>
      <div className="grid grid-cols-3 gap-2">
        {META.map(([k, label]) => (
          <Field key={k} label={label} value={meta[k]} onChange={(v) => setMeta((m) => ({ ...m, [k]: v }))} />
        ))}
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
        La gasolina no se ajusta aquí: RUTA resta lo que pagas en la gasolinera,
        repartido por las millas de cada día.
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
