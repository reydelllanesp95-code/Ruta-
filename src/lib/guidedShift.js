// Bloques de una jornada (<24 h), sin duplicar viajes ni costos.
import { round2, validateNonNegative } from './earnings.js';

export function minutes(hhmm) {
  if (!/^\d{2}:\d{2}$/.test(hhmm || '')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h < 24 && m < 60 ? h * 60 + m : null;
}

export function nextStage({ salidaCasa, horaInicio, horaFin, llegadaCasa }) {
  if (llegadaCasa) return null;
  if (!salidaCasa) return { field: 'salidaCasa', label: 'Salí de casa' };
  if (!horaInicio) return { field: 'horaInicio', label: 'Empezar bloque' };
  if (!horaFin) return { field: 'horaFin', label: 'Terminar bloque' };
  return { field: 'llegadaCasa', label: 'Llegué a casa' };
}

// Dice qué hora hay que corregir, porque lo normal es haber marcado algo tarde.
function blockError(index, b, previous, overlaps, salidaCasa, llegadaCasa) {
  const name = `El bloque ${index + 1} (${b.horaInicio}–${b.horaFin})`;
  if (overlaps) return `${name} empieza antes de que termine el bloque ${index} (${previous.horaFin}). Corrige uno de los dos.`;
  if (!salidaCasa) return `${name} no cuadra con los otros bloques (máximo 24 h).`;
  const llegada = llegadaCasa ? ` y llegaste a las ${llegadaCasa}` : '';
  return `${name} queda fuera de tu jornada: saliste de casa a las ${salidaCasa}${llegada}. Corrige «Salí de casa»${llegadaCasa ? ' o «Llegué a casa»' : ''}.`;
}

export function summarizeBlocks(blocks, salidaCasa = '', llegadaCasa = '') {
  if (!Array.isArray(blocks) || !blocks.length) return { ok: false, error: 'Añade al menos un bloque.' };
  const origin = minutes(salidaCasa || blocks[0].horaInicio);
  const end = llegadaCasa ? minutes(llegadaCasa) : null;
  if (origin == null || (llegadaCasa && end == null)) return { ok: false, error: 'Las horas de la jornada no son válidas.' };
  const offset = (m) => (m - origin + 1440) % 1440;
  const limit = end == null ? 1439 : offset(end);
  let previousEnd = 0, totalMinutes = 0, pago = 0, propina = 0;
  const normalized = [];
  for (const [index, b] of blocks.entries()) {
    const start = minutes(b.horaInicio), finish = minutes(b.horaFin);
    if (start == null || finish == null || start === finish) return { ok: false, error: `Completa las horas del bloque ${index + 1}.` };
    const a = offset(start), z = offset(finish);
    if (a < previousEnd || z <= a || z > limit) return { ok: false, error: blockError(index, b, blocks[index - 1], a < previousEnd && a <= limit, salidaCasa, llegadaCasa) };
    if (b.pago === '' || b.pago == null) return { ok: false, error: `Escribe el pago del bloque ${index + 1}.` };
    const p = validateNonNegative(b.pago, 'El pago'), t = validateNonNegative(b.propina, 'La propina');
    if (!p.ok || !t.ok) return { ok: false, error: p.error || t.error };
    normalized.push({ horaInicio: b.horaInicio, horaFin: b.horaFin, pago: p.value, propina: t.value });
    totalMinutes += z - a; previousEnd = z; pago += p.value; propina += t.value;
  }
  return { ok: true, bloques: normalized, horas: round2(totalMinutes / 60), pago: round2(pago), propina: round2(propina), horaInicio: blocks[0].horaInicio, horaFin: blocks[blocks.length - 1].horaFin };
}
