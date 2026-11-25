import React, { useState } from "react";
import { Settings, Save, X, Wrench } from "lucide-react";
import { T } from "../../lib/theme.js";
import { validateNonNegative } from "../../lib/earnings.js";
import { retencionDeCheque } from "../../lib/config.js";

// Panel para ajustar el mantenimiento por milla y la meta semanal. La
// gasolina no se configura: se usa la pagada. El neto se recalcula solo.
export default function ConfigPanel({ config, onSave }) {
  const [open, setOpen] = useState(false);
  const [maint, setMaint] = useState(String(config.maintenance_cost_per_mile));
  const [tMaint, setTMaint] = useState(String(config.tucson_maintenance_cost_per_mile));
  const META = [
    ["meta_colchon", "Colchón $"],
    ["meta_deuda_semana", "Deuda semana $"],
    ["meta_extra", "Extra deuda $"],
    ["fondo_tope", "Tope fondo $"],
    ["fondo_inicial", "Fondo inicial $"],
    ["plan_meses", "Plan (meses)"],
  ];
  const FECHAS = [
    ["fondo_desde", "Fondo cuenta desde"],
    ["plan_inicio", "Plan empezó"],
  ];
  const metaDe = (c) => Object.fromEntries([...META, ...FECHAS].map(([k]) => [k, String(c[k] ?? "")]));
  const [meta, setMeta] = useState(() => metaDe(config));
  const invDe = (c) => (c.meta_inversiones || []).map((x) => ({ nombre: x.nombre, monto: String(x.monto) }));
  const [inv, setInv] = useState(() => invDe(config));
  const UPS = [
    ["ups_tarifa_hora", "UPS $/hora"],
    ["ups_tarifa_milla", "UPS $/milla"],
    ["ups_retencion_pct", "Impuestos %"],
  ];
  const upsDe = (c) => Object.fromEntries(UPS.map(([k]) => [k, String(c[k] ?? "")]));
  const [ups, setUps] = useState(() => upsDe(config));
  const [cheque, setCheque] = useState({ bruto: "", impuestos: "" });
  const [error, setError] = useState("");

  function start() {
    setMaint(String(config.maintenance_cost_per_mile));
    setTMaint(String(config.tucson_maintenance_cost_per_mile));
    setMeta(metaDe(config));
    setInv(invDe(config));
    setUps(upsDe(config));
    setCheque({ bruto: "", impuestos: "" });
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
    if (!(metaVals.plan_meses > 0)) return setError("El plan tiene que durar al menos 1 mes.");
    for (const [k, label] of FECHAS) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(meta[k])) return setError(`${label}: pon una fecha.`);
      metaVals[k] = meta[k];
    }
    const inversiones = [];
    for (const x of inv) {
      if (!String(x.nombre).trim()) continue;
      const v = validateNonNegative(x.monto, x.nombre);
      if (!v.ok) return setError(v.error);
      inversiones.push({ nombre: String(x.nombre).trim(), monto: v.value });
    }
    if (!inversiones.length) return setError("Pon al menos una inversión.");
    metaVals.meta_inversiones = inversiones;
    for (const [k, label] of UPS) {
      const v = validateNonNegative(ups[k], label.replace(/ [$%]$/, ""));
      if (!v.ok) return setError(v.error);
      metaVals[k] = v.value;
    }
    if (metaVals.ups_retencion_pct > 100) return setError("Los impuestos de UPS no pueden pasar de 100 %.");
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
          <Wrench size={15} /> Mantenimiento, meta y UPS
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
        <Field label="Mant $/mi (limpiezas)" value={maint} onChange={setMaint} />
      </div>
      <div className="text-[11px] mt-2 mb-1" style={{ color: T.textSecondary }}>
        Hyundai Tucson
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Mant $/mi (limpiezas)" value={tMaint} onChange={setTMaint} />
      </div>
      <div className="text-[11px] mt-3 mb-1" style={{ color: T.textSecondary }}>
        Meta semanal (neta de lunes a domingo)
      </div>
      <div className="grid grid-cols-3 gap-2">
        {META.map(([k, label]) => (
          <Field key={k} label={label} value={meta[k]} onChange={(v) => setMeta((m) => ({ ...m, [k]: v }))} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {FECHAS.map(([k, label]) => (
          <Field key={k} type="date" label={label} value={meta[k]} onChange={(v) => setMeta((m) => ({ ...m, [k]: v }))} />
        ))}
      </div>
      <div className="text-[11px] mt-3 mb-1" style={{ color: T.textSecondary }}>
        Reparto de la inversión (total {"$"}{inv.reduce((t, x) => t + (Number(x.monto) || 0), 0)})
      </div>
      <div className="grid grid-cols-3 gap-2">
        {inv.map((x, i) => (
          <div key={i} className="flex gap-1 items-end">
            <Field label={x.nombre || "Nueva"} value={x.monto} onChange={(v) => setInv((l) => l.map((y, j) => (j === i ? { ...y, monto: v } : y)))} />
            <button type="button" aria-label={`Quitar ${x.nombre}`} onClick={() => setInv((l) => l.filter((_, j) => j !== i))} className="pb-1.5 text-[15px]" style={{ color: T.textFaint }}>×</button>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          const nombre = e.currentTarget.elements.nueva.value.trim();
          if (nombre) setInv((l) => [...l, { nombre, monto: "0" }]);
          e.currentTarget.reset();
        }}
      >
        <input name="nueva" aria-label="Nueva inversión" placeholder="Añadir (p. ej. QQQ)" className="flex-1 rounded-lg px-2 py-1.5 text-[13px] outline-none" style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }} />
        <button type="submit" className="rounded-lg px-3 text-[13px]" style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}>+</button>
      </form>
      <div className="text-[11px] mt-3 mb-1" style={{ color: T.textSecondary }}>
        UPS (los turnos ya guardados no cambian)
      </div>
      <div className="grid grid-cols-3 gap-2">
        {UPS.map(([k, label]) => (
          <Field key={k} label={label} value={ups[k]} onChange={(v) => setUps((u) => ({ ...u, [k]: v }))} />
        ))}
      </div>
      <div className="text-[11px] mt-2 mb-1" style={{ color: T.textFaint }}>
        Con tu cheque de UPS: pon el pago de horas (sin millas) y los impuestos que te quitaron.
      </div>
      <div className="grid grid-cols-3 gap-2 items-end">
        <Field label="Bruto horas $" value={cheque.bruto} onChange={(v) => setCheque((c) => ({ ...c, bruto: v }))} />
        <Field label="Impuestos $" value={cheque.impuestos} onChange={(v) => setCheque((c) => ({ ...c, impuestos: v }))} />
        <button
          type="button"
          onClick={() => {
            const pct = retencionDeCheque(cheque.bruto, cheque.impuestos);
            if (pct == null) return setError("Revisa el cheque: los impuestos deben ser menores que el bruto.");
            setError("");
            setUps((u) => ({ ...u, ups_retencion_pct: String(pct) }));
          }}
          className="rounded-lg py-1.5 text-[12.5px]"
          style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
        >
          Usar su %
        </button>
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

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        inputMode={type === "date" ? undefined : "decimal"}
        className="gc-code w-full mt-1 rounded-lg px-2 py-1.5 text-[13.5px] outline-none"
        style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
      />
    </label>
  );
}
