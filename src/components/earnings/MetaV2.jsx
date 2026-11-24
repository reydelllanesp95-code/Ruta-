import React, { useState } from "react";
import { T } from "../../lib/theme.js";
import { formatMoney, fechaCorta, round2, todayISO, makeUUID } from "../../lib/earnings.js";
import { MENSAJE_FONDO_LLENO } from "../../lib/meta.js";
import { Card, Eyebrow, Row, MetaBar } from "./ui.jsx";

// Tarjetas de la meta v2 (semana, mes, fondo colchón, deuda). Solo pintan:
// los cálculos vienen de lib/meta.js. RUTA no mueve dinero.

const inputSt = { backgroundColor: T.surface, color: T.textPrimary, border: `1px solid ${T.border}` };
const btnSt = { backgroundColor: T.red, color: "#fff", minHeight: 44 };

export function Inversiones({ lista }) {
  if (!lista || !lista.length) return null;
  return (
    <div className="grid grid-cols-3 gap-1.5 mt-2">
      {lista.map((x) => (
        <div key={x.nombre} className="rounded-lg px-2 py-1.5" style={{ backgroundColor: T.surfaceRaised }}>
          <div className="text-[11px]" style={{ color: T.textFaint }}>{x.nombre}</div>
          <div className="gc-code text-[13.5px] font-semibold">{formatMoney(x.monto)}</div>
        </div>
      ))}
    </div>
  );
}

export function MetaSemanaCard({ estado, plan, porLlegar = 0, compact = false, hist = null, desdeSel, children }) {
  const { hitos } = estado;
  return (
    <Card>
      <MetaBar
        neta={estado.neta}
        tramos={hitos.tramos}
        meta={hitos.meta}
        color={estado.color}
        texto={estado.texto}
        lineas={[estado.consejo, plan && plan.textoPlan]}
        porLlegar={porLlegar}
        compact={compact}
      />
      {!compact && <Inversiones lista={estado.inversiones} />}
      {children}
      {hist && hist.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="text-[12.5px] mb-2" style={{ color: T.textFaint }}>
            Últimas {hist.length} semanas · meta cumplida en {hist.filter((h) => h.cumplida).length} de {hist.length}
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${hist.length}, minmax(0, 1fr))` }}>
            {hist.map((h) => (
              <div key={h.desde} className="flex flex-col items-center gap-1">
                <div className="w-full rounded-md" style={{ height: 22, backgroundColor: h.neta > 0 ? h.color : T.border, opacity: h.desde === desdeSel ? 1 : 0.75 }} title={`${h.label}: ${formatMoney(h.neta)}`} />
                <span className="text-[9.5px] text-center leading-tight" style={{ color: h.desde === desdeSel ? T.textPrimary : T.textFaint }}>{h.label.split(" – ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function MetaMesCard({ mes, hist }) {
  const color = mes.adelante ? T.ok : "#F0A33B";
  return (
    <Card>
      <MetaBar titulo={`Meta del mes · ${mes.label}`} neta={mes.neta} tramos={mes.hitos.tramos} meta={mes.meta} color={color} texto={mes.texto} lineas={[`Ritmo a hoy: ${formatMoney(mes.esperado)}.`]} />
      {hist && hist.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="text-[12.5px] mb-2" style={{ color: T.textFaint }}>Últimos {hist.length} meses · llegaste en {hist.filter((h) => h.llego).length}</div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${hist.length}, minmax(0, 1fr))` }}>
            {hist.map((h) => (
              <div key={h.desde} className="flex flex-col items-center gap-1">
                <div className="w-full rounded-md flex items-center justify-center text-[11px] font-semibold" style={{ height: 22, backgroundColor: h.llego ? T.ok : T.border, color: h.llego ? "#06210F" : T.textFaint }}>
                  {h.llego ? "✓" : "—"}
                </div>
                <span className="text-[9.5px] text-center leading-tight capitalize" style={{ color: T.textFaint }}>{h.label.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function FondoCard({ fondo, u, usos = [], onUsar }) {
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const pct = Math.min(100, (fondo.saldo / (u.fondoTope || 1)) * 100);
  function guardar() {
    const v = Number(monto);
    if (!(v > 0)) return setError("Pon cuánto usaste.");
    if (v > fondo.saldo) return setError(`El fondo tiene ${formatMoney(fondo.saldo)}.`);
    onUsar({ id: makeUUID(), fecha: todayISO(), monto: round2(v), nota: nota.trim() });
    setMonto("");
    setNota("");
    setError("");
    setAbierto(false);
  }
  return (
    <Card>
      <Eyebrow right={`tope ${formatMoney(u.fondoTope)}`}>Fondo colchón</Eyebrow>
      <div className="flex items-baseline justify-between">
        <span className="gc-code text-[22px] font-semibold" style={{ color: "#4A9BE8" }}>{formatMoney(fondo.saldo)}</span>
        <span className="text-[12.5px]" style={{ color: T.textFaint }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full mt-1" style={{ backgroundColor: T.border }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#4A9BE8" }} />
      </div>
      {fondo.lleno && <div className="text-[13px] mt-2" style={{ color: T.ok }}>{MENSAJE_FONDO_LLENO(u)}</div>}
      {usos.length > 0 && (
        <div className="mt-2">
          {usos.slice(-3).reverse().map((x) => (
            <div key={x.id} className="flex justify-between text-[12.5px] py-0.5" style={{ color: T.textSecondary }}>
              <span>{fechaCorta(x.fecha)} · {x.nota || "imprevisto"}</span>
              <span className="gc-code">−{formatMoney(x.monto)}</span>
            </div>
          ))}
        </div>
      )}
      {abierto ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Monto usado" inputMode="decimal" placeholder="Monto $" value={monto} onChange={(e) => setMonto(e.target.value)} className="gc-code rounded-lg px-2 py-2 text-[14px] outline-none" style={inputSt} />
            <input aria-label="Nota" placeholder="Nota (p. ej. llanta)" value={nota} onChange={(e) => setNota(e.target.value)} className="rounded-lg px-2 py-2 text-[14px] outline-none" style={inputSt} />
          </div>
          {error && <div className="text-[12px]" style={{ color: T.red }}>{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAbierto(false)} className="rounded-xl text-[14px]" style={{ ...inputSt, minHeight: 44 }}>Cancelar</button>
            <button type="button" onClick={guardar} className="rounded-xl text-[14px] font-semibold" style={btnSt}>Guardar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} disabled={!(fondo.saldo > 0)} className="w-full mt-2 rounded-xl text-[14px] font-semibold" style={{ ...inputSt, minHeight: 44, opacity: fondo.saldo > 0 ? 1 : 0.5 }}>
          Usé el fondo
        </button>
      )}
    </Card>
  );
}

export function DeudaCard({ plan, onPague }) {
  const [tarjetaId, setTarjetaId] = useState(null);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  function guardar() {
    const v = Number(monto);
    if (!(v > 0)) return setError("Pon cuánto pagaste.");
    onPague({ id: makeUUID(), tarjetaId, fecha: todayISO(), monto: round2(v) });
    setTarjetaId(null);
    setMonto("");
    setError("");
  }
  const pct = plan.total > 0 ? Math.min(100, (plan.pagado / plan.total) * 100) : 0;
  return (
    <Card>
      <Eyebrow right={`Fase ${plan.fase}`}>Deuda</Eyebrow>
      {plan.total > 0 ? (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px]" style={{ color: T.textSecondary }}>Queda</span>
            <span className="gc-code text-[20px] font-semibold">{formatMoney(plan.restante)}</span>
          </div>
          <div className="h-2 rounded-full mt-1" style={{ backgroundColor: T.border }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#F0A33B" }} />
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: T.textSecondary }}>
            Pagado {formatMoney(plan.pagado)} de {formatMoney(plan.total)} · plan {formatMoney(plan.semanal)}/semana
          </div>
          <div className="text-[13px] mt-1">{plan.textoPlan}</div>
          {plan.fechaFin && <div className="text-[12.5px]" style={{ color: T.textFaint }}>A este ritmo terminas ≈ {fechaCorta(plan.fechaFin)} {plan.fechaFin.slice(0, 4)}.</div>}
          {plan.discover && (
            <div className="text-[12.5px] mt-1" style={{ color: T.textFaint }}>
              {plan.discover.nombre}: para saldarla antes del {fechaCorta(plan.discover.objetivo)} necesitas {formatMoney(plan.discover.porSemana)}/semana.
            </div>
          )}
          <div className="mt-2">
            {plan.porTarjeta.filter((t) => Number(t.saldo) > 0).map((t) => (
              <div key={t.id} className="py-1.5" style={{ borderTop: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px]">
                    {t.nombre}
                    <span className="text-[11.5px] ml-1" style={{ color: T.textFaint }}>F{t.fase}{Number(t.apr) > 0 ? ` · ${t.apr}%` : ""}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="gc-code text-[14px]" style={{ color: t.restante > 0 ? T.textPrimary : T.ok }}>{t.restante > 0 ? formatMoney(t.restante) : "✓ pagada"}</span>
                    {t.restante > 0 && tarjetaId !== t.id && (
                      <button type="button" onClick={() => { setTarjetaId(t.id); setError(""); }} className="rounded-lg px-2.5 text-[12.5px] font-semibold" style={{ ...inputSt, minHeight: 36 }}>Pagué</button>
                    )}
                  </span>
                </div>
                {tarjetaId === t.id && (
                  <div className="flex gap-2 mt-1.5">
                    <input aria-label={`Pago a ${t.nombre}`} autoFocus inputMode="decimal" placeholder="Monto $" value={monto} onChange={(e) => setMonto(e.target.value)} className="gc-code flex-1 rounded-lg px-2 py-2 text-[14px] outline-none" style={inputSt} />
                    <button type="button" onClick={() => setTarjetaId(null)} className="rounded-lg px-3 text-[13px]" style={inputSt}>×</button>
                    <button type="button" onClick={guardar} className="rounded-lg px-3 text-[13px] font-semibold" style={btnSt}>Guardar</button>
                  </div>
                )}
                {tarjetaId === t.id && error && <div className="text-[12px] mt-1" style={{ color: T.red }}>{error}</div>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-[13px]" style={{ color: T.textSecondary }}>{plan.textoPlan}</div>
      )}
      <div className="text-[11.5px] mt-1.5" style={{ color: T.textFaint }}>Solo es un registro: RUTA no mueve dinero ni se conecta a bancos.</div>
    </Card>
  );
}

// Ajustes de las tarjetas (en Más): nombre, fase, saldo inicial, APR y fin de
// la promo de Discover.
export function DeudaAjustes({ deudas, onSave }) {
  const [open, setOpen] = useState(false);
  const [lista, setLista] = useState([]);
  const [promoFin, setPromoFin] = useState("");
  const [error, setError] = useState("");
  function abrir() {
    setLista(deudas.tarjetas.map((t) => ({ ...t, saldo: String(t.saldo ?? ""), apr: String(t.apr ?? "") })));
    setPromoFin(deudas.promoFin || "");
    setError("");
    setOpen(true);
  }
  const cambia = (i, k, v) => setLista((l) => l.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  function guardar() {
    const out = [];
    for (const t of lista) {
      const nombre = String(t.nombre || "").trim();
      if (!nombre) continue;
      const saldo = Number(t.saldo || 0), apr = Number(t.apr || 0);
      if (!(saldo >= 0) || !(apr >= 0)) return setError(`Revisa los números de ${nombre}.`);
      out.push({ id: t.id || makeUUID(), nombre, fase: Number(t.fase) === 2 ? 2 : 1, saldo: round2(saldo), apr: round2(apr) });
    }
    onSave({ ...deudas, tarjetas: out, promoFin });
    setOpen(false);
  }
  if (!open) {
    return (
      <button type="button" onClick={abrir} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px]" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.textSecondary, minHeight: 44 }}>
        <span>Tarjetas de la deuda ({deudas.tarjetas.length})</span>
        <span style={{ color: T.textFaint }}>›</span>
      </button>
    );
  }
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: T.surfaceRaised, border: `1px solid ${T.border}` }}>
      <div className="gc-eyebrow text-[11px] uppercase" style={{ color: T.textFaint }}>Tarjetas (saldo al empezar el plan)</div>
      {lista.map((t, i) => (
        <div key={t.id || i} className="grid gap-1.5" style={{ gridTemplateColumns: "1.6fr 0.7fr 1fr 0.8fr 28px" }}>
          <input aria-label="Tarjeta" value={t.nombre} onChange={(e) => cambia(i, "nombre", e.target.value)} className="rounded-lg px-2 py-1.5 text-[13px] outline-none min-w-0" style={inputSt} />
          <select aria-label="Fase" value={t.fase} onChange={(e) => cambia(i, "fase", Number(e.target.value))} className="rounded-lg px-1 py-1.5 text-[13px] outline-none min-w-0" style={inputSt}>
            <option value={1}>F1</option>
            <option value={2}>F2</option>
          </select>
          <input aria-label={`Saldo ${t.nombre}`} inputMode="decimal" placeholder="Saldo $" value={t.saldo} onChange={(e) => cambia(i, "saldo", e.target.value)} className="gc-code rounded-lg px-2 py-1.5 text-[13px] outline-none min-w-0" style={inputSt} />
          <input aria-label={`APR ${t.nombre}`} inputMode="decimal" placeholder="APR %" value={t.apr} onChange={(e) => cambia(i, "apr", e.target.value)} className="gc-code rounded-lg px-2 py-1.5 text-[13px] outline-none min-w-0" style={inputSt} />
          <button type="button" aria-label={`Quitar ${t.nombre}`} onClick={() => setLista((l) => l.filter((_, j) => j !== i))} className="text-[16px]" style={{ color: T.textFaint }}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => setLista((l) => [...l, { id: makeUUID(), nombre: "", fase: 1, saldo: "", apr: "" }])} className="text-[13px] underline" style={{ color: T.textSecondary, minHeight: 32 }}>+ Añadir tarjeta</button>
      <label className="block">
        <span className="text-[11px]" style={{ color: T.textFaint }}>Fin de la promo 0% (fase 2)</span>
        <input type="date" value={promoFin} onChange={(e) => setPromoFin(e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-[13px] outline-none mt-0.5" style={inputSt} />
      </label>
      {error && <div className="text-[12px]" style={{ color: T.red }}>{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl text-[14px]" style={{ ...inputSt, minHeight: 44 }}>Cancelar</button>
        <button type="button" onClick={guardar} className="rounded-xl text-[14px] font-semibold" style={btnSt}>Guardar</button>
      </div>
      <div className="text-[11px]" style={{ color: T.textFaint }}>Los pagos se apuntan con «Pagué» en Resumen; aquí va el saldo de cuando empezó el plan.</div>
    </div>
  );
}
