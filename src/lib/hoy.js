// Pantalla Hoy: lo que llevas hoy y el reloj de la jornada en curso.
import { round2 } from "./earnings.js";
import { resumenRango } from "./resumen.js";
import { horasJornada } from "./jornada.js";

// Ganado, horas, millas, neto/hora y por app del día `fecha`.
export function resumenHoy(datos, fecha) {
  const r = resumenRango(datos, fecha, fecha);
  return {
    ganado: r.ganado,
    horas: r.horas,
    millas: r.millas,
    netoHora: r.netoHora,
    registros: r.registros,
    porApp: r.porApp.filter((a) => a.ganado > 0).map((a) => ({ plataforma: a.plataforma, label: a.label, ganado: a.ganado })),
  };
}

// Tiempo trabajado de la jornada abierta hasta `ahora` (HH:MM), sin pausas.
// Con «Paré» se cuenta hasta la parada y `pausa` es true.
export function tiempoTrabajando(jornada, ahora) {
  if (!jornada) return null;
  const pausa = Boolean(jornada.horaParada);
  const h = horasJornada(pausa ? jornada : { ...jornada, horaLlegada: ahora });
  const min = Math.max(0, Math.round((h || 0) * 60));
  const texto = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
  return { min, horas: round2(min / 60), texto, pausa };
}
