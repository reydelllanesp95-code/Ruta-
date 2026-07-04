import React from "react";
import { ShieldAlert, X } from "lucide-react";
import { T } from "../lib/theme.js";

// Banner discreto que recuerda respaldar cuando hay cambios sin guardar.
export default function BackupBanner({ dias, onBackup, onDismiss }) {
  const detalle =
    dias == null
      ? "Aún no has hecho un respaldo."
      : dias <= 0
      ? "Tienes cambios desde tu último respaldo."
      : `Último respaldo hace ${dias} día${dias === 1 ? "" : "s"}.`;

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5"
      style={{ backgroundColor: T.revisarDim, borderBottom: `1px solid ${T.border}` }}
    >
      <ShieldAlert size={18} style={{ color: T.revisar }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium" style={{ color: T.textPrimary }}>
          Cambios sin respaldar
        </div>
        <div className="text-[11.5px]" style={{ color: T.textSecondary }}>
          {detalle}
        </div>
      </div>
      <button
        onClick={onBackup}
        className="shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
        style={{ backgroundColor: T.red, color: "#fff" }}
      >
        Respaldar ahora
      </button>
      <button onClick={onDismiss} aria-label="Cerrar aviso" className="shrink-0">
        <X size={16} style={{ color: T.textFaint }} />
      </button>
    </div>
  );
}
