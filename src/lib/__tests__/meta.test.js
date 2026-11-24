import { describe, it, expect } from 'vitest';
import { tramoMeta, netaMeta, historialMeta, UMBRALES_DEFAULT } from '../meta.js';
import { makeShift } from '../platforms.js';

// Datos sintéticos, ajenos al historial del usuario.
const turno = (fecha, pago, propina = 0, plataforma = 'flex') =>
  makeShift({ plataforma, vehiculo: 'kia', fecha, horaInicio: '08:00', horaFin: '10:00', pago: String(pago), propina: String(propina), millas: '' });

describe('criterios de la barra de meta', () => {
  it('1. $800 − $150 = $650 → tramo 2, «Te faltan $50 para invertir»', () => {
    const datos = {
      routes: [turno('2025-03-03', 500), turno('2025-03-04', 300)], // lun y mar
      fuelups: [{ fecha: '2025-03-03', costo: 100 }],
      maints: [{ fecha: '2025-03-05', costo: 30 }],
      meals: [{ fecha: '2025-03-04', costo: 20 }],
    };
    const n = netaMeta(datos, '2025-03-03', '2025-03-09');
    expect(n.neta).toBe(650);
    const t = tramoMeta(n.neta, UMBRALES_DEFAULT);
    expect(t.n).toBe(2);
    expect(t.texto).toMatch(/Te faltan \$50(\.00)? para invertir/);
    expect(t.texto).toMatch(/Llevas \$400(\.00)? para tarjetas/);
  });
  it('2. neta exactamente $700 → tramo 3', () => {
    expect(tramoMeta(700, UMBRALES_DEFAULT).n).toBe(3);
    expect(tramoMeta(699.99, UMBRALES_DEFAULT).n).toBe(2);
    expect(tramoMeta(900, UMBRALES_DEFAULT).n).toBe(4);
    expect(tramoMeta(249.99, UMBRALES_DEFAULT).n).toBe(1);
  });
  it('3. el lunes la barra vuelve a $0 y la semana anterior queda en el historial', () => {
    const datos = { routes: [turno('2025-03-09', 400)] }; // domingo
    expect(netaMeta(datos, '2025-03-10', '2025-03-16').neta).toBe(0); // lunes siguiente
    const h = historialMeta(datos, '2025-03-10', UMBRALES_DEFAULT, 8);
    expect(h).toHaveLength(8);
    expect(h[h.length - 1]).toMatchObject({ desde: '2025-03-10', neta: 0 });
    expect(h[h.length - 2]).toMatchObject({ desde: '2025-03-03', neta: 400, tramo: 2 });
  });
  it('4. cambiar un umbral recalcula el tramo', () => {
    expect(tramoMeta(650, UMBRALES_DEFAULT).n).toBe(2);
    expect(tramoMeta(650, { ...UMBRALES_DEFAULT, invertir: 600 }).n).toBe(3);
  });
  it('5. una propina pendiente no cuenta hasta registrarse; se cuentan las «por llegar»', () => {
    const sin = { routes: [turno('2025-03-08', 43, 0)] };
    const n1 = netaMeta(sin, '2025-03-03', '2025-03-09', '2025-03-09');
    expect(n1.neta).toBe(43);
    expect(n1.porLlegar).toBe(1);
    const con = { routes: [turno('2025-03-08', 43, 25)] };
    const n2 = netaMeta(con, '2025-03-03', '2025-03-09', '2025-03-09');
    expect(n2.neta).toBe(68);
    expect(n2.porLlegar).toBe(0);
  });
});

describe('textos, reparto y colores', () => {
  it('tramos 1, 3 y 4 con su frase y su reparto (95/5)', () => {
    expect(tramoMeta(100, UMBRALES_DEFAULT).texto).toMatch(/Te faltan \$150(\.00)? para cubrir lo básico/);
    const t3 = tramoMeta(750, UMBRALES_DEFAULT);
    expect(t3.texto).toMatch(/\$350(\.00)? a deuda y \$100(\.00)? a invertir.*Te faltan \$150(\.00)? para el extra/);
    expect(t3.reparto).toMatchObject({ deuda: 350, inversion: 100, largoPlazo: 95, trading: 5, extra: 0 });
    const t4 = tramoMeta(950, UMBRALES_DEFAULT);
    expect(t4.texto).toMatch(/Semana dorada: \$250(\.00)? extra/);
    expect(t4.reparto).toMatchObject({ deuda: 350, inversion: 100, extra: 250 });
    expect(tramoMeta(-20, UMBRALES_DEFAULT).n).toBe(1);
  });
  it('no cuenta limpiezas ni gastos fuera de la semana', () => {
    const datos = {
      routes: [turno('2025-03-04', 100), makeShift({ plataforma: 'limpieza', vehiculo: 'kia', fecha: '2025-03-04', millas: '5', local: 'X' })],
      fuelups: [{ fecha: '2025-03-02', costo: 40 }],
    };
    expect(netaMeta(datos, '2025-03-03', '2025-03-09').neta).toBe(100);
  });
});
