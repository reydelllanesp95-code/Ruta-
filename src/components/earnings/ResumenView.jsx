import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "../../lib/theme.js";
import { formatMoney, round2, todayISO } from "../../lib/earnings.js";
import { periodo, moverPeriodo, resumenPeriodo, resumenDia, promedioDia, detalleGastos, porDia, nombreDia } from "../../lib/resumen.js";
import { platformOf, platformLabel, isCleaning } from "../../lib/platforms.js";
import { Card, Eyebrow, NetoHero, Deducciones, Segmented, AppBadge, APP_COLOR } from "./ui.jsx";
import JornadaHoras from "./JornadaHoras.jsx";
import SemanaPasada from "./SemanaPasada.jsx";
import RendimientoCard from "./RendimientoCard.jsx";
import { esParadaFinal } from "../../lib/jornada.js";
import { MetaSemanaCard, MetaMesCard, FondoCard, DeudaCard } from "./MetaV2.jsx";
import { netaMeta, estadoSemana, historialMeta, compensacion, mesMeta, historialMeses } from "../../lib/meta.js";

const SECCIONES = [
  { id: "meta", label: "Meta" },
  { id: "dinero", label: "Dinero" },
  { id: "deuda", label: "Deuda" },
  { id: "rendimiento", label: "Rinde" },
];

const TIPOS = [
  { id: "día", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "año", label: "Año" },
];

// Pestaña Resumen: periodo con ‹ ›, Ganado − Deducciones = Neto, deducciones,
// comparación con el periodo anterior, últimos periodos y reparto por app.
export default function ResumenView({ datos, startDow, onSaveJornada, meta = null }) {
  const [seccion, setSeccion] = useState("meta");
  const [editando, setEditando] = useState(null);
  const [verDetalle, setVerDetalle] = useState(false);
  const [p, setP] = useState(() => periodo("semana", todayISO(), startDow));
  const esDia = p.tipo === "día";
  const { actual: r, anterior: a, serie } = useMemo(() => {
    if (!esDia) return resumenPeriodo(datos, p, startDow);
    // Un día se compara con tu día promedio, no con el de ayer (puede ser libre).
    const base = resumenPeriodo(datos, p, startDow, 7);
    return { ...base, anterior: promedioDia(datos, p.desde) };
  }, [datos, p, startDow, esDia]);
  const dia = useMemo(() => (esDia ? resumenDia(datos, p.desde) : null), [datos, p, esDia]);
  const maxSerie = Math.max(...serie.map((s) => Math.abs(s.neto)), 1);
  const esSemana = p.tipo === "semana";
  const hoy = todayISO();
  const mv = meta;
  const detalle = useMemo(() => detalleGastos(datos, p.desde, p.hasta), [datos, p]);
  const dias = useMemo(() => (esSemana && verDetalle ? porDia(datos, p.desde, p.hasta) : []), [datos, p, esSemana, verDetalle]);
  const sem = useMemo(() => {
    if (!esSemana || !mv) return null;
    const n = netaMeta(datos, p.desde, p.hasta, hoy);
    const saldo = mv.fondo.saldoPara(p.desde);
    return {
      n,
      estado: estadoSemana(n.neta, mv.u, { saldoFondo: saldo, deudas: mv.deudas, desde: p.desde }),
      hist: historialMeta(datos, p.desde, mv.u, 8, mv.fondo, mv.deudas),
      compensa: p.hasta < hoy ? compensacion(datos, mv.u, saldo, p, hoy, mv.deudas) : false,
    };
  }, [datos, p, esSemana, mv, hoy]);
  const refMes = p.tipo === "mes" ? p.desde : p.hasta < hoy ? p.hasta : hoy;
  const mes = useMemo(() => ((esSemana || p.tipo === "mes") && mv ? mesMeta(datos, mv.u, mv.fondo.saldo, refMes, hoy) : null), [datos, esSemana, p.tipo, mv, refMes, hoy]);
  const histMeses = useMemo(() => (mes ? historialMeses(datos, mv.u, refMes, hoy, 6, mv.fondo.saldo) : []), [mes, datos, mv, refMes, hoy]);
  const semanaCerrada = esSemana && p.hasta < todayISO();
  const nombre = { día: "día", semana: "semana", mes: "mes", año: "año" }[p.tipo];

  return (
    <div className="space-y-3">
      <Segmented label="Sección" options={SECCIONES} value={seccion} onChange={setSeccion} />
      {seccion !== "deuda" && (
        <>
      <Segmented label="Periodo" options={TIPOS} value={p.tipo} onChange={(t) => setP(periodo(t, todayISO(), startDow))} />
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Periodo anterior" onClick={() => setP(moverPeriodo(p, -1, startDow))} className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-semibold capitalize">{p.label}</span>
        <button type="button" aria-label="Periodo siguiente" onClick={() => setP(moverPeriodo(p, 1, startDow))} className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <ChevronRight size={18} />
        </button>
      </div>
        </>
      )}

      {seccion === "meta" && (
        <>
          {!sem && !mes && (
            <Card>
              <div className="text-[14px]" style={{ color: T.textSecondary }}>La meta es por semana o por mes.</div>
              <button type="button" onClick={() => setP(periodo("semana", todayISO(), startDow))} className="w-full mt-2 rounded-xl text-[14px] font-semibold" style={{ backgroundColor: T.red, color: "#fff", minHeight: 44 }}>Ver esta semana</button>
            </Card>
          )}
      {sem && (
        <MetaSemanaCard
          estado={sem.estado}
          plan={mv.plan}
          porLlegar={sem.n.porLlegar}
          hist={sem.hist}
          desdeSel={p.desde}
          onTap={() => setVerDetalle((v) => !v)}
          tapLabel={verDetalle ? "Ocultar detalle" : "Ver ganado y gastos por día"}
          onSemana={(desde) => setP(periodo("semana", desde, startDow))}
        >
          {verDetalle && (
            <div className="mt-2 rounded-lg p-2.5" style={{ backgroundColor: T.surfaceRaised }}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[11px] pb-1" style={{ color: T.textFaint }}>
                <span>Día</span><span className="text-right">Ganado</span><span className="text-right">Gasolina</span><span className="text-right">Otros</span>
              </div>
              {dias.map((x) => (
                <div key={x.fecha} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[13px] py-0.5 gc-code" style={{ color: x.ganado || x.gastos || x.gasolina ? T.textPrimary : T.textFaint }}>
                  <span style={{ fontFamily: "inherit" }}>{nombreDia(x.fecha).split(" ")[0].slice(0, 3)} {x.fecha.slice(8)}</span>
                  <span className="text-right">{formatMoney(x.ganado)}</span>
                  <span className="text-right" style={{ color: "#FF7A72" }}>{x.gasolina ? `−${formatMoney(x.gasolina)}` : "—"}</span>
                  <span className="text-right" style={{ color: "#FF7A72" }}>{x.gastos ? `−${formatMoney(x.gastos)}` : "—"}</span>
                </div>
              ))}
              <div className="text-[11.5px] mt-1" style={{ color: T.textFaint }}>«Otros» = mantenimiento, comida y peajes. Toca cada gasto abajo, en Deducciones, para ver la lista.</div>
            </div>
          )}
          <div className="text-[12px] mt-2" style={{ color: T.textFaint }}>
            Neta = {formatMoney(sem.n.ganado)} ganado − {formatMoney(sem.n.gastos.gasolina)} gasolina pagada − {formatMoney(sem.n.gastos.mantenimiento)} mantenimiento − {formatMoney(sem.n.gastos.comida)} comida − {formatMoney(sem.n.gastos.peajes)} peajes.
          </div>
        </MetaSemanaCard>
      )}
      {sem && semanaCerrada && sem.n.ganado > 0 && (
        <SemanaPasada
          semana={{ ...sem.n, label: p.label }}
          estado={sem.estado}
          u={sem.estado.u}
          compensa={sem.compensa}
          hecho={Boolean(mv.metaReg[p.desde]?.hecho)}
          onHecho={() => mv.onHecho(p.desde, sem.estado.reparto)}
        />
      )}
      {mes && <MetaMesCard mes={mes} hist={histMeses} />}
        </>
      )}

      {seccion === "dinero" && (
        <>
      {r.registros === 0 ? (
        <Card>
          <div className="text-[14px] text-center py-4" style={{ color: T.textFaint }}>Sin trabajos apuntados en este {nombre}.</div>
        </Card>
      ) : (
        <>
          <NetoHero r={r} netoLabel={esDia ? "Neto del día" : "Neto"} />
          {esDia && <LineaDeTiempo lista={dia.lista} jornadas={(datos.jornadas || []).filter((j) => j.fecha === p.desde)} />}
          <Deducciones d={r.deducciones} detalle={detalle} titulo={esDia ? "Deducciones del día" : "Deducciones"} />
        </>
      )}

      {esDia && onSaveJornada && (datos.jornadas || []).filter((j) => j.fecha === p.desde).map((j) =>
            editando === j.id ? (
              <JornadaHoras key={j.id} jornada={j} onSave={onSaveJornada} onClose={() => setEditando(null)} />
            ) : (
              <button key={j.id} type="button" onClick={() => setEditando(j.id)} className="text-[12.5px] underline px-1" style={{ color: T.textSecondary, minHeight: 32 }}>
                Editar horas de la jornada (salí / paré / llegué)
              </button>
            )
          )}
      <Card>
        <Eyebrow right={`vs ${a.label}`}>Comparación</Eyebrow>
        <div className="grid gap-x-2 gap-y-1.5 text-[13px] items-baseline" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}>
          <span />
          <span className="text-right text-[11.5px]" style={{ color: T.textFaint }}>Este</span>
          <span className="text-right text-[11.5px]" style={{ color: T.textFaint }}>{esDia ? "Promedio" : "Anterior"}</span>
          <span className="text-right text-[11.5px]" style={{ color: T.textFaint }}>Cambio</span>
          <Fila label="Ganado" a={r.ganado} b={a.ganado} money />
          <Fila label="Neto" a={r.neto} b={a.neto} money />
          <Fila label="Neto/hora" a={r.netoHora} b={a.netoHora} money />
          <Fila label="Horas" a={r.horas} b={a.horas} neutral />
          <Fila label="Millas" a={Math.round(r.millas)} b={Math.round(a.millas)} neutral />
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="text-[12.5px] mb-2" style={{ color: T.textFaint }}>{esDia ? "Neto de los últimos 7 días" : "Neto de los últimos periodos"}</div>
          <div className="flex items-end gap-2" style={{ height: 110 }}>
            {serie.map((s, i) => {
              const ult = i === serie.length - 1;
              return (
                <button type="button" key={s.desde} onClick={() => setP(periodo(p.tipo, s.desde, startDow))} aria-label={`Ver ${s.label}`} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="gc-code text-[11px]" style={{ color: ult ? T.textPrimary : T.textSecondary }}>{Math.round(s.neto) ? `$${Math.round(s.neto)}` : "—"}</span>
                  <div className="w-full rounded-t-md" style={{ height: Math.max(3, Math.round((Math.abs(s.neto) / maxSerie) * 70)), backgroundColor: s.neto < 0 ? T.red : ult ? T.ok : "#3A3A3D" }} />
                  <span className="text-[10.5px] text-center leading-tight" style={{ color: ult ? T.textPrimary : T.textFaint }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
        </>
      )}

      {seccion === "deuda" && mv && (
        <>
          <DeudaCard plan={mv.plan} deudas={mv.deudas} onCierre={mv.onCierre} />
          <FondoCard fondo={mv.fondo} u={mv.u} usos={mv.usos} onUsar={mv.onUsarFondo} />
        </>
      )}

      {seccion === "rendimiento" && (
        <>
      {!esDia && <RendimientoCard datos={datos} hasta={p.hasta < hoy ? p.hasta : hoy} />}

      {r.porApp.length > 0 && (
        <Card>
          <Eyebrow>Por app</Eyebrow>
          <div className="flex h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: T.border }}>
            {r.porApp.map((x) => (
              <div key={x.plataforma} style={{ width: `${r.ganado > 0 ? (x.ganado / r.ganado) * 100 : 0}%`, backgroundColor: APP_COLOR[x.plataforma] || T.textFaint }} />
            ))}
          </div>
          {r.porApp.map((x) => (
            <div key={x.plataforma} className="flex justify-between text-[14px] py-1">
              <span>
                <span className="inline-block rounded-sm mr-1.5" style={{ width: 10, height: 10, backgroundColor: APP_COLOR[x.plataforma] || T.textFaint }} />
                {x.label} · {x.registros}
                {x.ganadoHora != null && <span style={{ color: T.textFaint }}> · {formatMoney(x.ganadoHora)}/h bruto</span>}
              </span>
              <span className="gc-code">{formatMoney(x.ganado)}</span>
            </div>
          ))}
        </Card>
      )}
        </>
      )}
    </div>
  );
}

function Fila({ label, a, b, money, neutral }) {
  const fmt = (v) => (v == null ? "—" : money ? formatMoney(v) : String(v));
  const diff = a != null && b != null ? round2(a - b) : null;
  const color = neutral || diff == null || diff === 0 ? T.textSecondary : diff > 0 ? T.ok : T.red;
  const txt = diff == null ? "—" : `${diff > 0 ? "▲ " : diff < 0 ? "▼ " : ""}${money ? formatMoney(Math.abs(diff)) : (diff > 0 ? "+" : "") + diff}`;
  return (
    <>
      <span>{label}</span>
      <span className="gc-code text-right">{fmt(a)}</span>
      <span className="gc-code text-right" style={{ color: T.textSecondary }}>{fmt(b)}</span>
      <span className="gc-code text-right" style={{ color }}>{txt}</span>
    </>
  );
}

// Lo que hiciste en orden: salí, cada trabajo, paré, llegué.
function LineaDeTiempo({ lista, jornadas }) {
  const items = [];
  for (const j of jornadas) {
    items.push({ hora: j.horaSalida, texto: `Salí de casa · ${Number(j.odoSalida).toLocaleString("en-US")}`, tipo: "casa" });
    for (const p of j.pausas || []) {
      if (esParadaFinal(j, p)) {
        items.push({ hora: p.desde, texto: "Dejé de trabajar", tipo: "casa" });
        continue;
      }
      items.push({ hora: p.desde, texto: "Pausa", tipo: "casa" });
      items.push({ hora: p.hasta, texto: "Volví a trabajar", tipo: "casa" });
    }
    if (j.horaParada) items.push({ hora: j.horaParada, texto: "Paré de trabajar", tipo: "casa" });
    if (j.horaLlegada) items.push({ hora: j.horaLlegada, texto: `Llegué a casa · ${Number(j.odoLlegada).toLocaleString("en-US")}`, tipo: "casa" });
  }
  for (const r of lista) {
    const bloques = r.bloques?.length ? r.bloques : [{ horaInicio: r.horaInicio, horaFin: r.horaFin, pago: r.pagoBase, propina: r.propina }];
    for (const b of bloques) {
      const total = (Number(b.pago) || 0) + (Number(b.propina) || 0);
      items.push({
        hora: b.horaInicio || "",
        fin: b.horaFin,
        app: platformOf(r),
        texto: isCleaning(r) ? `Limpieza ${r.local || ""}` : r.nota || "",
        importe: isCleaning(r) ? null : bloques.length > 1 ? total : Number(r.ganancia) || 0,
        propina: Number(b.propina) || 0,
      });
    }
  }
  items.sort((x, y) => (x.hora || "99").localeCompare(y.hora || "99"));
  if (!items.length) return null;
  return (
    <Card>
      <Eyebrow>Tu día, en orden</Eyebrow>
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="gc-code text-[12.5px] w-[44px] shrink-0 pt-0.5" style={{ color: T.textSecondary }}>{it.hora || "—"}</span>
            <span className="flex-1 text-[13.5px]">
              {it.app ? (
                <>
                  <AppBadge plataforma={it.app} label={platformLabel(it.app)} />{" "}
                  {it.fin && <span style={{ color: T.textSecondary }}>hasta {it.fin} </span>}
                  {it.texto && <span style={{ color: T.textFaint }}>· {it.texto}</span>}
                </>
              ) : (
                <span style={{ color: T.textPrimary }}>{it.texto}</span>
              )}
            </span>
            {it.importe != null && (
              <span className="gc-code text-[13.5px] text-right">
                {formatMoney(it.importe)}
                {it.propina > 0 && <span className="block text-[11px]" style={{ color: T.textFaint }}>propina {formatMoney(it.propina)}</span>}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
