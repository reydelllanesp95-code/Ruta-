import React, { useMemo, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { T } from "../../lib/theme.js";
import { editarHorasJornada, horasJornada, pausasParaEditar } from "../../lib/jornada.js";

const input = { backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}`, minHeight: 44 };

// El campo de hora va solo dentro de su <label>: cualquier botón dentro de un
// label reabre el selector de hora en el iPhone.
function Hora({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-[11.5px] min-w-0 flex-1" style={{ color: T.textFaint }}>
      {label}
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="gc-code rounded-lg px-2 text-[15px] outline-none w-full" style={input} />
    </label>
  );
}

function BotonBorrar({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="shrink-0 rounded-lg flex items-center justify-center self-end" style={{ width: 44, height: 44, backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.textSecondary }}>
      <Trash2 size={17} />
    </button>
  );
}

// Corregir la jornada: Salí, Llegué y las pausas (ratos sin trabajar). Una
// parada antes de llegar a casa es una pausa que termina al llegar.
export default function JornadaHoras({ jornada, onSave, onClose }) {
  const cerrada = jornada.odoLlegada != null;
  const [salida, setSalida] = useState(jornada.horaSalida || "");
  const [llegada, setLlegada] = useState(jornada.horaLlegada || "");
  // Abierta y en pausa ahora mismo: se puede quitar, no se edita como pausa.
  const [enPausa, setEnPausa] = useState(!cerrada ? jornada.horaParada || "" : "");
  const [pausas, setPausas] = useState(() => pausasParaEditar(jornada));
  const [error, setError] = useState("");
  const cambia = (i, k, v) => setPausas((l) => l.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  const valores = { horaSalida: salida, horaParada: enPausa, horaLlegada: llegada, pausas };
  const prueba = useMemo(() => editarHorasJornada(jornada, valores), [jornada, salida, enPausa, llegada, pausas]); // eslint-disable-line react-hooks/exhaustive-deps
  const horas = prueba.ok ? horasJornada(prueba.jornada) : null;

  function guardar() {
    if (!prueba.ok) return setError(prueba.error);
    onSave(prueba.jornada);
    onClose();
  }

  return (
    <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: T.surfaceRaised }}>
      <div className="flex gap-2">
        <Hora label="Salí" value={salida} onChange={setSalida} />
        {cerrada && <Hora label="Llegué a casa" value={llegada} onChange={setLlegada} />}
      </div>

      {enPausa && (
        <div className="flex items-center justify-between gap-2 text-[13.5px]">
          <span>En pausa desde las {enPausa}</span>
          <button type="button" onClick={() => setEnPausa("")} className="rounded-lg px-3 text-[13px]" style={{ ...input, backgroundColor: T.surface }}>
            Quitar pausa
          </button>
        </div>
      )}

      <div>
        <div className="text-[12.5px] mb-1.5" style={{ color: T.textSecondary }}>
          Pausas (ratos que no trabajaste: comer, ir a casa…)
        </div>
        {pausas.length === 0 && <div className="text-[12.5px] mb-1" style={{ color: T.textFaint }}>Sin pausas.</div>}
        <div className="space-y-2">
          {pausas.map((p, i) => (
            <div key={i} className="flex gap-2 items-end">
              <Hora label="Paré" value={p.desde} onChange={(v) => cambia(i, "desde", v)} />
              <Hora label={cerrada && p.hasta && p.hasta === llegada ? "Hasta llegar" : "Volví"} value={p.hasta} onChange={(v) => cambia(i, "hasta", v)} />
              <BotonBorrar label={`Borrar pausa ${i + 1}`} onClick={() => setPausas((l) => l.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setPausas((l) => [...l, { desde: "", hasta: "" }])} className="mt-2 w-full rounded-lg flex items-center justify-center gap-1.5 text-[13.5px]" style={{ ...input, backgroundColor: T.surface }}>
          <Plus size={15} /> Añadir pausa
        </button>
        {cerrada && (
          <div className="text-[11.5px] mt-1.5" style={{ color: T.textFaint }}>
            ¿Dejaste de trabajar antes de llegar? Añade una pausa que termine a la hora de llegada.
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between text-[14px] pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
        <span style={{ color: T.textSecondary }}>Horas de trabajo</span>
        <span className="gc-code font-semibold" style={{ color: horas != null ? T.textPrimary : T.textFaint }}>
          {horas != null ? `${horas} h` : prueba.ok ? "—" : "revisa las horas"}
        </span>
      </div>
      {(error || (!prueba.ok && pausas.every((p) => p.desde && p.hasta))) && (
        <div className="text-[13px]" style={{ color: T.red }}>{error || prueba.error}</div>
      )}

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
