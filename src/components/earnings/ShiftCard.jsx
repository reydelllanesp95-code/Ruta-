import React, { useState } from "react";
import { Clock, Navigation, Pencil, HandCoins } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, routeEconomics, fechaCorta } from "../../lib/earnings.js";
import { platformLabel } from "../../lib/platforms.js";
import { vehicleOf, vehicleLabel } from "../../lib/vehicles.js";
import ShiftForm from "./ShiftForm.jsx";

// Tarjeta de un turno manual (Flex / Spark / Otro).
export default function ShiftCard({ route, config, locales = [], onSave, onDelete }) {
  const limpieza = route.plataforma === "limpieza";
  const [editing, setEditing] = useState(false);
  const eco = routeEconomics(route, config);
  const horasBloque = Number(route.horas) > 0 ? Number(route.horas) : null;
  const horasReales = Number(route.horasReales) > 0 ? Number(route.horasReales) : null;
  // $/hora con horas reales (puerta a puerta) si existen; si no, las del bloque.
  const horas = horasReales || horasBloque;
  const porHora = horas ? eco.net_profit / horas : null;
  const tramo = [
    route.salidaCasa && `casa ${route.salidaCasa}`,
    horasBloque && `bloque ${route.horaInicio}–${route.horaFin}`,
    route.llegadaCasa && `casa ${route.llegadaCasa}`,
  ]
    .filter(Boolean)
    .join(" → ");

  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-medium" style={{ color: T.textPrimary }}>
              {fechaCorta(route.fecha)} {String(route.fecha).slice(0, 4)}
            </span>
            <span
              className="text-[9.5px] uppercase px-1.5 py-0.5 rounded gc-eyebrow"
              style={{ backgroundColor: T.surfaceRaised, color: T.textSecondary }}
            >
              {platformLabel(route.plataforma)}
              {limpieza && route.local ? ` · ${route.local}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12.5px] mt-1" style={{ color: T.textSecondary }}>
            <span className="flex items-center gap-1">
              <Clock size={12} />{" "}
              {horas
                ? horasReales
                  ? `${horasReales} h reales${horasBloque ? ` (${horasBloque} h bloque)` : ""}`
                  : `${horasBloque} h`
                : "sin horas"}
            </span>
            <span className="flex items-center gap-1">
              <Navigation size={12} /> {route.millas} mi · {vehicleLabel(vehicleOf(route)).split(" ")[1]}
            </span>
          </div>
          {tramo && (
            <div className="text-[11.5px] mt-0.5" style={{ color: T.textFaint }}>
              {tramo}
            </div>
          )}
          {route.propina > 0 && (
            <div className="flex items-center gap-1 text-[12px] mt-0.5" style={{ color: T.textFaint }}>
              <HandCoins size={12} /> {formatMoney(route.pagoBase)} pago + {formatMoney(route.propina)} propina
            </div>
          )}
          {route.nota && (
            <div className="text-[12px] mt-0.5 truncate" style={{ color: T.textFaint }}>
              {route.nota}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="gc-code text-[17px] font-semibold" style={{ color: T.ok }}>
            {limpieza ? (horasReales ? `${horasReales} h` : "—") : formatMoney(route.ganancia)}
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="mt-1 inline-flex items-center gap-1 text-[11.5px]"
              style={{ color: T.textFaint }}
            >
              <Pencil size={11} /> editar
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 grid grid-cols-4 gap-1" style={{ borderTop: `1px solid ${T.borderSoft}` }}>
        {limpieza ? (
          <>
            <Metric label="Costo viaje" value={formatMoney(eco.fuel_cost + eco.maintenance_est)} color={T.textPrimary} strong />
            <Metric label="Millas" value={String(route.millas)} color={T.textPrimary} />
          </>
        ) : (
          <>
            <Metric label="Neto" value={formatMoney(eco.net_profit)} color={eco.net_profit >= 0 ? T.ok : T.red} strong />
            <Metric label="Neto/h" value={porHora != null ? formatMoney(porHora) : "—"} color={T.textPrimary} />
          </>
        )}
        <Metric label="− Gas" value={formatMoney(eco.fuel_cost)} color={T.textSecondary} />
        <Metric label="− Mant" value={formatMoney(eco.maintenance_est)} color={T.textSecondary} />
      </div>

      {editing && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.borderSoft}` }}>
          <ShiftForm
            locales={locales}
            initial={route}
            onSubmit={(input) => {
              onSave(input);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            onDelete={() => onDelete(route.id)}
          />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color, strong }) {
  return (
    <div className="text-center">
      <div className="text-[9.5px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>
        {label}
      </div>
      <div className="gc-code mt-0.5" style={{ color, fontSize: strong ? 15 : 12.5, fontWeight: strong ? 700 : 500 }}>
        {value}
      </div>
    </div>
  );
}
