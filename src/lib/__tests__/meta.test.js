import { describe, it, expect } from 'vitest';
import {
  netaMeta, estadoSemana, hitosSemana, hitosMes, fondoColchon, mesMeta, compensacion, historialMeta,
  historialMeses, planDeuda, hitosNuevos, marcarAvisados, umbralesDe, UMBRALES_DEFAULT, MENSAJE_COMPENSACION,
  cierresPendientes, sanitizeDeudas,
} from '../meta.js';
import { makeShift } from '../platforms.js';

// Criterios de docs/criterios-meta-v2.md. Datos sintéticos, ajenos al historial del usuario.
const turno = (fecha, pago, propina = 0, plataforma = 'flex') =>
  makeShift({ plataforma, vehiculo: 'kia', fecha, horaInicio: '08:00', horaFin: '10:00', pago: String(pago), propina: String(propina), millas: '' });
const U = UMBRALES_DEFAULT;
// Decisión de Rey (24-nov-2026, por voz): las tarjetas llevan día de cierre y
// saldos de cierre en vez de pagos sueltos.
const deudas = {
  tarjetas: [
    { id: 'a', nombre: 'Chase Prime', fase: 1, diaCierre: 5, apr: 24 },
    { id: 'b', nombre: 'Capital One', fase: 1, diaCierre: 12, apr: 29.9 },
    { id: 'c', nombre: 'Discover', fase: 2, diaCierre: 20, apr: 0 },
  ],
  cierres: [
    { tarjetaId: 'a', fecha: '2025-03-01', saldo: 2000 },
    { tarjetaId: 'b', fecha: '2025-03-01', saldo: 1500 },
    { tarjetaId: 'c', fecha: '2025-03-01', saldo: 7700 },
  ],
};

describe('criterios de la meta v2', () => {
  it('1. fondo < $500 y neta $500 → te faltan $260 para cubrir la deuda', () => {
    const e = estadoSemana(500, U, { saldoFondo: 100 });
    expect(e.tramo).toBe('deuda');
    expect(e.texto).toMatch(/Llevas \$420(\.00)? para tarjetas\. Te faltan \$260(\.00)? para cubrir la deuda de la semana\./);
  });
  it('2. neta exactamente $860 → inversión desbloqueada, con su reparto', () => {
    const e = estadoSemana(860, U, { saldoFondo: 0 });
    expect(e.invertir).toBe(true);
    expect(e.texto).toMatch(/¡Ya puedes invertir tus \$100(\.00)?!/);
    expect(e.inversiones.map((x) => `${x.nombre} ${x.monto}`)).toEqual(['VOO 40', 'SCHD 15', 'NVDA 10', 'BTC 15', 'ETH 13', 'altcoins 7']);
    expect(estadoSemana(859.99, U, { saldoFondo: 0 }).invertir).toBe(false);
  });
  it('3. neta $1,000 en fase 1 → $100 extra a la tarjeta de mayor APR', () => {
    const e = estadoSemana(1000, U, { saldoFondo: 0, deudas });
    expect(e.texto).toMatch(/Meta cumplida\. \$40(\.00)? extra a deuda\./);
    expect(e.reparto.excedente).toBe(100);
    expect(e.consejo).toMatch(/Tienes \$100(\.00)? de más\. Recomendado: todo a Capital One\./);
    // Fase 2 (fase 1 pagada): mitad a Discover, mitad a ahorro.
    const pagadas = { ...deudas, cierres: [...deudas.cierres, { tarjetaId: 'a', fecha: '2025-04-05', saldo: 0 }, { tarjetaId: 'b', fecha: '2025-04-12', saldo: 0 }] };
    expect(estadoSemana(1000, U, { saldoFondo: 0, deudas: pagadas }).consejo).toMatch(/mitad a Discover, mitad a ahorro para la casa/);
  });
  it('4. fondo en $500 y neta $760 → deuda cubierta, sin tramo de colchón', () => {
    const h = hitosSemana(U, 500);
    expect(h.tramos.map((t) => t.id)).toEqual(['deuda', 'inversion', 'meta']);
    expect([h.h.deuda, h.h.inversion, h.h.meta]).toEqual([760, 860, 900]);
    expect(h.deuda).toBe(760);
    const e = estadoSemana(760, U, { saldoFondo: 500 });
    expect(e.texto).toMatch(/Deuda de la semana cubierta\. Te faltan \$100(\.00)? para invertir\./);
    expect(e.reparto).toMatchObject({ fondo: 0, tarjetas: 760 });
    // Mensual sin colchón cuando el fondo está lleno.
    expect(hitosMes(U, 500).tramos.map((t) => t.id)).toEqual(['deuda', 'inversion', 'meta']);
    expect(hitosMes(U, 0).meta).toBe(3900);
  });
  it('5. fondo en $420 → los primeros $80 van al fondo', () => {
    const e = estadoSemana(80, U, { saldoFondo: 420 });
    expect(e.reparto.fondo).toBe(80);
    expect(e.cruzados).toEqual(['colchon']);
    expect(estadoSemana(50, U, { saldoFondo: 420 }).texto).toMatch(/Te faltan \$30(\.00)? para el colchón\./);
    // Y el fondo se llena: 420 + 80 = 500.
    const u = { ...U, fondoInicial: 420, fondoDesde: '2025-03-03' };
    const f = fondoColchon({ routes: [turno('2025-03-04', 100)] }, u, [], '2025-03-09');
    expect(f.saldo).toBe(500);
    expect(f.lleno).toBe(true);
  });
  it('6. cada hito avisa una sola vez por semana', () => {
    let avisados = {};
    const n1 = hitosNuevos('2025-03-03', ['colchon', 'deuda'], avisados);
    expect(n1).toEqual(['colchon', 'deuda']);
    avisados = marcarAvisados('2025-03-03', n1, avisados);
    expect(hitosNuevos('2025-03-03', ['colchon', 'deuda'], avisados)).toEqual([]);
    expect(hitosNuevos('2025-03-03', ['colchon', 'deuda', 'inversion'], avisados)).toEqual(['inversion']);
    expect(hitosNuevos('2025-03-10', ['colchon'], avisados)).toEqual(['colchon']); // otra semana
  });
  it('7. semana floja + mes por delante del ritmo → compensación', () => {
    // Mes de marzo 2025: semana lun 3–dom 9 con $500 (floja), pero el 1 y 2 de marzo dejaron $1,400.
    const datos = { routes: [turno('2025-03-01', 700), turno('2025-03-02', 700), turno('2025-03-05', 500)] };
    const semana = { desde: '2025-03-03', hasta: '2025-03-09' };
    // Ritmo al día 9: 3900·9/31 = 1132.26; lleva 1900 → por delante.
    expect(mesMeta(datos, U, 0, '2025-03-09', '2025-03-09').adelante).toBe(true);
    expect(compensacion(datos, U, 0, semana, '2025-03-20')).toBe(true);
    expect(MENSAJE_COMPENSACION).toBe('Esta semana fue floja, pero el mes va bien: puedes invertir igual.');
    // Sin el arranque fuerte, no hay compensación.
    expect(compensacion({ routes: [turno('2025-03-05', 500)] }, U, 0, semana, '2025-03-20')).toBe(false);
  });
  it('8. el lunes la barra vuelve a $0 y la semana anterior pasa al historial', () => {
    const datos = { routes: [turno('2025-03-09', 400)] }; // domingo
    expect(netaMeta(datos, '2025-03-10', '2025-03-16').neta).toBe(0); // lunes siguiente
    const h = historialMeta(datos, '2025-03-10', U, 8);
    expect(h).toHaveLength(8);
    expect(h[h.length - 1]).toMatchObject({ desde: '2025-03-10', neta: 0 });
    expect(h[h.length - 2]).toMatchObject({ desde: '2025-03-03', neta: 400, cumplida: false });
  });
});

describe('meta v2: resto', () => {
  it('9 (lógica). cambiar un umbral en la config cambia los hitos', () => {
    const u = umbralesDe({ meta_deuda_semana: 600 });
    expect(hitosSemana(u, 0).h).toEqual({ colchon: 80, deuda: 680, inversion: 780, meta: 820 });
    expect(umbralesDe({}).inversion).toBe(100);
    expect(umbralesDe({ meta_inversiones: [{ nombre: 'VOO', monto: 150 }] }).inversion).toBe(150);
  });
  it('neta resta gasolina, mantenimiento, comida y peajes; no cuenta limpiezas', () => {
    const datos = {
      routes: [turno('2025-03-04', 1000), makeShift({ plataforma: 'limpieza', vehiculo: 'kia', fecha: '2025-03-04', millas: '5', local: 'X' })],
      fuelups: [{ fecha: '2025-03-03', costo: 100 }, { fecha: '2025-03-02', costo: 40 }],
      maints: [{ fecha: '2025-03-05', costo: 30 }],
      meals: [{ fecha: '2025-03-04', costo: 20 }],
      tolls: [{ fecha: '2025-03-04', monto: 10 }],
    };
    expect(netaMeta(datos, '2025-03-03', '2025-03-09').neta).toBe(840);
  });
  it('propina pendiente no cuenta; se cuentan las «por llegar»', () => {
    const n1 = netaMeta({ routes: [turno('2025-03-08', 43, 0)] }, '2025-03-03', '2025-03-09', '2025-03-09');
    expect([n1.neta, n1.porLlegar]).toEqual([43, 1]);
  });
  it('fondo: usar el fondo resta y el colchón vuelve hasta reponerlo', () => {
    const u = { ...U, fondoInicial: 500, fondoDesde: '2025-03-03' };
    const datos = { routes: [turno('2025-03-04', 900), turno('2025-03-11', 900)] };
    const f = fondoColchon(datos, u, [{ fecha: '2025-03-10', monto: 120, nota: 'llanta' }], '2025-03-16');
    expect(f.saldoPara('2025-03-03')).toBe(500); // lleno: sin colchón esa semana
    expect(f.semanas.get('2025-03-03').aporte).toBe(0);
    expect(f.saldoPara('2025-03-10')).toBe(380); // usó 120
    expect(f.semanas.get('2025-03-10').aporte).toBe(80);
    expect(f.saldo).toBe(460);
  });
  it('mes: ritmo y texto; historial de 6 meses', () => {
    const datos = { routes: [turno('2025-03-03', 500)] };
    const r = mesMeta(datos, U, 0, '2025-03-10', '2025-03-10');
    expect(r.esperado).toBe(1258.06); // 3900·10/31
    expect(r.texto).toMatch(/Vas \$758\.06 por detrás del ritmo del mes\./);
    const h = historialMeses(datos, U, '2025-03-10', '2025-03-10', 6);
    expect(h.map((x) => x.desde)).toEqual(['2024-10-01', '2024-11-01', '2024-12-01', '2025-01-01', '2025-02-01', '2025-03-01']);
  });
  it('plan de deuda: semanas por delante/detrás y Discover 3 semanas antes', () => {
    const u = { ...U, planInicio: '2025-03-03', planMeses: 5 };
    const d = { ...deudas, promoFin: '2025-09-30', cierres: [...deudas.cierres, { tarjetaId: 'b', fecha: '2025-03-12', saldo: 0 }] };
    const p = planDeuda(d, u, '2025-03-17'); // 2 semanas
    expect(p.total).toBe(11200);
    expect(p.restante).toBe(9700);
    expect(p.semanal).toBe(516.92); // 11200 / (5·52/12)
    expect(p.semanasDiff).toBe(1); // tocaba quedar 10166.15; quedan 9700
    expect(p.textoPlan).toBe('Vas 1 semana por delante del plan de 5 meses.');
    expect(p.porTarjeta.find((t) => t.id === 'b').saldo).toBe(0);
    expect(p.discover.objetivo).toBe('2025-09-09');
    expect(planDeuda({ tarjetas: [], cierres: [] }, u, '2025-03-17').textoPlan).toMatch(/Pon tus tarjetas/);
    // Tarjetas sin saldo apuntado → fase 1 y consejo genérico.
    const vacias = { tarjetas: deudas.tarjetas, cierres: [] };
    expect(estadoSemana(1000, U, { saldoFondo: 0, deudas: vacias }).consejo).toMatch(/todo a la tarjeta con mayor interés/);
  });
});

describe('criterios del plan por cierres', () => {
  const u = { ...U, planInicio: '2025-01-06', planMeses: 5 };
  const d = (saldo) => ({ tarjetas: [{ id: 'x', nombre: 'Chase', fase: 1, diaCierre: 15 }], cierres: [{ tarjetaId: 'x', fecha: '2025-01-06', saldo: 14000 }, { tarjetaId: 'x', fecha: '2025-03-10', saldo }] });
  const semana10 = '2025-03-17'; // lunes, 10 semanas después del inicio
  it('1. adelantado: cuota $514.29, inversión $265.71, meta $900', () => {
    const e = estadoSemana(0, u, { saldoFondo: 0, deudas: d(6000), desde: semana10 });
    expect(e.cuota.cuota).toBe(514.29);
    expect(e.u.deuda).toBe(514.29);
    expect(e.u.inversion).toBe(265.71);
    expect(e.hitos.meta).toBe(900);
    expect(e.textoCuota).toMatch(/adelantado.*\$514\.29.*\$165\.71 más van a inversión/);
    expect(e.u.inversiones.find((x) => x.nombre === 'VOO').monto).toBe(106.28); // 40 · 2.6571
  });
  it('2. atrasado: cuota $857.14 y la meta sube a $1,077.14', () => {
    const e = estadoSemana(0, u, { saldoFondo: 0, deudas: d(10000), desde: semana10 });
    expect(e.cuota.cuota).toBe(857.14);
    expect(e.hitos.meta).toBe(1077.14);
    expect(e.textoCuota).toMatch(/atrasado.*sube a \$857\.14/);
  });
  it('3. aviso de cierre: pide el saldo hasta que se apunta; vuelve el mes siguiente', () => {
    const t = { tarjetas: [{ id: 'x', nombre: 'Chase', fase: 1, diaCierre: 15 }], cierres: [] };
    expect(cierresPendientes(t, '2026-11-24').map((p) => p.fechaCierre)).toEqual(['2026-11-15']);
    const con = { ...t, cierres: [{ tarjetaId: 'x', fecha: '2026-11-24', saldo: 900 }] };
    expect(cierresPendientes(con, '2026-11-24')).toEqual([]);
    expect(cierresPendientes(con, '2026-12-10')).toEqual([]);
    expect(cierresPendientes(con, '2026-12-16').map((p) => p.fechaCierre)).toEqual(['2026-12-15']);
    // Día 31 en un mes de 30: cierra el último día.
    const t31 = { tarjetas: [{ id: 'y', nombre: 'PNC', fase: 1, diaCierre: 31 }], cierres: [] };
    expect(cierresPendientes(t31, '2026-12-01').map((p) => p.fechaCierre)).toEqual(['2026-11-30']);
  });
  it('4. sin saldos apuntados la meta queda en 80 / 760 / 860 / 900', () => {
    const e = estadoSemana(0, U, { saldoFondo: 0, deudas: { tarjetas: [{ id: 'x', nombre: 'Chase', fase: 1, diaCierre: 15 }], cierres: [] }, desde: '2026-11-23' });
    expect([e.hitos.h.colchon, e.hitos.h.deuda, e.hitos.h.inversion, e.hitos.h.meta]).toEqual([80, 760, 860, 900]);
    expect(e.textoCuota).toBe('');
  });
  it('5. un saldo nuevo no cambia las semanas pasadas', () => {
    const antes = estadoSemana(0, u, { deudas: d(6000), desde: '2025-03-10' }); // el cierre del 10 no cuenta en su propia semana
    expect(antes.cuota.restante).toBe(14000);
    const despues = estadoSemana(0, u, { deudas: { ...d(6000), cierres: [...d(6000).cierres, { tarjetaId: 'x', fecha: '2025-03-20', saldo: 1 }] }, desde: '2025-03-10' });
    expect(despues.cuota).toEqual(antes.cuota);
  });
  it('falta el saldo de una tarjeta → cuota base y aviso', () => {
    const dos = { tarjetas: [...d(6000).tarjetas, { id: 'z', nombre: 'PNC', fase: 1, diaCierre: 3 }], cierres: d(6000).cierres };
    expect(estadoSemana(0, u, { deudas: dos, desde: semana10 }).cuota).toBe(null);
    expect(planDeuda(dos, u, semana10).textoPlan).toMatch(/Falta el saldo de PNC/);
  });
  it('6. tarjetas guardadas con saldo pasan a un primer cierre', () => {
    const viejo = { tarjetas: [{ id: 'cap', nombre: 'Capital One', fase: 1, saldo: 2000, apr: 29.9 }, { id: 'pnc', nombre: 'PNC', fase: 1, saldo: 0, apr: 0 }], pagos: [] };
    const n = sanitizeDeudas(viejo, '2026-11-23');
    expect(n.cierres).toEqual([{ id: 'cap-inicio', tarjetaId: 'cap', fecha: '2026-11-23', saldo: 2000 }]);
    expect(n.tarjetas.map((t) => [t.nombre, t.diaCierre, t.apr])).toEqual([['Capital One', null, 29.9], ['PNC', null, 0]]);
  });
});
