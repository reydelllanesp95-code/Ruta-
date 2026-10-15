import React, { useState } from "react";
import { Save, X, Trash2 } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO } from "../../lib/earnings.js";
import { ACTIVE_PLATFORMS, platformLabel, validateShift, hoursBetween } from "../../lib/platforms.js";

const inputStyle = { backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}` };

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
        {label}
      </span>
      {children}
    </label>
  );
}

// Formulario de turno (Flex / Spark / Otro). Sirve para crear y para editar.
export default function ShiftForm({ initial, onSubmit, onCancel, onDelete, submitLabel = "Guardar turno" }) {
  const i = initial || {};
  const [plataforma, setPlataforma] = useState(i.plataforma || "flex");
  const [fecha, setFecha] = useState(i.fecha || todayISO());
  const [horaInicio, setHoraInicio] = useState(i.horaInicio || "");
  const [horaFin, setHoraFin] = useState(i.horaFin || "");
  const [millas, setMillas] = useState(i.millas != null ? String(i.millas) : "");
  const [pago, setPago] = useState(i.pagoBase != null ? String(i.pagoBase) : "");
  const [propina, setPropina] = useState(i.propina ? String(i.propina) : "");
  const [nota, setNota] = useState(i.nota || "");
  const [error, setError] = useState("");

  const horas = hoursBetween(horaInicio, horaFin);

  function submit() {
    const input = { plataforma, fecha, horaInicio, horaFin, millas, pago, propina, nota };
    const chk = validateShift(input);
    if (!chk.ok) return setError(chk.error);
    setError("");
    onSubmit(input);
  }

  const input = (value, set, props = {}) => (
    <input
      value={value}
      onChange={(e) => set(e.target.value)}
      className="gc-code w-full mt-1 rounded-lg px-3 py-2 text-[14px] outline-none"
      style={inputStyle}
      {...props}
    />
  );

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5">
        {ACTIVE_PLATFORMS.map((p) => {
          const active = p === plataforma;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPlataforma(p)}
              className="rounded-lg py-2 text-[12.5px] font-medium"
              style={{
                backgroundColor: active ? T.red : T.surfaceRaised,
                color: active ? "#fff" : T.textSecondary,
                border: `1px solid ${active ? T.red : T.border}`,
              }}
            >
              {platformLabel(p)}
            </button>
          );
        })}
      </div>

      <Field label="Fecha">{input(fecha, setFecha, { type: "date" })}</Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Inicio">{input(horaInicio, setHoraInicio, { type: "time" })}</Field>
        <Field label="Fin">{input(horaFin, setHoraFin, { type: "time" })}</Field>
      </div>
      <div className="text-[11.5px] -mt-1" style={{ color: T.textFaint }}>
        {horas != null ? `${horas} h de trabajo` : "Sin horas no se puede calcular tu $/hora"}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Pago $">{input(pago, setPago, { inputMode: "decimal", placeholder: "0" })}</Field>
        <Field label="Propina $">{input(propina, setPropina, { inputMode: "decimal", placeholder: "0" })}</Field>
        <Field label="Millas">{input(millas, setMillas, { inputMode: "decimal", placeholder: "0" })}</Field>
      </div>

      <Field label="Nota (opcional)">{input(nota, setNota, { placeholder: "Ej. bloque Whole Foods" })}</Field>

      {error && (
        <div className="text-[12px]" style={{ color: T.red }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium"
          style={{ backgroundColor: T.red, color: "#fff" }}
        >
          <Save size={14} /> {submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center rounded-lg py-2 px-3 text-[13px]"
            style={{ backgroundColor: T.surfaceRaised, color: T.textSecondary, border: `1px solid ${T.border}` }}
            aria-label="Cancelar"
          >
            <X size={14} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center rounded-lg py-2 px-3"
            style={{ backgroundColor: T.redDim, color: T.red, border: `1px solid ${T.red}` }}
            aria-label="Eliminar turno"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
