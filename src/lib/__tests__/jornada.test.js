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
