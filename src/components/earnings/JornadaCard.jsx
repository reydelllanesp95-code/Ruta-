import React, { useState } from "react";
import { Home, LogOut, PauseCircle } from "lucide-react";
import { T } from "../../lib/theme.js";
import { todayISO } from "../../lib/earnings.js";
import { vehicleLabel } from "../../lib/vehicles.js";
import { startJornada, closeJornada, openJornada, jornadaMiles, pararTrabajo, seguirTrabajando } from "../../lib/jornada.js";
import OdometerWheel from "./OdometerWheel.jsx";
import VehiclePicker from "./VehiclePicker.jsx";
import JornadaHoras from "./JornadaHoras.jsx";

function ahora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Odómetro al salir y al llegar a casa: lo único que se apunta en el día.
export default function JornadaCard({ jornadas, lastOdoFor, defaultVehicle, onSave }) {
  const abierta = openJornada(jornadas);
  const [editando, setEditando] = useState(false);
  const [horas, setHoras] = useState(false);
  const [vehiculo, setVehiculo] = useState(defaultVehicle || "kia");
  const [odo, setOdo] = useState("");
  const [error, setError] = useState("");
  const hoy = todayISO();
  const cerradasHoy = jornadas.filter((j) => j.fecha === hoy && j.odoLlegada != null);
  const millasHoy = cerradasHoy.reduce((s, j) => s + jornadaMiles(j), 0);

  const base = abierta ? abierta.odoSalida : lastOdoFor(vehiculo) ?? "";
  const btn = "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-medium";

  function abrir() {
    setOdo("");
    setError("");
    setEditando(true);
  }

  function guardar() {
    const valor = odo === "" ? base : odo;
    const r = abierta
      ? closeJornada(abierta, { hora: ahora(), odo: valor })
      : startJornada({ fecha: hoy, hora: ahora(), vehiculo, odo: valor });
    if (!r.ok) return setError(r.error);
    onSave(abierta ? jornadas.map((j) => (j.id === abierta.id ? r.jornada : j)) : [...jornadas, r.jornada]);
    setEditando(false);
  }

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between text-[12.5px]" style={{ color: T.textSecondary }}>
        <span>
          {abierta
            ? `Saliste a las ${abierta.horaSalida} · ${vehicleLabel(abierta.vehiculo)} · ${abierta.odoSalida}${abierta.horaParada ? ` · paraste a las ${abierta.horaParada}` : ""}`
            : millasHoy > 0
              ? `Hoy: ${millasHoy} millas`
              : "Hoy no has salido"}
        </span>
        {abierta && !editando && !horas && (
          <button type="button" onClick={() => setHoras(true)} className="text-[12.5px] underline shrink-0 ml-2" style={{ color: T.textSecondary, minHeight: 32 }}>
            Editar horas
          </button>
        )}
      </div>
      {horas && abierta ? (
        <JornadaHoras
          jornada={abierta}
          onSave={(nueva) => onSave(jornadas.map((j) => (j.id === nueva.id ? nueva : j)))}
          onClose={() => setHoras(false)}
        />
      ) : editando ? (
        <>
          {!abierta && <VehiclePicker value={vehiculo} onChange={setVehiculo} />}
          <OdometerWheel label={abierta ? "Odómetro al llegar" : "Odómetro al salir"} value={odo} base={base} onChange={setOdo} />
          {error && <div className="text-[13px]" style={{ color: T.red }}>{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEditando(false)} className="rounded-lg py-2.5 text-[14px]" style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}` }}>
              Cancelar
            </button>
            <button type="button" onClick={guardar} className="rounded-lg py-2.5 text-[14px] font-medium" style={{ backgroundColor: T.red, color: "#fff" }}>
              Guardar {abierta ? "llegada" : "salida"}
            </button>
          </div>
        </>
      ) : (
        <>
        {abierta && (
          abierta.horaParada ? (
            <button type="button" onClick={() => onSave(jornadas.map((j) => (j.id === abierta.id ? seguirTrabajando(j) : j)))} className="w-full text-[13.5px] py-2" style={{ color: T.textSecondary, minHeight: 44 }}>
              Volví a trabajar
            </button>
          ) : (
            <button type="button" onClick={() => onSave(jornadas.map((j) => (j.id === abierta.id ? pararTrabajo(j, ahora()) : j)))} className={btn} style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}` }}>
              <PauseCircle size={17} /> Paré de trabajar
            </button>
          )
        )}
        <button type="button" onClick={abrir} className={btn} style={{ backgroundColor: abierta ? T.red : T.surfaceRaised, color: abierta ? "#fff" : T.textPrimary, border: `1px solid ${abierta ? T.red : T.border}` }}>
          {abierta ? <Home size={17} /> : <LogOut size={17} />} {abierta ? "Llegué a casa" : "Salgo a trabajar"}
        </button>
        </>
      )}
    </div>
  );
}
