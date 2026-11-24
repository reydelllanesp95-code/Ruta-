import React from "react";
import { T } from "../../lib/theme.js";
import { formatMoney } from "../../lib/earnings.js";
import { MENSAJE_COMPENSACION } from "../../lib/meta.js";
import { Card, Eyebrow, Row } from "./ui.jsx";
import { Inversiones } from "./MetaV2.jsx";

// Cierre del lunes: lo que tocaba mover con la semana que cerró. «Hecho» solo
// lo apunta.
export default function SemanaPasada({ semana, estado, u, compensa = false, hecho, onHecho }) {
  const r = estado.reparto;
  const invertir = estado.invertir || compensa;
  return (
    <Card>
      <Eyebrow right={semana.label}>Semana pasada</Eyebrow>
      <Row label="Neta" value={formatMoney(semana.neta)} color={estado.color} strong />
      {r.fondo > 0 && <Row label="Al fondo colchón" value={formatMoney(r.fondo)} />}
      {r.tarjetas > 0 && <Row label="A tarjetas" value={formatMoney(r.tarjetas)} />}
      {r.extra > 0 && <Row label="Extra a deuda" value={formatMoney(r.extra)} />}
      {invertir && <Row label="A inversión" value={formatMoney(u.inversion)} />}
      {r.sinAsignar > 0 && !compensa && <Row label="Sin asignar" hint="(no llegó a invertir)" value={formatMoney(r.sinAsignar)} />}
      {compensa && <div className="text-[13px] py-1" style={{ color: T.ok }}>{MENSAJE_COMPENSACION}</div>}
      {invertir && <Inversiones lista={u.inversiones} />}
      {estado.consejo && <div className="text-[13px] py-1" style={{ color: T.textSecondary }}>{estado.consejo}</div>}
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
