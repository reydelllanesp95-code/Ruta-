import { describe, it, expect } from 'vitest';
import { nextStage, summarizeBlocks } from '../guidedShift.js';
import { makeShift, shiftUpdate } from '../platforms.js';
import { setOdometerDigit } from '../odometer.js';
import { draftHasData, saveDraft, loadDraft } from '../shiftDraft.js';

// Datos sintéticos, ajenos al historial del usuario.
const blocks = [
  { horaInicio: '08:00', horaFin: '09:00', pago: '20', propina: '3' },
  { horaInicio: '10:00', horaFin: '11:30', pago: '30', propina: '2' },
];
const input = { plataforma: 'flex', vehiculo: 'kia', fecha: '2025-01-02', salidaCasa: '07:30', llegadaCasa: '12:00', millas: '40', bloques: blocks };

describe('jornada guiada compatible', () => {
  it('guarda horas, millas y dinero una sola vez, mantiene bloques al editar', () => {
    const s = makeShift(input);
    expect(s.horas).toBe(2.5);
    expect(s.horasReales).toBe(4.5);
    expect(s.ganancia).toBe(55);
    expect(s.millas).toBe(40);
    expect(s.bloques).toHaveLength(2);
    expect(shiftUpdate({ ...input, bloques: [{ ...blocks[0], pago: '25' }, blocks[1]] }).ganancia).toBe(60);
    expect(makeShift({ ...input, bloques: undefined, horaInicio: '08:00', horaFin: '09:00', pago: '20' }).bloques).toBeUndefined();
  });
  it('rechaza bloques solapados, incompletos, fuera de jornada y pagos inválidos', () => {
    for (const b of [
      [{ ...blocks[0], horaFin: '' }],
      [blocks[0], { ...blocks[1], horaInicio: '08:30' }],
      [{ ...blocks[0], horaInicio: '07:00' }],
      [{ ...blocks[0], horaFin: '13:00' }],
      [{ ...blocks[0], pago: '' }],
      [{ ...blocks[0], pago: '-1' }],
      [{ ...blocks[0], horaInicio: '25:00' }],
    ]) expect(() => makeShift({ ...input, bloques: b })).toThrow();
  });
  it('al marcar tarde, el error dice qué hora corregir', () => {
    const b = { horaInicio: '08:00', horaFin: '09:30', pago: '50' };
    const tarde = summarizeBlocks([b], '10:28', '10:28');
    expect(tarde.ok).toBe(false);
    expect(tarde.error).toContain('saliste de casa a las 10:28');
    expect(tarde.error).toContain('Corrige «Salí de casa» o «Llegué a casa»');
    expect(summarizeBlocks([b], '07:30', '09:00').error).toContain('llegaste a las 09:00');
    const solape = summarizeBlocks([blocks[0], { ...blocks[1], horaInicio: '08:30' }], '07:30', '12:00');
    expect(solape.error).toContain('empieza antes de que termine el bloque 1 (09:00)');
    expect(summarizeBlocks([b], '07:30', '10:28').ok).toBe(true);
  });
  it('admite medianoche sin contar pausas como bloque', () => {
    const s = summarizeBlocks([{ horaInicio: '23:30', horaFin: '00:30', pago: '15' }, { horaInicio: '01:00', horaFin: '02:00', pago: '25' }], '23:00', '02:30');
    expect(s.ok).toBe(true); expect(s.horas).toBe(2); expect(s.pago).toBe(40);
  });
  it('avanza por datos existentes sin sobreescribir horas', () => {
    const s = {};
    for (const field of ['salidaCasa', 'horaInicio', 'horaFin', 'llegadaCasa']) {
      expect(nextStage(s).field).toBe(field); s[field] = '08:00';
    }
    expect(nextStage(s)).toBeNull();
  });
  it('ruedas independientes con vuelta 9→0 y 0→9', () => {
    expect(setOdometerDigit('120999', 5, 10)).toBe('120990');
    expect(setOdometerDigit('120000', 5, -1)).toBe('120009');
    expect(setOdometerDigit('120000', 0, 5)).toBe('520000');
  });
  it('no inventa borrador por precarga y conserva borradores antiguos', () => {
    expect(draftHasData({ odoInicio: '100000', editado: false })).toBe(false);
    expect(draftHasData({ odoInicio: '100000' })).toBe(true);
    expect(draftHasData({ odoInicio: '100000', editado: true })).toBe(true);
    let raw;
    const storage = { setItem: (_, v) => { raw = v; }, getItem: () => raw };
    saveDraft({ ...input, bloques: blocks, horaInicio: '', horaFin: '' }, storage);
    expect(loadDraft(storage).bloques).toEqual(blocks);
    expect(draftHasData(loadDraft(storage))).toBe(true);
  });
});
