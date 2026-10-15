import React from "react";
import { T } from "../../lib/theme.js";
import { VEHICLE_IDS, vehicleLabel } from "../../lib/vehicles.js";

// Selector de vehículo (Kia / Tucson) reutilizable.
export default function VehiclePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {VEHICLE_IDS.map((id) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="rounded-lg py-1.5 text-[12.5px]"
            style={{
              backgroundColor: active ? T.surface : "transparent",
              color: active ? T.textPrimary : T.textFaint,
              border: `1px solid ${active ? T.textFaint : T.border}`,
            }}
          >
            {vehicleLabel(id)}
          </button>
        );
      })}
    </div>
  );
}
