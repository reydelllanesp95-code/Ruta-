import React, { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, fechaCorta } from "../../lib/earnings.js";
import { readCapture, applyCapture } from "../../lib/captura.js";
import { platformLabel } from "../../lib/platforms.js";

// Pegar el texto copiado de una captura de Flex o Lyft, revisar y aplicar.
export default function PasteCapture({ routes, vehiculo, onApply, onCancel }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(null);
  const [plataforma, setPlataforma] = useState(null);

  async function pegar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setTexto((prev) => (prev ? prev + "\n" + t : t));
    } catch {
      setError("No pude leer el portapapeles: mantén pulsado el recuadro y elige «Pegar».");
    }
  }

  function leer() {
    const r = readCapture(texto, routes);
    if (!r.ok) {
      setPlan(null);
      return setError(r.error);
    }
    setError("");
    setPlataforma(r.plataforma);
    setPlan(r.plan);
  }

  const box = { backgroundColor: T.surfaceRaised, border: `1px solid ${T.border}`, color: T.textPrimary };
  const btn = "rounded-lg py-2.5 text-[14px] font-medium";

  return (
    <div className="rounded-xl p-3 space-y-2.5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
      <div className="gc-eyebrow text-[11px] uppercase" style={{ color: T.textFaint }}>Pegar captura (Flex o Lyft)</div>
      <div className="text-[12.5px]" style={{ color: T.textSecondary }}>
        En Fotos abre la captura (Ganancias de Flex o Actividad diaria de Lyft), toca el icono de texto y «Copiar todo». Puedes pegar varias capturas seguidas, pero de una sola app.
      </div>
      <textarea
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setPlan(null); }}
        rows={5}
        placeholder="Pega aquí el texto"
        className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
        style={box}
      />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={pegar} className={btn + " flex items-center justify-center gap-1.5"} style={box}>
          <ClipboardPaste size={15} /> Pegar
        </button>
        <button type="button" onClick={leer} disabled={!texto.trim()} className={btn} style={{ backgroundColor: T.red, color: "#fff", opacity: texto.trim() ? 1 : 0.5 }}>
          Leer
        </button>
      </div>
      {error && <div className="text-[13px]" style={{ color: T.red }}>{error}</div>}

      {plan && (
        <div className="space-y-2">
          <div className="text-[13.5px]" style={{ color: T.textPrimary }}>
            {platformLabel(plataforma)} · total leído: <b>{formatMoney(plan.total)}</b> — compáralo con el de la app.
          </div>
          {plan.sinCambios > 0 && (
            <div className="text-[12.5px]" style={{ color: T.ok }}>{plan.sinCambios} ya estaba(n) bien.</div>
          )}
          {plan.cambios.length === 0 ? (
            <div className="text-[13px]" style={{ color: T.textSecondary }}>No hay nada que cambiar.</div>
          ) : (
            <div className="space-y-1.5">
              {plan.cambios.map((c, i) => (
                <Cambio key={i} c={c} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onCancel} className={btn} style={box}>Cancelar</button>
            <button
              type="button"
              disabled={!plan.cambios.length}
              onClick={() => onApply(applyCapture(plataforma, routes, plan, { vehiculo }), plan.cambios.length)}
              className={btn}
              style={{ backgroundColor: T.red, color: "#fff", opacity: plan.cambios.length ? 1 : 0.5 }}
            >
              Aplicar {plan.cambios.length} cambio(s)
            </button>
          </div>
        </div>
      )}
      {!plan && (
        <button type="button" onClick={onCancel} className={"w-full " + btn} style={box}>Cancelar</button>
      )}
    </div>
  );
}

function Cambio({ c }) {
  const fila = "rounded-lg px-3 py-2 text-[12.5px]";
  const st = { backgroundColor: T.surfaceRaised, color: T.textSecondary };
  const dia = <b style={{ color: T.textPrimary }}>{fechaCorta(c.fecha)}</b>;
  if (c.tipo === "nuevo" || c.tipo === "ajuste") {
    return (
      <div className={fila} style={st}>
        {dia} · {c.horario} — <span style={{ color: T.ok }}>nuevo</span>: {formatMoney(c.pago)}
        {c.propina ? ` + ${formatMoney(c.propina)} propina` : ""}
        {c.tipo === "nuevo" && <div>No estaba apuntado; queda sin millas.</div>}
        {c.horas != null && c.plataforma === "lyft" && <div>Horas: {c.horas}</div>}
      </div>
    );
  }
  return (
    <div className={fila} style={st}>
      {c.bloques.map((b) => (
        <div key={b.idx}>
          {dia} · {b.horario}:{" "}
          {b.antes.pago !== b.despues.pago && (
            <span style={{ color: b.despues.pago < b.antes.pago ? T.red : T.textPrimary }}>
              base {formatMoney(b.antes.pago)} → {formatMoney(b.despues.pago)}{" "}
            </span>
          )}
          {b.antes.propina !== b.despues.propina && (
            <span style={{ color: T.textPrimary }}>propina {formatMoney(b.antes.propina)} → {formatMoney(b.despues.propina)}</span>
          )}
          {b.despues.pago < b.antes.pago && (
            <div style={{ color: T.red }}>Baja la base: si había dinero de otra app aquí, apúntalo aparte.</div>
          )}
        </div>
      ))}
    </div>
  );
}
