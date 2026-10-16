import React, { useEffect, useState } from "react";
import { Save, X, Trash2 } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO } from "../../lib/earnings.js";
import { SHIFT_PLATFORMS, platformLabel, validateShift, hoursBetween } from "../../lib/platforms.js";
import VehiclePicker from "./VehiclePicker.jsx";
import OdometerWheel from "./OdometerWheel.jsx";
import { nextStage, summarizeBlocks } from "../../lib/guidedShift.js";
import { loadDraft, saveDraft, clearDraft, nowHHMM, draftHasData } from "../../lib/shiftDraft.js";

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
  lastOdoByVehicle = {},
  locales = [],
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = "Guardar turno",
}) {
  const [i] = useState(() => {
    const draft = persistDraft ? loadDraft() : null;
    return initial || (draftHasData(draft) ? draft : {});
  });
  const [vehiculo, setVehiculo] = useState(i.vehiculo || defaultVehicle);
  // Turno nuevo: el inicio arranca donde se quedó ese carro la última vez.
  const lastOdo = (v) => (lastOdoByVehicle[v] != null ? String(lastOdoByVehicle[v]) : "");
  const [odoInicio, setOdoInicio] = useState(() =>
    i.odoInicio != null && i.odoInicio !== ""
      ? String(i.odoInicio)
      : persistDraft && !initial
        ? lastOdo(i.vehiculo || defaultVehicle)
        : ""
  );
  const [odoFin, setOdoFin] = useState(i.odoFin != null ? String(i.odoFin) : "");
  const [plataforma, setPlataforma] = useState(i.plataforma || "flex");
  const [fecha, setFecha] = useState(i.fecha || todayISO());
  const [horaInicio, setHoraInicio] = useState((initial && i.bloques?.at(-1)?.horaInicio) || i.horaInicio || "");
  const [horaFin, setHoraFin] = useState((initial && i.bloques?.at(-1)?.horaFin) || i.horaFin || "");
  const [salidaCasa, setSalidaCasa] = useState(i.salidaCasa || "");
  const [llegadaCasa, setLlegadaCasa] = useState(i.llegadaCasa || "");
  const [millas, setMillas] = useState(i.millas != null ? String(i.millas) : "");
  const [pago, setPago] = useState(initial && i.bloques ? String(i.bloques.at(-1).pago) : i.pagoBase != null ? String(i.pagoBase) : i.pago != null ? String(i.pago) : "");
  const [propina, setPropina] = useState(initial && i.bloques ? String(i.bloques.at(-1).propina) : i.propina != null ? String(i.propina) : "");
  const [nota, setNota] = useState(i.nota || "");
  const [local, setLocal] = useState(i.local || "");
  const [error, setError] = useState("");
  const [bloques, setBloques] = useState(() => initial && i.bloques ? i.bloques.slice(0, -1) : i.bloques || []);
  const [editado, setEditado] = useState(() => Boolean(initial || i.editado || (i.editado == null && draftHasData(i))));
  const [editTimes, setEditTimes] = useState(Boolean(initial));
  const multi = bloques.length > 0;
  const currentBlock = () => ({ horaInicio, horaFin, pago, propina });
  const allBlocks = () => [...bloques, currentBlock()];
  const stage = nextStage({ salidaCasa, horaInicio, horaFin, llegadaCasa });
  const locked = multi || Boolean(initial?.bloques) || Boolean(salidaCasa && !initial);

  function advance() {
    if (!stage) return;
    ({ salidaCasa: setSalidaCasa, horaInicio: setHoraInicio, horaFin: setHoraFin, llegadaCasa: setLlegadaCasa })[stage.field](nowHHMM());
    setEditado(true);
  }
  function cancelNewBlock() {
    if ((horaInicio || horaFin || pago || propina) && !confirm("¿Descartar el bloque actual y volver al anterior?")) return;
    const previous = bloques.at(-1);
    setBloques(bloques.slice(0, -1));
    setHoraInicio(previous.horaInicio); setHoraFin(previous.horaFin);
    setPago(String(previous.pago)); setPropina(String(previous.propina || ""));
    setError(""); setEditado(true);
  }
  function addBlock() {
    const chk = summarizeBlocks(allBlocks(), salidaCasa);
    if (!chk.ok) { setError(chk.error); return; }
    setBloques(allBlocks());
    setHoraInicio(""); setHoraFin(""); setPago(""); setPropina("");
    setEditado(true); setError("");
  }

  useEffect(() => {
    if (!persistDraft) return;
    saveDraft({
      plataforma, vehiculo, fecha, salidaCasa, horaInicio, horaFin, llegadaCasa,
      odoInicio, odoFin, millas, pago, propina, nota, local, bloques, editado,
    });
  }, [persistDraft, plataforma, vehiculo, fecha, salidaCasa, horaInicio, horaFin, llegadaCasa,
    odoInicio, odoFin, millas, pago, propina, nota, local, bloques, editado]);

  function discard() {
    if (!confirm("¿Borrar lo que llevas apuntado de este turno?")) return;
    clearDraft();
    onCancel && onCancel();
  }

  // Corrección manual; el registro rápido vive en una sola acción principal.
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
        {esLimpieza && <button type="button" onClick={() => { set(nowHHMM()); setEditado(true); }} className="rounded-lg px-2 text-[12px]" style={inputStyle}>Ahora</button>}
      </div>
    </Field>
  );

  const blockHours = [...bloques, currentBlock()].map((b) => hoursBetween(b.horaInicio, b.horaFin));
  const horas = blockHours.some((h) => h != null) ? Math.round(blockHours.reduce((sum, h) => sum + (h || 0), 0) * 100) / 100 : null;
  const horasReales = hoursBetween(salidaCasa, llegadaCasa);
  const oi = Number(odoInicio);
  const of = Number(odoFin);
  const odoMillas =
    odoInicio !== "" && odoFin !== "" && Number.isFinite(oi) && Number.isFinite(of) && of > oi
      ? Math.round((of - oi) * 10) / 10
      : null;

  const esLimpieza = plataforma === "limpieza";

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
      local,
      ...(multi || initial?.bloques || (!initial && !esLimpieza && (horaInicio || horaFin)) ? { bloques: allBlocks() } : {}),
    };
    // Limpieza: sin bloque ni pago (aunque se hubieran escrito antes de cambiar).
    if (esLimpieza) Object.assign(input, { horaInicio: "", horaFin: "", pago: "", propina: "" });
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
    <div className="space-y-2.5" onChangeCapture={() => setEditado(true)}>
      <div className="grid grid-cols-4 gap-1.5">
        {SHIFT_PLATFORMS.map((p) => {
          const active = p === plataforma;
          return (
            <button
              key={p}
              type="button"
              disabled={locked && p !== plataforma}
              onClick={() => { setPlataforma(p); setEditado(true); }}
              className="rounded-lg py-2 text-[12.5px] font-medium"
              style={{
                opacity: locked && !active ? 0.45 : 1,
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

      <VehiclePicker
        value={vehiculo}
        onChange={(v) => {
          if (locked) return;
          setEditado(true);
          // Si el inicio sigue siendo el que puso la app, sigue al carro elegido.
          if (persistDraft && (odoInicio === "" || odoInicio === lastOdo(vehiculo))) setOdoInicio(lastOdo(v));
          setVehiculo(v);
        }}
      />

      {locked && <p className="text-[11px]" style={{ color: T.textFaint }}>Jornada de {platformLabel(plataforma)} · mismo carro hasta llegar a casa.</p>}
      <Field label="Fecha">{input(fecha, setFecha, { type: "date" })}</Field>

      {esLimpieza && (
        <Field label="Local">
          {locales.length > 0 ? (
            <select
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="w-full mt-1 rounded-lg px-3 py-2 text-[14px] outline-none"
              style={inputStyle}
            >
              <option value="">Elige el local…</option>
              {locales.map((l) => (
                <option key={l.id || l.nombre} value={l.nombre}>
                  {l.nombre}
                </option>
              ))}
            </select>
          ) : (
            input(local, setLocal, { placeholder: "Añade tus locales en Limpiezas" })
          )}
        </Field>
      )}

      {!initial && !esLimpieza && <OdometerWheel label="Odómetro al salir" value={odoInicio} onChange={(v) => { setOdoInicio(v); setEditado(true); }} />}
      {!initial && !esLimpieza && stage && (
        <div>
          <button type="button" onClick={advance} className="w-full rounded-xl py-4 text-[20px] font-semibold" style={{ backgroundColor: T.red, color: "#fff" }}>{stage.label}</button>
          <p className="text-center text-[11px] mt-1" style={{ color: T.textFaint }}>Guarda la hora actual</p>
          {horaFin && !llegadaCasa && <button type="button" onClick={addBlock} className="w-full rounded-lg py-3 mt-2 text-[14px]" style={inputStyle}>Añadir otro bloque</button>}
        </div>
      )}
      {multi && <div className="space-y-2">
        {bloques.map((b, index) => <div key={index} className="rounded-lg p-2" style={{ border: `1px solid ${T.border}` }}>
          <div className="text-[12px] mb-1" style={{ color: T.textSecondary }}>Bloque {index + 1}</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries({ horaInicio: "Inicio", horaFin: "Fin", pago: "Pago $", propina: "Propina $" }).map(([key, label]) => <Field key={key} label={label}>{input(b[key], (v) => setBloques(bloques.map((x, j) => j === index ? { ...x, [key]: v } : x)), key.startsWith("hora") ? { type: "time" } : { inputMode: "decimal" })}</Field>)}
          </div>
        </div>)}
        <div className="flex justify-between gap-2 text-[12px]" style={{ color: T.textSecondary }}><span>Bloque {bloques.length + 1} · actual</span>{!initial && !llegadaCasa && <button type="button" onClick={cancelNewBlock}>Volver al bloque anterior</button>}</div>
      </div>}
      {!initial && !esLimpieza && <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: T.surfaceRaised }}>
        <div className="flex justify-between text-[12px]" style={{ color: T.textSecondary }}><span>Horas registradas</span><button type="button" onClick={() => setEditTimes(!editTimes)}> {editTimes ? "Listo" : "Corregir horas"}</button></div>
        {[["Salí de casa", salidaCasa], ["Inicio del bloque", horaInicio], ["Fin del bloque", horaFin], ["Llegué a casa", llegadaCasa]].map(([label, value]) => <div key={label} className="flex justify-between text-[13px]" style={{ color: value ? T.textPrimary : T.textFaint }}><span>{label}</span><span>{value || "Pendiente"}</span></div>)}
      </div>}
      {(initial || esLimpieza || editTimes) && <div className="grid grid-cols-2 gap-2">
        {timeField("Salí de casa", salidaCasa, setSalidaCasa)}
        {!esLimpieza && timeField("Inicio bloque", horaInicio, setHoraInicio)}
        {!esLimpieza && timeField("Fin bloque", horaFin, setHoraFin)}
        {timeField("Llegué a casa", llegadaCasa, setLlegadaCasa)}
      </div>}
      <div className="text-[11.5px] -mt-1" style={{ color: T.textFaint }}>
        {horasReales != null
          ? `${horasReales} h reales (puerta a puerta)${!esLimpieza && horas != null ? ` · ${horas} h de bloque` : ""}`
          : !esLimpieza && horas != null
            ? `${horas} h de bloque · pon salida y llegada para tu $/hora real`
            : "Sin horas no se puede calcular tu $/hora"}
      </div>

      {!esLimpieza && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pago $">{input(pago, setPago, { inputMode: "decimal", placeholder: "0" })}</Field>
          <Field label="Propina $">{input(propina, setPropina, { inputMode: "decimal", placeholder: "0" })}</Field>
        </div>
      )}

      {(initial || esLimpieza) && <OdometerWheel label="Odómetro al salir" value={odoInicio} onChange={(v) => { setOdoInicio(v); setEditado(true); }} />}
      <OdometerWheel label="Odómetro al llegar" value={odoFin} onChange={(v) => { setOdoFin(v); setEditado(true); }} base={odoInicio} />
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
