import React, { useEffect, useState } from "react";
import { Save, X, Trash2 } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO } from "../../lib/earnings.js";
import { ACTIVE_PLATFORMS, platformLabel, validateShift, hoursBetween } from "../../lib/platforms.js";
import VehiclePicker from "./VehiclePicker.jsx";
import { loadDraft, saveDraft, clearDraft, nowHHMM } from "../../lib/shiftDraft.js";

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
// `defaultVehicle`: el último vehículo usado, para no tener que elegirlo cada vez.
// `persistDraft`: (solo turno NUEVO) guarda cada cambio en el teléfono y lo
// recupera al reabrir, porque el iPhone cierra la app minimizada.
export default function ShiftForm({
  initial,
  defaultVehicle = "kia",
  persistDraft = false,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = "Guardar turno",
}) {
  const [i] = useState(() => initial || (persistDraft && loadDraft()) || {});
  const [vehiculo, setVehiculo] = useState(i.vehiculo || defaultVehicle);
  const [odoInicio, setOdoInicio] = useState(i.odoInicio != null ? String(i.odoInicio) : "");
  const [odoFin, setOdoFin] = useState(i.odoFin != null ? String(i.odoFin) : "");
  const [plataforma, setPlataforma] = useState(i.plataforma || "flex");
  const [fecha, setFecha] = useState(i.fecha || todayISO());
  const [horaInicio, setHoraInicio] = useState(i.horaInicio || "");
  const [horaFin, setHoraFin] = useState(i.horaFin || "");
  const [salidaCasa, setSalidaCasa] = useState(i.salidaCasa || "");
  const [llegadaCasa, setLlegadaCasa] = useState(i.llegadaCasa || "");
  const [millas, setMillas] = useState(i.millas != null ? String(i.millas) : "");
  const [pago, setPago] = useState(i.pagoBase != null ? String(i.pagoBase) : "");
  const [propina, setPropina] = useState(i.propina ? String(i.propina) : "");
  const [nota, setNota] = useState(i.nota || "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!persistDraft) return;
    saveDraft({
      plataforma, vehiculo, fecha, salidaCasa, horaInicio, horaFin, llegadaCasa,
      odoInicio, odoFin, millas, pago, propina, nota,
    });
  }, [persistDraft, plataforma, vehiculo, fecha, salidaCasa, horaInicio, horaFin, llegadaCasa,
    odoInicio, odoFin, millas, pago, propina, nota]);

  function discard() {
    if (!confirm("¿Borrar lo que llevas apuntado de este turno?")) return;
    clearDraft();
    onCancel && onCancel();
  }

  // Campo de hora con botón "Ahora" (pone la hora actual de un toque).
  const timeField = (label, value, set) => (
    <Field label={label}>
      <div className="flex gap-1.5 mt-1">
        <input
          type="time"
          value={value}
          onChange={(e) => set(e.target.value)}
          className="gc-code flex-1 min-w-0 rounded-lg px-2 py-2 text-[14px] outline-none"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => set(nowHHMM())}
          className="rounded-lg px-2 text-[11.5px] shrink-0"
          style={{ backgroundColor: T.surface, color: T.textSecondary, border: `1px solid ${T.border}` }}
        >
          Ahora
        </button>
      </div>
    </Field>
  );

  const horas = hoursBetween(horaInicio, horaFin);
  const horasReales = hoursBetween(salidaCasa, llegadaCasa);
  const oi = Number(odoInicio);
  const of = Number(odoFin);
  const odoMillas =
    odoInicio !== "" && odoFin !== "" && Number.isFinite(oi) && Number.isFinite(of) && of > oi
      ? Math.round((of - oi) * 10) / 10
      : null;

  function submit() {
    const input = {
      plataforma,
      fecha,
      salidaCasa,
      horaInicio,
      horaFin,
      llegadaCasa,
      millas,
      pago,
      propina,
      nota,
      vehiculo,
      odoInicio,
      odoFin,
    };
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

      <VehiclePicker value={vehiculo} onChange={setVehiculo} />

      <Field label="Fecha">{input(fecha, setFecha, { type: "date" })}</Field>

      <div className="grid grid-cols-2 gap-2">
        {timeField("Salí de casa", salidaCasa, setSalidaCasa)}
        {timeField("Inicio bloque", horaInicio, setHoraInicio)}
        {timeField("Fin bloque", horaFin, setHoraFin)}
        {timeField("Llegué a casa", llegadaCasa, setLlegadaCasa)}
      </div>
      <div className="text-[11.5px] -mt-1" style={{ color: T.textFaint }}>
        {horasReales != null
          ? `${horasReales} h reales (puerta a puerta)${horas != null ? ` · ${horas} h de bloque` : ""}`
          : horas != null
            ? `${horas} h de bloque · pon salida y llegada para tu $/hora real`
            : "Sin horas no se puede calcular tu $/hora"}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Pago $">{input(pago, setPago, { inputMode: "decimal", placeholder: "0" })}</Field>
        <Field label="Propina $">{input(propina, setPropina, { inputMode: "decimal", placeholder: "0" })}</Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Odómetro inicio">{input(odoInicio, setOdoInicio, { inputMode: "decimal", placeholder: "opcional" })}</Field>
        <Field label="Odómetro fin">{input(odoFin, setOdoFin, { inputMode: "decimal", placeholder: "opcional" })}</Field>
      </div>
      {odoMillas != null ? (
        <div className="text-[11.5px] -mt-1" style={{ color: T.textFaint }}>
          {odoMillas} millas (del odómetro)
        </div>
      ) : (
        <Field label="Millas (si no usas odómetro)">
          {input(millas, setMillas, { inputMode: "decimal", placeholder: "0" })}
        </Field>
      )}

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
      {persistDraft && (
        <div className="flex items-center justify-between text-[11.5px]" style={{ color: T.textFaint }}>
          <span>Se guarda solo mientras escribes.</span>
          <button type="button" onClick={discard} style={{ color: T.red }}>
            Descartar borrador
          </button>
        </div>
      )}
    </div>
  );
}
