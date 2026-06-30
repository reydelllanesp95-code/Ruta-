import React, { useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { T } from "../../lib/theme.js";
import { TARIFA_DEFAULT } from "../../lib/constants.js";
import {
  computeHuella,
  finalizeRoute,
  formatMoney,
  validateNonNegative,
  round2,
} from "../../lib/earnings.js";

const DUP_OPTS = [
  { value: "reemplazar", label: "Reemplazar" },
  { value: "duplicar", label: "Duplicar" },
  { value: "omitir", label: "Omitir" },
];

// previews: rutas preview del parser. existingRoutes: rutas ya guardadas.
// onConfirm recibe [{ route, replaceId }].  [Aud 7]
export default function ImportDialog({ previews, existingRoutes, onConfirm, onCancel }) {
  const [tarifa, setTarifa] = useState(String(TARIFA_DEFAULT));
  const [millas, setMillas] = useState(() => previews.map(() => "0"));
  const [actions, setActions] = useState(() =>
    previews.map((p) => (findDup(p, existingRoutes) ? "reemplazar" : "nuevo"))
  );
  const [error, setError] = useState("");

  const dups = useMemo(
    () => previews.map((p) => findDup(p, existingRoutes)),
    [previews, existingRoutes]
  );

  const advertencias = useMemo(
    () => previews.flatMap((p) => p.advertencias || []),
    [previews]
  );

  const tarifaNum = Number(tarifa);
  const tarifaOk = Number.isFinite(tarifaNum) && tarifaNum >= 0;

  function confirm() {
    const t = validateNonNegative(tarifa, "La tarifa");
    if (!t.ok) return setError(t.error);
    const resolved = [];
    for (let i = 0; i < previews.length; i++) {
      if (actions[i] === "omitir") continue;
      const m = validateNonNegative(millas[i], "Las millas");
      if (!m.ok) return setError(`Ruta ${previews[i].fecha}: ${m.error}`);
      const route = finalizeRoute(previews[i], { millas: m.value, tarifa: t.value });
      resolved.push({ route, replaceId: actions[i] === "reemplazar" && dups[i] ? dups[i].id : null });
    }
    if (resolved.length === 0) return setError("No hay rutas para importar (todas omitidas).");
    onConfirm(resolved);
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4"
        style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="gc-wordmark text-[16px]" style={{ color: T.textPrimary }}>
            Importar ruta
          </div>
          <button onClick={onCancel} aria-label="Cerrar">
            <X size={18} style={{ color: T.textSecondary }} />
          </button>
        </div>

        <label className="block mb-3">
          <span className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
            Tarifa por paquete (USD)
          </span>
          <input
            value={tarifa}
            onChange={(e) => setTarifa(e.target.value)}
            inputMode="decimal"
            className="gc-code w-full mt-1 rounded-lg px-3 py-2 text-[14px] outline-none"
            style={{
              backgroundColor: T.surfaceRaised,
              color: T.textPrimary,
              border: `1px solid ${tarifaOk ? T.border : T.red}`,
            }}
          />
        </label>

        <div className="space-y-3">
          {previews.map((p, i) => (
            <div
              key={p.fecha + "-" + i}
              className="rounded-xl p-3"
              style={{ backgroundColor: T.surfaceRaised, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium" style={{ color: T.textPrimary }}>
                  {p.fecha}
                </span>
                <span className="gc-code text-[15px] font-semibold" style={{ color: T.ok }}>
                  {formatMoney(round2(p.paquetes * (tarifaOk ? tarifaNum : 0)))}
                </span>
              </div>
              <div className="text-[12.5px] mt-1" style={{ color: T.textSecondary }}>
                {p.paquetes} paquetes · {p.paradas} paradas · {p.origen}
              </div>

              {dups[i] && (
                <div
                  className="mt-2 flex items-center gap-1.5 text-[12px] rounded-lg px-2 py-1.5"
                  style={{ backgroundColor: T.revisarDim, color: T.revisar }}
                >
                  <AlertTriangle size={13} /> Ya importaste esta ruta
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2">
                <label className="block">
                  <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                    Millas
                  </span>
                  <input
                    value={millas[i]}
                    onChange={(e) =>
                      setMillas((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))
                    }
                    inputMode="decimal"
                    className="gc-code w-full mt-1 rounded-lg px-2.5 py-1.5 text-[13.5px] outline-none"
                    style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
                  />
                </label>
                {dups[i] && (
                  <label className="block">
                    <span className="text-[10.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                      Qué hacer
                    </span>
                    <select
                      value={actions[i]}
                      onChange={(e) =>
                        setActions((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))
                      }
                      className="w-full mt-1 rounded-lg px-2.5 py-1.5 text-[13.5px] outline-none"
                      style={{ backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` }}
                    >
                      {DUP_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        {advertencias.length > 0 && (
          <div className="mt-3 text-[12px] rounded-lg p-2" style={{ backgroundColor: T.revisarDim, color: T.revisar }}>
            {advertencias.map((w, i) => (
              <div key={i}>⚠ {w}</div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 text-[12.5px]" style={{ color: T.red }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={confirm}
            className="flex-1 rounded-lg py-2.5 text-[14px] font-medium"
            style={{ backgroundColor: T.red, color: "#fff" }}
          >
            Confirmar
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg py-2.5 px-4 text-[14px]"
            style={{ backgroundColor: T.surfaceRaised, color: T.textSecondary, border: `1px solid ${T.border}` }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function findDup(preview, existing) {
  const huella = computeHuella(preview);
  return existing.find((r) => r.huella === huella) || null;
}
