import React, { useEffect, useState } from "react";
import { Images, ChevronRight, CreditCard, CalendarCheck, Clock, PauseCircle } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, fechaCorta } from "../../lib/earnings.js";
import { tiempoTrabajando } from "../../lib/hoy.js";
import { useContando, APP_COLOR } from "./ui.jsx";

function ahoraHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Hora actual que se renueva sola cada 30 s (para el reloj de la jornada).
function useAhora(activo) {
  const [h, setH] = useState(ahoraHHMM);
  useEffect(() => {
    if (!activo) return;
    setH(ahoraHHMM());
    const id = setInterval(() => setH(ahoraHHMM()), 30000);
    return () => clearInterval(id);
  }, [activo]);
  return h;
}

const VERDE_FONDO = "#122A1A";
const VERDE_BORDE = "#1F4A2B";
const VERDE_SUAVE = "#9FD9AD";

// Lo de hoy, arriba: total, horas, millas, neto/hora, por app y, si estás
// trabajando, el reloj en vivo.
export function HoyLlevas({ r, jornada }) {
  const ahora = useAhora(Boolean(jornada));
  const vivo = tiempoTrabajando(jornada, ahora);
  const total = useContando(r.ganado);
  const horas = vivo ? Math.max(vivo.horas, r.horas) : r.horas;
  const stat = (label, valor) => (
    <div className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "#0D1F13" }}>
      <div className="text-[11px]" style={{ color: "#8FB79A" }}>{label}</div>
      <div className="gc-code text-[15px] font-semibold" style={{ color: T.textPrimary }}>{valor}</div>
    </div>
  );
  return (
    <section className="rounded-2xl p-4" style={{ backgroundColor: VERDE_FONDO, border: `1px solid ${VERDE_BORDE}` }}>
      {vivo && (
        <div className="flex items-center gap-2 mb-2 text-[13px]" style={{ color: vivo.pausa ? T.textSecondary : T.ok }}>
          {vivo.pausa ? <PauseCircle size={15} /> : <span className="gc-latido inline-block rounded-full" style={{ width: 9, height: 9, backgroundColor: T.ok }} />}
          <span className="font-medium">{vivo.pausa ? "En pausa" : "Trabajando"}</span>
          <span className="gc-code ml-auto flex items-center gap-1" style={{ color: T.textPrimary }}><Clock size={13} /> {vivo.texto}</span>
        </div>
      )}
      <div className="text-[13px]" style={{ color: VERDE_SUAVE }}>Hoy llevas</div>
      <div className="gc-code text-[36px] font-semibold leading-tight" style={{ color: T.ok }}>{formatMoney(total)}</div>
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        {stat("Horas", horas > 0 ? `${horas} h` : "—")}
        {stat("Millas", r.millas > 0 ? `${Math.round(r.millas)} mi` : "—")}
        {stat("Neto/h", r.netoHora != null ? formatMoney(r.netoHora) : "—")}
      </div>
      <div className="text-[12.5px] mt-2 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: VERDE_SUAVE }}>
        {r.porApp.length ? r.porApp.map((a) => (
          <span key={a.plataforma} className="flex items-center gap-1">
            <span className="inline-block rounded-full" style={{ width: 7, height: 7, backgroundColor: APP_COLOR[a.plataforma] || T.textFaint }} />
            {a.label} <span className="gc-code">{formatMoney(a.ganado)}</span>
          </span>
        )) : <span>{vivo ? "Sube las capturas al terminar." : "Aún no has apuntado nada hoy."}</span>}
      </div>
    </section>
  );
}

// Fila «Subir capturas», con el aviso de propinas de Flex dentro.
export function FilaCapturas({ pendientes, onAbrir }) {
  return (
    <button type="button" onClick={onAbrir} className="w-full flex items-center gap-3 rounded-xl px-3 text-left" style={{ border: `1px solid ${T.border}`, backgroundColor: T.surfaceRaised, minHeight: 56 }}>
      <Images size={20} style={{ color: T.textSecondary }} />
      <span className="flex-1 py-2">
        <span className="block text-[15px]" style={{ color: T.textPrimary }}>Subir capturas</span>
        {pendientes.length > 0 ? (
          <span className="block text-[12.5px]" style={{ color: T.revisar }}>
            {pendientes.length} bloque(s) de Flex sin propina · {pendientes.slice(0, 2).map((r) => fechaCorta(r.fecha)).join(", ")}
          </span>
        ) : (
          <span className="block text-[12.5px]" style={{ color: T.textFaint }}>Flex o Lyft</span>
        )}
      </span>
      <ChevronRight size={18} style={{ color: T.textFaint }} />
    </button>
  );
}

// Pendientes en una lista; tocar una fila abre lo de siempre debajo.
export function Pendientes({ items }) {
  const [abierto, setAbierto] = useState(null);
  if (!items.length) return null;
  const ICONO = { cierre: CreditCard, semana: CalendarCheck };
  return (
    <section className="rounded-2xl px-4 py-2" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
      <div className="gc-eyebrow text-[11px] uppercase pt-1.5 pb-1" style={{ color: T.textFaint }}>Pendientes</div>
      {items.map((it, i) => {
        const Icono = ICONO[it.tipo] || CalendarCheck;
        const open = abierto === it.id;
        return (
          <div key={it.id} style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}>
            <button type="button" onClick={() => setAbierto(open ? null : it.id)} className="w-full flex items-center gap-3 text-left" style={{ minHeight: 48 }}>
              <Icono size={18} style={{ color: it.tipo === "cierre" ? "#9B87F5" : T.ok }} />
              <span className="flex-1 text-[14px]" style={{ color: T.textPrimary }}>{it.titulo}</span>
              <ChevronRight size={16} style={{ color: T.textFaint, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {open && <div className="pb-3">{it.contenido}</div>}
          </div>
        );
      })}
    </section>
  );
}
