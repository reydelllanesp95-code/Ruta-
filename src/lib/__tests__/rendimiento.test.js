import { describe, it, expect } from 'vitest';
import { rendimiento } from '../rendimiento.js';
import { makeShift } from '../platforms.js';

// Criterios 1–4 de docs/criterios-por-hora-millas-lyft.md. Datos sintéticos.
const b = (fecha, ini, fin, pago, millas = '') =>
  makeShift({ plataforma: 'flex', vehiculo: 'kia', fecha, horaInicio: ini, horaFin: fin, pago: String(pago), propina: '0', millas: String(millas) });
const celda = (r, tabla, id, app = 'flex') => r[tabla].find((x) => x.id === id).porApp[app];

describe('ganancia por hora', () => {
  it('1. martes 8–11 de $90 → Martes y Mañana a $30/h', () => {
    const r = rendimiento({ routes: [b('2026-11-17', '08:00', '11:00', 90)] }, '2026-11-24');
    expect(celda(r, 'porDia', 2).porHora).toBe(30);
    expect(celda(r, 'porFranja', 'manana').porHora).toBe(30);
    expect(celda(r, 'porFranja', 'tarde')).toBe(null);
  });
  it('2. 10–14 de $100 se reparte por minutos entre mañana y tarde', () => {
    const r = rendimiento({ routes: [b('2026-11-17', '10:00', '14:00', 100)] }, '2026-11-24');
    expect(celda(r, 'porFranja', 'manana')).toEqual({ horas: 2, ganado: 50, porHora: 25 });
    expect(celda(r, 'porFranja', 'tarde')).toEqual({ horas: 2, ganado: 50, porHora: 25 });
  });
  it('3. después de gasolina: $90 − $20 en 3 h → $23.33/h', () => {
    const cfg = { mpg: 1, gas_price: 0.5, maintenance_cost_per_mile: 0 }; // 40 mi · $0.50 = $20
    const r = rendimiento({ routes: [b('2026-11-17', '08:00', '11:00', 90, 40)], configFor: () => cfg }, '2026-11-24');
    expect(celda(r, 'porDia', 2).porHora).toBe(23.33);
  });
  it('4. 8 semanas hasta el periodo; menos de 1 h → sin $/h', () => {
    const r = rendimiento({ routes: [b('2026-09-01', '08:00', '11:00', 90), b('2026-11-18', '08:00', '08:30', 20)] }, '2026-11-24');
    expect(celda(r, 'porDia', 2)).toBe(null); // el 1-sep queda fuera
    expect(celda(r, 'porDia', 3)).toEqual({ horas: 0.5, ganado: 20, porHora: null });
    expect(r.desde).toBe('2026-09-30'); // 24-nov − 55 días
  });
});
