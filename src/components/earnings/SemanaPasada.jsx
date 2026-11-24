import React from "react";
import { T } from "../../lib/theme.js";
import { formatMoney } from "../../lib/earnings.js";
import { Card, Eyebrow, Row } from "./ui.jsx";

// Lo que tocaba mover con la semana que cerró. «Hecho» solo lo apunta.
export default function SemanaPasada({ semana, tramo, hecho, onHecho }) {
  const r = tramo.reparto;
  return (
    <Card>
      <Eyebrow right={semana.label}>Semana pasada</Eyebrow>
      <Row label="Neta" value={formatMoney(semana.neta)} color={tramo.color} strong />
      {r.tarjetas > 0 && <Row label="A tarjetas" value={formatMoney(r.tarjetas)} />}
      {r.deuda > 0 && <Row label="A deuda" value={formatMoney(r.deuda)} />}
      {r.inversion > 0 && <Row label="A inversión" hint={`(${formatMoney(r.largoPlazo)} largo plazo · ${formatMoney(r.trading)} trading)`} value={formatMoney(r.inversion)} />}
      {r.extra > 0 && <Row label="A ahorro o más inversión" value={formatMoney(r.extra)} />}
      {tramo.n === 1 && <div className="text-[13px] py-1" style={{ color: T.textSecondary }}>Solo lo básico: no tocaba mover nada.</div>}
      {hecho ? (
        <div className="text-[13px] mt-2" style={{ color: T.ok }}>✓ Hecho</div>
      ) : (
        <button type="button" onClick={onHecho} className="w-full mt-2 rounded-xl py-2.5 text-[14px] font-semibold" style={{ backgroundColor: T.ok, color: "#06210F", minHeight: 44 }}>
          Hecho
        </button>
      )}
      <div className="text-[11.5px] mt-1.5" style={{ color: T.textFaint }}>Solo es un registro: RUTA no mueve dinero.</div>
    </Card>
  );
}
