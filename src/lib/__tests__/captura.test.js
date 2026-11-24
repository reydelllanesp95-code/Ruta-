import { describe, it, expect } from 'vitest';
import { parseFlexText, planFlexImport, applyFlexPlan } from '../captura.js';
import { makeShift } from '../platforms.js';

// Datos sintéticos, ajenos al historial del usuario. Mismo formato que el
// texto que copia el iPhone de la pantalla «Ganancias» de Flex.
const TEXTO = `dom, mar 8
2:00 p.m. - 4:00 p.m.
$70
Base: $40
Consejos: $30
dom, mar 8
Ajuste manual
$5
sáb, mar 7
9:45 a.m. - 11:45 a.m.
$61.25
Base: $40
Consejos: $21.25
sáb, mar 7
12:15 p.m. - 1:00 p.m.
$30.50
Base: $20.50
Consejos: $10`;
const HOY = new Date(2025, 2, 9); // 9-mar-2025

describe('parseFlexText', () => {
  it('lee bloques, ajuste, horas 24 h y totales exactos', () => {
    const r = parseFlexText(TEXTO, HOY);
    expect(r.ok).toBe(true);
    expect(r.items).toEqual([
      { tipo: 'bloque', fecha: '2025-03-08', horaInicio: '14:00', horaFin: '16:00', base: 40, propina: 30, total: 70 },
      { tipo: 'ajuste', fecha: '2025-03-08', base: 5, propina: 0, total: 5 },
      { tipo: 'bloque', fecha: '2025-03-07', horaInicio: '09:45', horaFin: '11:45', base: 40, propina: 21.25, total: 61.25 },
      { tipo: 'bloque', fecha: '2025-03-07', horaInicio: '12:15', horaFin: '13:00', base: 20.5, propina: 10, total: 30.5 },
    ]);
  });
  it('da lo mismo con las columnas separadas y otras grafías', () => {
    const lines = TEXTO.split('\n');
    const izq = lines.filter((l) => !/^\$|^Base|^Consejos/.test(l));
    const der = lines.filter((l) => /^\$|^Base|^Consejos/.test(l));
    const variante = (izq.join('\n') + '\n' + der.join('\n')).replace(/p\.m\./g, 'p. m.').replace(/a\.m\./g, 'AM').replace(/Consejos/g, 'Propinas');
    expect(parseFlexText(variante, HOY).items).toEqual(parseFlexText(TEXTO, HOY).items);
  });
  it('ignora «Pago enviado» y quita repetidos de capturas solapadas', () => {
    const r = parseFlexText(TEXTO + '\nPago enviado\nvie, mar 6\n$400\n' + TEXTO, HOY);
    expect(r.items).toHaveLength(4);
    expect(r.pagos).toEqual([{ fecha: '2025-03-06', total: 400 }]);
  });
  it('no adivina: error si falta un importe o el total no cuadra', () => {
    expect(parseFlexText(TEXTO.replace('$70\n', ''), HOY).ok).toBe(false);
    expect(parseFlexText(TEXTO.replace('$70', '$71'), HOY).ok).toBe(false);
    expect(parseFlexText('hola', HOY).ok).toBe(false);
  });
  it('un mes en el futuro es del año anterior', () => {
    expect(parseFlexText('vie, dic 5\n1:00 p.m. - 2:00 p.m.\n$10\nBase: $10\nConsejos: $0', HOY).items[0].fecha).toBe('2024-12-05');
  });
});

describe('planFlexImport / applyFlexPlan', () => {
  const turno = (fecha, bloques, extra = {}) => makeShift({ plataforma: 'flex', vehiculo: 'kia', fecha, millas: '30', odoInicio: '1000', odoFin: '1030', bloques, nota: 'Fresh', ...extra });
  const rutas = [
    // un turno apuntado que cubre los dos bloques del sábado
    turno('2025-03-07', [{ horaInicio: '09:50', horaFin: '13:05', pago: '60.50', propina: '0' }], { salidaCasa: '09:20', llegadaCasa: '13:30' }),
    // la madrugada del domingo con un extra de otra app metido en la base
    turno('2025-03-08', [{ horaInicio: '14:05', horaFin: '15:50', pago: '52', propina: '30' }]),
  ];
  const items = parseFlexText(TEXTO, HOY).items;

  it('propone propinas, bases, el ajuste, y nunca borra', () => {
    const plan = planFlexImport(items, rutas);
    expect(plan.total).toBe(166.75);
    expect(plan.cambios.map((c) => c.tipo).sort()).toEqual(['actualizar', 'actualizar', 'ajuste']);
    const sab = plan.cambios.find((c) => c.fecha === '2025-03-07');
    expect(sab.bloques[0].despues).toEqual({ pago: 60.5, propina: 31.25 });
    const next = applyFlexPlan(rutas, plan, { vehiculo: 'kia' });
    expect(next).toHaveLength(3);
    const total = next.reduce((s, r) => s + r.ganancia, 0);
    expect(Math.round(total * 100) / 100).toBe(166.75);
    for (const k of ['millas', 'odoInicio', 'odoFin', 'salidaCasa', 'llegadaCasa', 'vehiculo', 'nota', 'horas', 'horasReales']) {
      expect(next[0][k]).toEqual(rutas[0][k]);
    }
  });
  it('crea el bloque que no estaba apuntado', () => {
    const plan = planFlexImport(items, rutas.slice(0, 1));
    const nuevo = plan.cambios.find((c) => c.tipo === 'nuevo');
    expect(nuevo).toMatchObject({ fecha: '2025-03-08', horaInicio: '14:00', horaFin: '16:00', pago: 40, propina: 30 });
    const next = applyFlexPlan(rutas.slice(0, 1), plan, { vehiculo: 'kia' });
    expect(next.find((r) => r.fecha === '2025-03-08' && r.horaInicio === '14:00').ganancia).toBe(70);
  });
  it('aplicar dos veces no cambia nada la segunda', () => {
    const next = applyFlexPlan(rutas, planFlexImport(items, rutas), { vehiculo: 'kia' });
    const plan2 = planFlexImport(items, next);
    expect(plan2.cambios).toEqual([]);
    expect(plan2.sinCambios).toBe(4);
  });
});
