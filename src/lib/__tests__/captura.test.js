import { describe, it, expect } from 'vitest';
import { parseFlexText, planFlexImport, applyFlexPlan, parseLyftText, readCapture, applyCapture } from '../captura.js';
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
  it('no adivina: deja fuera la fila que no cuadra, avisa y sigue con el resto', () => {
    const r = parseFlexText(TEXTO.replace('$70', '$71'), HOY);
    expect(r.ok).toBe(true);
    expect(r.items).toHaveLength(3);
    expect(r.avisos[0]).toMatch(/8 mar 14:00–16:00.*no lo puse/);
    expect(parseFlexText('hola', HOY).ok).toBe(false);
  });
  it('pantalla de inicio de Flex: saldo, pago programado y propina pendiente', () => {
    const t = 'Saldo actual\n$997.05\nPago programado para el sáb, mar 8\nRetirar dinero\nmarzo\nsáb, mar 8\n6:46 p.m. - 8:23 p.m.\n$48.50\nConsejos pendientes\n' + TEXTO;
    const r = parseFlexText(t, HOY);
    expect(r.items).toHaveLength(5);
    expect(r.items[0]).toMatchObject({ fecha: '2025-03-08', horaInicio: '18:46', base: 48.5, propina: 0, propinaPendiente: true });
    expect(r.avisos).toEqual(['8 mar 18:46–20:23: propina pendiente; la pongo cuando Flex la muestre.']);
  });
  it('propina pendiente no borra una propina ya apuntada', () => {
    const t = 'sáb, mar 8\n2:00 p.m. - 4:00 p.m.\n$40\nConsejos pendientes';
    const ya = makeShift({ plataforma: 'flex', vehiculo: 'kia', fecha: '2025-03-08', millas: '0', bloques: [{ horaInicio: '14:00', horaFin: '16:00', pago: '40', propina: '12' }] });
    expect(planFlexImport(parseFlexText(t, HOY).items, [ya]).cambios).toEqual([]);
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

// ---- Lyft (sintético, mismo formato que «Actividad diaria») ----
const LYFT = `Actividad diaria
sáb 8 de mar
$40.50
$15.25 Lyft
incluye Propina de $3.00 y Bono de $1.00
6:10 p.m.
$0.00 Pasajero cancelado
2:05 p.m.
$2.00 Pasajero cancelado
1:40 p.m.
$23.25 Extra confort
incluye Propina de $4.50
9:30 a.m.`;
const STATS = `$40
Estadísticas de manejo
Semana del mar 2 al 8
Viajes completados 3
Tiempo reservado 2 h 10 min
Kilómetros reservados 30,5 mi
Tiempo conectado 5 h 30 min
$40.50`;

describe('Lyft', () => {
  it('lee el día: total, propinas, viajes y primera/última hora', () => {
    const r = parseLyftText(LYFT, HOY);
    expect(r).toEqual({ ok: true, dias: [{ fecha: '2025-03-08', total: 40.5, propina: 7.5, viajes: 3, horaInicio: '09:30', horaFin: '18:10', horasTrabajo: null, horasFuente: null }], avisos: [] });
  });
  it('con estadísticas usa el tiempo reservado (no el conectado) e ignora sus importes', () => {
    expect(parseLyftText(LYFT + '\n' + STATS, HOY).dias[0].horasTrabajo).toBe(2.17);
    expect(parseLyftText(LYFT + '\n' + STATS.replace(/Tiempo reservado.*\n/, ''), HOY).dias[0].horasTrabajo).toBe(5.5);
  });
  it('columnas separadas dan lo mismo', () => {
    const l = LYFT.split('\n');
    const izq = l.filter((x) => !/\$|incluye|\d:\d\d/.test(x));
    const der = l.filter((x) => /\$|incluye/.test(x));
    const horas = l.filter((x) => /^\d{1,2}:\d\d/.test(x));
    expect(parseLyftText([...izq, ...der, ...horas].join('\n'), HOY).dias).toEqual(parseLyftText(LYFT, HOY).dias);
  });
  it('viajes que suman menos: vale el total del día con aviso; que suman más: no entra', () => {
    const menos = parseLyftText(LYFT.replace('$15.25', '$15.20'), HOY);
    expect(menos.ok).toBe(true);
    expect(menos.dias[0].total).toBe(40.5);
    expect(menos.avisos[0]).toMatch(/usé el total del día/);
    expect(parseLyftText(LYFT.replace('$15.25', '$15.30'), HOY).ok).toBe(false);
  });
  it('un registro por día; actualiza en vez de duplicar; dos veces = 0 cambios', () => {
    const manual = makeShift({ plataforma: 'lyft', vehiculo: 'kia', fecha: '2025-03-08', pago: '15', millas: '20', nota: 'a mano' });
    const r = readCapture(LYFT + '\n' + STATS, [manual], HOY);
    expect(r.plataforma).toBe('lyft');
    expect(r.plan.cambios[0].bloques[0].despues).toEqual({ pago: 33, propina: 7.5 });
    const next = applyCapture('lyft', [manual], r.plan, { vehiculo: 'kia' });
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ ganancia: 40.5, horas: 2.17, millas: 20, nota: 'a mano' });
    expect(readCapture(LYFT + '\n' + STATS, next, HOY).plan.cambios).toEqual([]);
  });
  it('readCapture manda el texto de Flex al lector de Flex', () => {
    expect(readCapture(TEXTO, [], HOY).plataforma).toBe('flex');
  });
});

describe('Lyft: tiempo de la semana', () => {
  it('no se usa si ya hay otro día de Lyft en esa semana', () => {
    const otro = makeShift({ plataforma: 'lyft', vehiculo: 'kia', fecha: '2025-03-04', pago: '10', millas: '0' });
    const r = readCapture(LYFT + '\n' + STATS, [otro], HOY);
    expect(r.plan.cambios[0].horas).toBe(8.67); // 09:30–18:10, no el tiempo de toda la semana
  });
});

describe('Lyft: texto real del iPhone con cortes', () => {
  it('«Bono … de $x» partido por la hora y la pantalla de un cobro no estorban', () => {
    const cobro = `<\n8 de marzo de 2025\nGanancias de viaje\n$30.00\nPropinas\n$7.50\nPago\n$37.50\nIniciado el sábado, 8 de marzo de 2025 a la(s)\n1:29 p.m.\n`;
    const partido = LYFT.replace('incluye Propina de $3.00 y Bono de $1.00\n6:10 p.m.', 'incluye Propina de $3.00 y Bono 6:10 p.m. ›\nde $1.00');
    expect(parseLyftText(cobro + partido, HOY).dias).toEqual(parseLyftText(LYFT, HOY).dias);
  });
});

describe('Lyft: tiempo reservado de otra lectura', () => {
  it('si esta lectura perdió el reservado, lo toma de otra en vez de usar el conectado', () => {
    const sinReservado = STATS.replace(/Tiempo reservado.*\n/, 'Tiempo reservado\n');
    const r = readCapture(LYFT + '\n' + sinReservado, [], HOY, [STATS]);
    expect(r.plan.cambios[0]).toMatchObject({ horas: 2.17, horasFuente: 'tiempo reservado' });
    expect(readCapture(LYFT + '\n' + sinReservado, [], HOY).plan.cambios[0]).toMatchObject({ horas: 5.5, horasFuente: 'tiempo conectado' });
  });
});

describe('Lyft: no confundir etiquetas', () => {
  it('«durante el tiempo reservado» seguido de «Tiempo conectado 5 h» no cuenta como reservado', () => {
    const t = LYFT + '\nKilómetros manejados durante el\ntiempo reservado\nTiempo conectado\n\n5 h 30 min';
    expect(readCapture(t, [], HOY).plan.cambios[0]).toMatchObject({ horas: 5.5, horasFuente: 'tiempo conectado' });
  });
});

describe('Flex: bloque sin propina', () => {
  it('sin Base/Consejos el total es la base; con Base que no cuadra sigue dando error', () => {
    const t = 'sáb, mar 1 $75.50\n12:00 p.m. - 3:30 p.m.\nPagado\n\nvie, feb 28 $82\n9:00 a.m. - 1:00 p.m.\nPagado';
    expect(parseFlexText(t, HOY).items).toEqual([
      { tipo: 'bloque', fecha: '2025-03-01', horaInicio: '12:00', horaFin: '15:30', base: 75.5, propina: 0, total: 75.5 },
      { tipo: 'bloque', fecha: '2025-02-28', horaInicio: '09:00', horaFin: '13:00', base: 82, propina: 0, total: 82 },
    ]);
    expect(parseFlexText('sáb, mar 1\n12:00 p.m. - 3:30 p.m.\n$75.50\nBase: $70', HOY).ok).toBe(false);
  });
});

describe('Lyft: pantalla Diario', () => {
  const DIARIO = `Diario Semana Mes Año
< mar 7  mar 8  mar 9 >
$40.50
$15.25 Lyft
incluye Bono de $1.00
6:10 p.m.
$2.00 Pasajero cancelado
1:40 p.m.
Ver toda la actividad diaria →
Tus estadísticas diarias
ESTADÍSTICAS DE GANANCIAS
19,60 US$
por hora reservada
Saldo de $0.00
Estado del pago`;
  const HOJA = `Estadísticas de manejo
mar 8
Viajes completados 3
Tiempo reservado
Tiempo empleado en manejar para recoger y dejar pasajeros
2 h 10 min
Tiempo conectado
5 h 30 min`;
  it('toma el día del medio, el total grande y las horas reservadas; avisa de las propinas', () => {
    const r = parseLyftText(DIARIO + '\n' + HOJA, HOY);
    expect(r.ok).toBe(true);
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]).toMatchObject({ fecha: '2025-03-08', total: 40.5, propina: 0, horasTrabajo: 2.17 });
    expect(r.avisos.join(' ')).toMatch(/no muestra las propinas/);
  });
  it('después, la Actividad diaria actualiza el mismo registro con las propinas', () => {
    const uno = applyCapture('lyft', [], readCapture(DIARIO + '\n' + HOJA, [], HOY).plan, { vehiculo: 'kia' });
    const dos = readCapture(LYFT, uno, HOY);
    expect(dos.plan.cambios[0].tipo).toBe('actualizar');
    const fin = applyCapture('lyft', uno, dos.plan, { vehiculo: 'kia' });
    expect(fin).toHaveLength(1);
    expect(fin[0]).toMatchObject({ ganancia: 40.5, propina: 7.5 });
  });
});

describe('Lyft: no empeorar lo guardado', () => {
  it('la pantalla Diario no borra propinas ya puestas; la Actividad sin estadísticas no cambia las horas', () => {
    const DIARIO = '< mar 7  mar 8  mar 9 >\n$40.50\n$15.25 Lyft\n6:10 p.m.\nVer toda la actividad diaria\nSaldo de $0.00';
    const conActividad = applyCapture('lyft', [], readCapture(LYFT + '\n' + STATS, [], HOY).plan, { vehiculo: 'kia' });
    expect(readCapture(DIARIO, conActividad, HOY).plan.cambios).toEqual([]);
    const otra = readCapture(LYFT, conActividad, HOY);
    expect(otra.plan.cambios).toEqual([]);
  });
});

describe('Lyft: barra de días con flechas', () => {
  it('ignora los días con flecha («< mar 7», «mar9 >») aunque salgan detrás de una hoja', () => {
    const t = 'Estadísticas de ganancias\nmar 8\n< mar 7\nmar9 >\n$40.50\nmar 8\nTiempo reservado\n2 h 10 min\nVer toda la actividad diaria';
    const r = parseLyftText(t, HOY);
    expect(r.dias.map((d) => d.fecha)).toEqual(['2025-03-08']);
    expect(r.dias[0]).toMatchObject({ total: 40.5, horasTrabajo: 2.17 });
  });
});

describe('millas de Lyft en la captura (criterios 5–6)', () => {
  it('lee «86,79 mi» de la pantalla diaria y lo pasa al registro', async () => {
    const { parseLyftText, planLyftImport, applyLyftPlan } = await import('../captura.js');
    const texto = ['Diario', 'dom 22 de nov', '$89.27', 'Tiempo reservado', 'Tiempo empleado en manejar para', '4 h 6 min', 'recoger y dejar pasajeros',
      'Kilómetros reservados', 'Kilómetros manejados durante el', '86,79 mi', 'tiempo reservado', 'Tiempo conectado', '6h10 min'].join('\n');
    const r = parseLyftText(texto, new Date(2026, 10, 24));
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.dias[0].millasApp).toBe(86.79);
    const plan = planLyftImport(r.dias, []);
    expect(plan.cambios[0].millasLyft).toBe(86.79);
    expect(applyLyftPlan([], plan, { vehiculo: 'kia' })[0].millasLyft).toBe(86.79);
  });
  it('semana con otro día de Lyft: las millas no se asignan a un día', async () => {
    const { planLyftImport } = await import('../captura.js');
    const otro = { ...makeShift({ plataforma: 'lyft', vehiculo: 'kia', fecha: '2026-11-18', pago: '50', propina: '0' }) };
    const d = { fecha: '2026-11-22', total: 89.27, propina: 8.9, viajes: 8, horaInicio: '', horaFin: '', horasTrabajo: 4.1, horasFuente: 'tiempo reservado', millasApp: 86.79, semana: { desde: '2026-11-16', hasta: '2026-11-22' } };
    expect(planLyftImport([d], [otro]).cambios[0].millasLyft).toBe(null);
  });
});
describe('millas en la captura con estadísticas de semana', () => {
  it('«Kilómetros reservados 30,5 mi» con un solo día → 30.5', () => {
    expect(parseLyftText(LYFT + '\n' + STATS, HOY).dias[0].millasApp).toBe(30.5);
  });
});
