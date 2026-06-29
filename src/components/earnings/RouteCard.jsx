import React, { useState } from "react";
import { Package, MapPin, Navigation, Pencil, Trash2, Save, X } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, validateNonNegative, round2 } from "../../lib/earnings.js";

const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaBonita(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[3])} ${MESES_CORTO[Number(m[2]) - 1]} ${m[1]}`;
}

export default function RouteCard({ route, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [millas, setMillas] = useState(String(route.millas ?? 0));
  const [tarifa, setTarifa] = useState(String(route.tarifaUsada ?? 1.7));
  const [error, setError] = useState("");

  function start() {
    setMillas(String(route.millas ?? 0));
    setTarifa(String(route.tarifaUsada ?? 1.7));
    setError("");
    setEditing(true);
  }

  function save() {
    const m = validateNonNegative(millas, "Las millas");
    const t = validateNonNegative(tarifa, "La tarifa");
    if (!m.ok) return setError(m.error);
    if (!t.ok) return setError(t.error);
    onSave({
      millas: m.value,
      tarifaUsada: t.value,
      ganancia: round2((route.paquetes || 0) * t.value),
    });
    setEditing(false);
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-medium" style={{ color: T.textPrimary }}>
              {fechaBonita(route.fecha)}
            </span>
            <span
              className="text-[9.5px] uppercase px-1.5 py-0.5 rounded gc-eyebrow"
              style={{ backgroundColor: T.surfaceRaised, color: T.textFaint }}
            >
              {route.origen}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12.5px] mt-1" style={{ color: T.textSecondary }}>
            <span className="flex items-center gap-1">
              <Package size={12} /> {route.paquetes}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {route.paradas}
            </span>
            <span className="flex items-center gap-1">
              <Navigation size={12} /> {route.millas} mi
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="gc-code text-[17px] font-semibold" style={{ color: T.ok }}>
            {formatMoney(route.ganancia)}
          </div>
          {!editing && (
            <button
              onClick={start}
              className="mt-1 inline-flex items-center gap-1 text-[11.5px]"
              style={{ color: T.textFaint }}
            >
              <Pencil size={11} /> editar
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${T.borderSoft}` }}>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                Millas
              </span>
              <input
                value={millas}
                onChange={(e) => setMillas(e.target.value)}
                inputMode="decimal"
                className="gc-code w-full mt-1 rounded-lg px-3 py-2 text-[14px] outline-none"
                style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}` }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
                Tarifa / paquete
              </span>
              <input
                value={tarifa}
                onChange={(e) => setTarifa(e.target.value)}
                inputMode="decimal"
                className="gc-code w-full mt-1 rounded-lg px-3 py-2 text-[14px] outline-none"
                style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}` }}
              />
            </label>
          </div>
          {error && (
            <div className="text-[12px]" style={{ color: T.red }}>
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium"
              style={{ backgroundColor: T.red, color: "#fff" }}
            >
              <Save size={14} /> Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center justify-center rounded-lg py-2 px-3 text-[13px]"
              style={{ backgroundColor: T.surfaceRaised, color: T.textSecondary, border: `1px solid ${T.border}` }}
            >
              <X size={14} />
            </button>
            <button
              onClick={() => onDelete(route.id)}
              className="flex items-center justify-center rounded-lg py-2 px-3"
              style={{ backgroundColor: T.redDim, color: T.red, border: `1px solid ${T.red}` }}
              aria-label="Eliminar ruta"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
