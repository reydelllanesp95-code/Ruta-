import React, { useState } from "react";
import { T } from "../../lib/theme.js";
import { editarHorasJornada } from "../../lib/jornada.js";

const input = { backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}`, minHeight: 44 };

function Campo({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1 text-[11.5px]" style={{ color: T.textFaint }}>
      {label}
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="gc-code rounded-lg px-2 text-[15px] outline-none" style={input} />
      {children}
    </label>
  );
}

// Corregir Salí / Paré / Llegué de una jornada (por si se olvidó tocar algo).
export default function JornadaHoras({ jornada, onSave, onClose }) {
  const [salida, setSalida] = useState(jornada.horaSalida || "");
  const [parada, setParada] = useState(jornada.horaParada || "");
  const [llegada, setLlegada] = useState(jornada.horaLlegada || "");
  const [error, setError] = useState("");
  const cerrada = jornada.odoLlegada != null;

  function guardar() {
    const r = editarHorasJornada(jornada, { horaSalida: salida, horaParada: parada, horaLlegada: llegada });
    if (!r.ok) return setError(r.error);
    onSave(r.jornada);
    onClose();
  }


  return (
    <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: T.surfaceRaised }}>
      <div className={`grid gap-2 ${cerrada ? "grid-cols-3" : "grid-cols-2"}`}>
        <Campo label="Salí" value={salida} onChange={setSalida} />
        <Campo label="Paré" value={parada} onChange={setParada}>
          {parada && (
            <button type="button" onClick={() => setParada("")} className="text-left text-[11.5px]" style={{ color: T.textSecondary }}>
              Quitar
            </button>
          )}
        </Campo>
        {cerrada && <Campo label="Llegué" value={llegada} onChange={setLlegada} />}
      </div>
      {error && <div className="text-[13px]" style={{ color: T.red }}>{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="rounded-lg py-2.5 text-[14px]" style={{ ...input, backgroundColor: T.surface }}>
          Cancelar
        </button>
        <button type="button" onClick={guardar} className="rounded-lg py-2.5 text-[14px] font-medium" style={{ backgroundColor: T.red, color: "#fff", minHeight: 44 }}>
          Guardar horas
        </button>
      </div>
    </div>
  );
}
