import { describe, it, expect } from 'vitest';
import { startJornada, closeJornada, openJornada, jornadaMiles, withJornadaMiles } from '../jornada.js';
import { makeShift } from '../platforms.js';
import { makeFuelup, realMpg, validateFuelup } from '../fuel.js';
import { lastOdometer } from '../odometer.js';

// Datos sintéticos, ajenos al historial del usuario.
const turno = (fecha, horaInicio, horaFin, extra = {}) =>
  makeShift({ plataforma: 'flex', vehiculo: 'kia', fecha, horaInicio, horaFin, pago: '40', millas: '', ...extra });

describe('jornada', () => {
  it('salida y llegada; rechaza llegada <= salida', () => {
    const s = startJornada({ fecha: '2025-03-08', hora: '06:00', vehiculo: 'tucson', odo: '50000' });
    expect(s.ok).toBe(true);
    expect(openJornada([s.jornada])).toBe(s.jornada);
    expect(closeJornada(s.jornada, { hora: '18:00', odo: '50000' }).ok).toBe(false);
    const c = closeJornada(s.jornada, { hora: '18:00', odo: '50071' });
    expect(jornadaMiles(c.jornada)).toBe(71);
    expect(openJornada([c.jornada])).toBe(null);
    expect(startJornada({ fecha: '2025-03-08', hora: '06:00', vehiculo: 'kia', odo: '' }).ok).toBe(false);
  });

  it('reparte las millas del día por horas, cuadra al centavo y pone el carro', () => {
    const j = closeJornada(startJornada({ fecha: '2025-03-08', hora: '06:00', vehiculo: 'tucson', odo: '50000' }).jornada, { hora: '18:00', odo: '50071' }).jornada;
    const a = turno('2025-03-08', '08:00', '10:00');
    const b = makeShift({ plataforma: 'lyft', vehiculo: 'kia', fecha: '2025-03-08', horaInicio: '12:00', horaFin: '13:00', pago: '20', millas: '' });
    const limpieza = makeShift({ plataforma: 'limpieza', vehiculo: 'kia', fecha: '2025-03-08', millas: '9', local: 'X' });
    const conOdo = turno('2025-03-08', '14:00', '15:00', { odoInicio: '1', odoFin: '11' });
    const otroDia = turno('2025-03-07', '08:00', '10:00', { millas: '33' });
    const rutas = [a, b, limpieza, conOdo, otroDia];
    const out = withJornadaMiles(rutas, [j]);
    expect(out[0]).toMatchObject({ millas: 47.33, vehiculo: 'tucson' });
    expect(out[1]).toMatchObject({ millas: 23.67, vehiculo: 'tucson' });
    expect(out[0].millas + out[1].millas).toBe(71);
    expect(out[2]).toBe(limpieza);
    expect(out[3]).toBe(conOdo);
    expect(out[4]).toBe(otroDia);
    expect(rutas[0].millas).toBe(0); // no reescribe lo guardado
  });

  it('sin jornadas cerradas devuelve lo mismo; la jornada abierta no reparte', () => {
    const rutas = [turno('2025-03-08', '08:00', '10:00')];
    expect(withJornadaMiles(rutas, [])).toBe(rutas);
    const abierta = startJornada({ fecha: '2025-03-08', hora: '06:00', vehiculo: 'kia', odo: '100' }).jornada;
    expect(withJornadaMiles(rutas, [abierta])).toBe(rutas);
  });

  it('la rueda arranca en la última lectura, también de jornadas', () => {
    const j = { vehiculo: 'kia', odoSalida: 900, odoLlegada: 950 };
    expect(lastOdometer('kia', { jornadas: [j] })).toBe(950);
    expect(lastOdometer('tucson', { jornadas: [j] })).toBe(null);
  });
});

describe('gasolina solo con el $', () => {
  it('se guarda sin galones ni odómetro y exige el $', () => {
    expect(validateFuelup({ costo: '' }, []).ok).toBe(false);
    expect(validateFuelup({ costo: '35' }, []).ok).toBe(true);
    const f = makeFuelup({ fecha: '2025-03-08', costo: '35', vehiculo: 'kia' });
    expect(f).toMatchObject({ costo: 35, galones: null, odometro: null });
  });
  it('si el último llenado no tiene odómetro, no hay MPG real', () => {
    const fu = [
      makeFuelup({ fecha: '2025-01-01', galones: 10, odometro: 1000 }),
      makeFuelup({ fecha: '2025-01-10', galones: 10, odometro: 1250 }),
    ];
    expect(realMpg(fu)).toBe(25);
    expect(realMpg([...fu, makeFuelup({ fecha: '2025-01-20', costo: 30 })])).toBe(null);
  });
});

describe('editar horas de la jornada', () => {
  it('pone, cambia y quita «Paré»; valida orden y formato; no toca odómetros', async () => {
    const { editarHorasJornada, horasJornada } = await import('../jornada.js');
    const j = { id: 'j', fecha: '2025-03-08', vehiculo: 'kia', horaSalida: '06:00', odoSalida: 100, horaLlegada: '18:00', odoLlegada: 170 };
    const a = editarHorasJornada(j, { horaSalida: '06:00', horaParada: '14:00', horaLlegada: '18:00' });
    expect(a.ok).toBe(true);
    expect(horasJornada(a.jornada)).toBe(8);
    expect(a.jornada).toMatchObject({ odoSalida: 100, odoLlegada: 170 });
    expect(editarHorasJornada(a.jornada, { horaSalida: '06:00', horaParada: '', horaLlegada: '18:00' }).jornada.horaParada).toBeUndefined();
    expect(editarHorasJornada(j, { horaSalida: '06:00', horaParada: '19:00', horaLlegada: '18:00' }).ok).toBe(false);
    expect(editarHorasJornada(j, { horaSalida: '6am', horaLlegada: '18:00' }).ok).toBe(false);
    const noche = { ...j, horaSalida: '20:00', horaLlegada: '02:00' };
    expect(editarHorasJornada(noche, { horaSalida: '20:00', horaParada: '01:00', horaLlegada: '02:00' }).ok).toBe(true);
    const abierta = { ...j, horaLlegada: '', odoLlegada: null };
    expect(editarHorasJornada(abierta, { horaSalida: '05:30', horaParada: '13:00' }).jornada).toMatchObject({ horaSalida: '05:30', horaParada: '13:00' });
  });
});

describe('pausas (criterios 1–3 de docs/criterios-pausas-gastos-hoy.md)', () => {
  it('1. Paré 9:30, Volví 11:20, Paré 15:00, llegar 15:30 → 6.17 h', async () => {
    const { pararTrabajo, seguirTrabajando, horasJornada } = await import('../jornada.js');
    let j = { id: 'j', fecha: '2026-11-24', horaSalida: '07:00', odoSalida: 100, odoLlegada: null, horaLlegada: '' };
    j = pararTrabajo(j, '09:30');
    j = seguirTrabajando(j, '11:20');
    expect(j.pausas).toEqual([{ desde: '09:30', hasta: '11:20' }]);
    expect(j.horaParada).toBeUndefined();
    j = pararTrabajo(j, '15:00');
    j = { ...j, horaLlegada: '15:30', odoLlegada: 150 };
    expect(horasJornada(j)).toBe(6.17);
  });
  it('2. editar horas: añadir, quitar y validar pausas', async () => {
    const { editarHorasJornada, horasJornada } = await import('../jornada.js');
    const j = { id: 'j', fecha: '2026-11-24', horaSalida: '07:00', odoSalida: 100, odoLlegada: 150, horaLlegada: '15:30' };
    const a = editarHorasJornada(j, { horaSalida: '07:00', horaParada: '15:00', horaLlegada: '15:30', pausas: [{ desde: '09:30', hasta: '11:20' }] });
    expect(a.ok).toBe(true);
    expect(horasJornada(a.jornada)).toBe(6.17);
    expect(editarHorasJornada(a.jornada, { horaSalida: '07:00', horaParada: '15:00', horaLlegada: '15:30', pausas: [] }).jornada.pausas).toEqual([]);
    expect(editarHorasJornada(j, { horaSalida: '07:00', horaLlegada: '15:30', pausas: [{ desde: '11:20', hasta: '09:30' }] }).ok).toBe(false);
    expect(editarHorasJornada(j, { horaSalida: '07:00', horaParada: '15:00', horaLlegada: '15:30', pausas: [{ desde: '15:10', hasta: '15:20' }] }).ok).toBe(false);
    expect(editarHorasJornada(j, { horaSalida: '07:00', horaLlegada: '15:30', pausas: [{ desde: '06:00', hasta: '06:30' }] }).ok).toBe(false);
  });
  it('3. jornadas viejas (sin pausas) dan las mismas horas', async () => {
    const { horasJornada } = await import('../jornada.js');
    expect(horasJornada({ horaSalida: '06:00', horaParada: '14:00', horaLlegada: '18:00' })).toBe(8);
    expect(horasJornada({ horaSalida: '06:00', horaLlegada: '18:00' })).toBe(12);
  });
});

describe('millas de Lyft (criterio 5 de docs/criterios-por-hora-millas-lyft.md)', () => {
  const jor = (odoS, odoL) => [{ id: 'j', fecha: '2026-11-22', vehiculo: 'kia', horaSalida: '08:00', odoSalida: odoS, horaLlegada: '18:00', odoLlegada: odoL }];
  const flex = makeShift({ plataforma: 'flex', vehiculo: 'kia', fecha: '2026-11-22', horaInicio: '08:00', horaFin: '11:00', pago: '60', propina: '0', millas: '' });
  const lyft = { ...makeShift({ plataforma: 'lyft', vehiculo: 'kia', fecha: '2026-11-22', horaInicio: '12:00', horaFin: '17:00', pago: '80', propina: '9', millas: '' }), millasLyft: 86.79 };
  it('Lyft se queda sus millas y Flex el resto', () => {
    const r = withJornadaMiles([flex, lyft], jor(1000, 1120));
    expect(r.find((x) => x.plataforma === 'lyft').millas).toBe(86.79);
    expect(r.find((x) => x.plataforma === 'flex').millas).toBe(33.21);
  });
  it('si Lyft pasa del odómetro, Lyft todo y Flex 0', () => {
    const r = withJornadaMiles([flex, lyft], jor(1000, 1050));
    expect(r.find((x) => x.plataforma === 'lyft').millas).toBe(50);
    expect(r.find((x) => x.plataforma === 'flex').millas).toBe(0);
  });
  it('día solo de Lyft: el odómetro entero es de Lyft', () => {
    const r = withJornadaMiles([lyft], jor(1000, 1120));
    expect(r[0].millas).toBe(120);
  });
});
