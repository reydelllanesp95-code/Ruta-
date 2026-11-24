import { describe, it, expect } from 'vitest';
import { periodo, moverPeriodo, resumenRango, resumenPeriodo, resumenDia, propinasPendientes, filasAño } from '../resumen.js';
import { makeShift } from '../platforms.js';

// Datos sintéticos, ajenos al historial del usuario.
const cfg = { gas_price: 4, mpg: 20, maintenance_cost_per_mile: 0.1 };
const t = (fecha, plataforma, pago, propina, millas, horaInicio = '08:00', horaFin = '10:00') =>
  makeShift({ plataforma, vehiculo: 'kia', fecha, horaInicio, horaFin, pago: String(pago), propina: String(propina), millas: String(millas) });
const routes = [
  t('2025-03-08', 'flex', 40, 10, 50), // sáb: semana 8–14
  t('2025-03-09', 'lyft', 30, 5, 20, '12:00', '13:00'),
  t('2025-03-03', 'flex', 40, 0, 40), // semana anterior 1–7
  makeShift({ plataforma: 'limpieza', vehiculo: 'kia', fecha: '2025-03-08', millas: '30', local: 'X' }),
];
const datos = {
  routes,
  meals: [{ fecha: '2025-03-08', costo: 7.5 }],
  tolls: [{ fecha: '2025-03-09', monto: 2.25 }],
  fuelups: [{ fecha: '2025-03-09', costo: 30 }],
  maints: [{ fecha: '2025-02-01', costo: 60 }],
  configFor: () => cfg,
};

describe('periodos', () => {
  it('semana de pago sáb–vie, mes y año; moverse', () => {
    const s = periodo('semana', '2025-03-10', 6);
    expect(s).toMatchObject({ desde: '2025-03-08', hasta: '2025-03-14' });
    expect(moverPeriodo(s, -1, 6)).toMatchObject({ desde: '2025-03-01', hasta: '2025-03-07' });
    expect(periodo('mes', '2025-02-10')).toMatchObject({ desde: '2025-02-01', hasta: '2025-02-28' });
    expect(moverPeriodo(periodo('mes', '2025-01-10'), -1)).toMatchObject({ desde: '2024-12-01', hasta: '2024-12-31' });
    expect(periodo('año', '2025-06-01')).toMatchObject({ desde: '2025-01-01', hasta: '2025-12-31' });
  });
});

describe('resumenRango', () => {
  it('Ganado − (gas + mant + comida + peajes) = Neto, sin limpiezas', () => {
    const r = resumenRango(datos, '2025-03-08', '2025-03-14');
    expect(r.ganado).toBe(85);
    expect(r.millas).toBe(70);
    // Gasolina PAGADA (decisión de Rey, 24-nov-2026): $30 de la semana lun 3–dom 9,
    // que tiene 110 mi de reparto; a este rango le tocan 70 → 30·70/110 = 19.09.
    // mant: 7; comida 7.5; peajes 2.25
    expect(r.deducciones).toEqual({ gasolina: 19.09, mantenimiento: 7, comida: 7.5, peajes: 2.25, total: 35.84 });
    expect(r.neto).toBe(49.16);
    expect(r.horas).toBe(3);
    expect(r.netoHora).toBe(16.39);
    expect(r.gasolinaPagada).toBe(30);
    expect(r.porApp.map((a) => [a.plataforma, a.ganado])).toEqual([['flex', 50], ['lyft', 35]]);
  });
  it('compara con el periodo anterior y da la serie', () => {
    const p = periodo('semana', '2025-03-10', 6);
    const r = resumenPeriodo(datos, p, 6, 3);
    expect(r.anterior.ganado).toBe(40);
    expect(r.serie.map((s) => s.neto)).toEqual([0, 25.09, 49.16]); // 40 − 30·40/110 − 40*0.1
  });
  it('día: registros en orden, incluida la limpieza', () => {
    const d = resumenDia(datos, '2025-03-08');
    expect(d.ganado).toBe(50);
    expect(d.lista).toHaveLength(2);
  });
});

describe('propinas pendientes y año', () => {
  it('Flex de los últimos 3 días con propina 0, sin hoy', () => {
    const rs = [t('2025-03-07', 'flex', 40, 0, 0), t('2025-03-08', 'flex', 40, 5, 0), t('2025-03-10', 'flex', 40, 0, 0), t('2025-03-03', 'flex', 40, 0, 0)];
    expect(propinasPendientes(rs, '2025-03-10').map((r) => r.fecha)).toEqual(['2025-03-07']);
  });
  it('filas del año para el contador', () => {
    const { filas, resumen } = filasAño(datos, 2025);
    expect(resumen.ganado).toBe(125);
    expect(filas).toContainEqual(['mantenimiento pagado', '60.00']);
    expect(filas).toContainEqual(['millas de trabajo', '110.0']);
  });
});

describe('horas con jornada y «paré de trabajar»', () => {
  const base = { routes: [t('2025-03-08', 'flex', 40, 0, 0, '08:00', '11:00')], configFor: () => cfg };
  const j = { id: 'j', fecha: '2025-03-08', vehiculo: 'kia', horaSalida: '06:00', odoSalida: 1, horaLlegada: '18:00', odoLlegada: 2 };
  it('paré 14:00 → 8 h; sin paré → 12 h; sin jornada → 3 h', async () => {
    const { pararTrabajo, seguirTrabajando } = await import('../jornada.js');
    expect(resumenRango({ ...base, jornadas: [pararTrabajo(j, '14:00')] }, '2025-03-08', '2025-03-08').horas).toBe(8);
    expect(resumenRango({ ...base, jornadas: [seguirTrabajando(pararTrabajo(j, '14:00'))] }, '2025-03-08', '2025-03-08').horas).toBe(12);
    expect(resumenRango(base, '2025-03-08', '2025-03-08').horas).toBe(3);
  });
  it('cruza medianoche', async () => {
    const { horasJornada } = await import('../jornada.js');
    expect(horasJornada({ horaSalida: '20:00', horaParada: '01:30' })).toBe(5.5);
    expect(horasJornada({ horaSalida: '06:00' })).toBe(null);
  });
});

describe('día en Resumen', () => {
  it('periodo día y moverse', async () => {
    const p = periodo('día', '2025-03-01');
    expect(p).toMatchObject({ desde: '2025-03-01', hasta: '2025-03-01', label: 'Sábado 1 mar' });
    expect(moverPeriodo(p, -1)).toMatchObject({ desde: '2025-02-28', label: 'Viernes 28 feb' });
  });
  it('promedio por día trabajado de las 4 semanas previas', async () => {
    const { promedioDia } = await import('../resumen.js');
    const d = { routes: [t('2025-03-01', 'flex', 100, 0, 0), t('2025-03-05', 'flex', 200, 0, 0), t('2025-03-20', 'flex', 50, 0, 0)], configFor: () => cfg };
    const p = promedioDia(d, '2025-03-20');
    expect(p.dias).toBe(2);
    expect(p.ganado).toBe(150);
    expect(p.horas).toBe(2);
  });
});
