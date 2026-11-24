import React, { useMemo, useState } from "react";
import { T } from "../../lib/theme.js";
import { formatMoney } from "../../lib/earnings.js";
import { platformLabel } from "../../lib/platforms.js";
import { rendimiento } from "../../lib/rendimiento.js";
import { Card, Eyebrow, Segmented, APP_COLOR } from "./ui.jsx";

const corto = (a) => platformLabel(a).replace(/^Amazon /, "").replace(/ Driver$/, "");

// «¿Cuándo te rinde más?»: $/h después de gasolina por día de la semana y por
// franja horaria, con las últimas 8 semanas.
export default function RendimientoCard({ datos, hasta }) {
  const [vista, setVista] = useState("dia");
  const r = useMemo(() => rendimiento(datos, hasta, 8), [datos, hasta]);
  if (!r.apps.length) return null;
  const filas = vista === "dia" ? r.porDia : r.porFranja;
  const max = Math.max(1, ...filas.flatMap((f) => r.apps.map((a) => f.porApp[a]?.porHora || 0)));
  const mejor = (m) => (m ? `${m.label} en ${corto(m.app)} (${formatMoney(m.porHora)}/h)` : "—");
  return (
    <Card>
      <Eyebrow right="últimas 8 semanas">¿Cuándo te rinde más?</Eyebrow>
      <div className="text-[13px] mb-2" style={{ color: T.textSecondary }}>
        Mejor día: <span style={{ color: T.textPrimary }}>{mejor(r.mejorDia)}</span>
        <br />
        Mejor franja: <span style={{ color: T.textPrimary }}>{mejor(r.mejorFranja)}</span>
      </div>
      <Segmented label="Ver por" options={[{ id: "dia", label: "Por día" }, { id: "franja", label: "Por hora del día" }]} value={vista} onChange={setVista} />
      <div className="mt-2">
        {filas.map((f) => (
          <div key={f.id} className="py-1" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="text-[13px] mb-0.5">{f.label}</div>
            {r.apps.map((a) => {
              const c = f.porApp[a];
              return (
                <div key={a} className="flex items-center gap-2 text-[12px]">
                  <span className="w-10 shrink-0" style={{ color: T.textFaint }}>{corto(a)}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: T.border }}>
                    {c?.porHora != null && <div className="h-full rounded-full" style={{ width: `${Math.max(0, (c.porHora / max) * 100)}%`, backgroundColor: APP_COLOR[a] || T.textFaint }} />}
                  </div>
                  <span className="gc-code w-[124px] text-right shrink-0 whitespace-nowrap" style={{ color: c?.porHora != null ? T.textPrimary : T.textFaint }}>
                    {c?.porHora != null ? `${formatMoney(c.porHora)}/h` : c ? "poco dato" : "—"}
                    {c && <span className="text-[10.5px]" style={{ color: T.textFaint }}> {c.horas}h</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-[11.5px] mt-1.5" style={{ color: T.textFaint }}>
        Ganado menos gasolina, entre horas trabajadas. Por hora del día, cada bloque se reparte según su horario (madrugada 0–6, mañana 6–12, tarde 12–17, noche 17–24). Con menos de 1 h, «poco dato».
      </div>
    </Card>
  );
}
