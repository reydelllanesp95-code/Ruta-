import { describe, it, expect } from 'vitest';
import { resumenRango, gasolinaRango, gasPorMilla } from '../resumen.js';
import { netaMeta } from '../meta.js';
import { routeEconomics } from '../earnings.js';
import { makeShift } from '../platforms.js';

// Criterios de docs/criterios-gasolina-pagada.md. Datos sintéticos.
const t = (fecha, millas, pago = 100) =>
  makeShift({ plataforma: 'flex', vehiculo: 'kia', fecha, horaInicio: '08:00', horaFin: '10:00', pago: String(pago), propina: '0', millas: String(millas) });

// Semana lun 2025-03-03 → dom 2025-03-09.
const datos = {
  routes: [t('2025-03-03', 60), t('2025-03-04', 40)],
  fuelups: [{ fecha: '2025-03-05', costo: 100 }],
};

describe('gasolina pagada', () => {
  it('1. semana/mes: resta lo pagado en el rango', () => {
    expect(resumenRango(datos, '2025-03-03', '2025-03-09').deducciones.gasolina).toBe(100);
    expect(resumenRango(datos, '2025-03-01', '2025-03-31').deducciones.gasolina).toBe(100);
    // Semana que cruza meses: lun 31 mar → dom 6 abr, $50, 30 mi en marzo y 20 en abril.
    const cruza = { routes: [t('2025-03-31', 30), t('2025-04-02', 20)], fuelups: [{ fecha: '2025-04-01', costo: 50 }] };
    expect(gasolinaRango(cruza, '2025-03-01', '2025-03-31')).toBe(30);
    expect(gasolinaRango(cruza, '2025-04-01', '2025-04-30')).toBe(20);
  });
  it('2. día: $100, 60 mi lunes y 40 mi martes → $60 y $40; suma = semana', () => {
    const lun = resumenRango(datos, '2025-03-03', '2025-03-03').deducciones.gasolina;
    const mar = resumenRango(datos, '2025-03-04', '2025-03-04').deducciones.gasolina;
    expect([lun, mar]).toEqual([60, 40]);
    expect(resumenRango(datos, '2025-03-05', '2025-03-05').deducciones.gasolina).toBe(0);
    expect(lun + mar).toBe(100);
    // Cada turno: $ por milla de su semana.
    const cfg = { mpg: 1, gas_price: gasPorMilla(datos, '2025-03-03'), maintenance_cost_per_mile: 0 };
    expect(routeEconomics(datos.routes[0], cfg).fuel_cost).toBe(60);
  });
  it('3. semana sin millas: 1/7 por día', () => {
    const sin = { routes: [t('2025-03-03', 0)], fuelups: [{ fecha: '2025-03-05', costo: 70 }] };
    expect(gasolinaRango(sin, '2025-03-03', '2025-03-03')).toBe(10);
    expect(gasolinaRango(sin, '2025-03-03', '2025-03-09')).toBe(70);
  });
  it('4. la barra resta peajes: $800 − $150 − $20 = $630', () => {
    const d = {
      routes: [t('2025-03-03', 0, 500), t('2025-03-04', 0, 300)],
      fuelups: [{ fecha: '2025-03-03', costo: 100 }],
      maints: [{ fecha: '2025-03-05', costo: 30 }],
      meals: [{ fecha: '2025-03-04', costo: 20 }],
      tolls: [{ fecha: '2025-03-04', monto: 20 }],
    };
    const n = netaMeta(d, '2025-03-03', '2025-03-09');
    expect(n.gastos.peajes).toBe(20);
    expect(n.neta).toBe(630);
  });
});
