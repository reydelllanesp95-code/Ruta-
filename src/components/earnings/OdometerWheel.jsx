import React, { useState } from "react";
import { ChevronUp, ChevronDown, Keyboard } from "lucide-react";
import { T } from "../../lib/theme.js";
import { stepOdometer } from "../../lib/odometer.js";

// Odómetro tipo rueda: cada dígito sube/baja con ▲/▼ (con acarreo), así solo
// se tocan los últimos números. `base` es el valor de partida cuando `value`
// está vacío (p. ej. el fin arranca desde el inicio); se ve en gris.
export default function OdometerWheel({ label, value, onChange, base = "" }) {
  const [typing, setTyping] = useState(false);
  const has = value !== "" && value != null;
  const shown = has ? String(Math.trunc(Number(value) || 0)) : base !== "" && base != null ? String(Math.trunc(Number(base) || 0)) : "";
  const digits = shown.padStart(6, "0").split("");
  const n = digits.length;

  const step = (k, dir) => onChange(String(stepOdometer(shown || 0, k, dir)));

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => setTyping((t) => !t)}
          className="flex items-center gap-1 text-[11px]"
          style={{ color: T.textFaint }}
          aria-label={`Escribir ${label}`}
        >
          <Keyboard size={12} /> {typing ? "Rueda" : "Escribir"}
        </button>
      </div>
      {typing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="numeric"
          placeholder={shown || "0"}
          className="gc-code w-full mt-1 rounded-lg px-3 py-2 text-[16px] outline-none"
          style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}` }}
        />
      ) : (
        <div
          className="mt-1 flex justify-center gap-0.5 rounded-lg py-1"
          style={{ backgroundColor: T.surfaceRaised, border: `1px solid ${T.border}` }}
        >
          {digits.map((d, i) => {
            const k = n - 1 - i; // posición: 0 = unidades
            const last = k <= 2; // los 3 últimos, los que más se tocan
            return (
              <div key={i} className="flex flex-col items-center" style={{ width: 30 }}>
                <button type="button" onClick={() => step(k, +1)} aria-label={`Subir dígito ${k}`} className="py-1 w-full flex justify-center">
                  <ChevronUp size={16} style={{ color: last ? T.textSecondary : T.textFaint }} />
                </button>
                <span
                  className="gc-code text-[20px] font-semibold leading-none rounded"
                  style={{
                    color: has ? T.textPrimary : T.textFaint,
                    backgroundColor: last ? T.surface : "transparent",
                    padding: "4px 5px",
                  }}
                >
                  {d}
                </span>
                <button type="button" onClick={() => step(k, -1)} aria-label={`Bajar dígito ${k}`} className="py-1 w-full flex justify-center">
                  <ChevronDown size={16} style={{ color: last ? T.textSecondary : T.textFaint }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
