import React, { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { T } from '../../lib/theme.js';
import { setOdometerDigit } from '../../lib/odometer.js';

const ROW = 48;
function DigitWheel({ digit, index, muted, onSelect, label }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    const el = ref.current;
    const desired = (10 + Number(digit)) * ROW;
    if (Math.round(el.scrollTop / ROW) % 10 !== Number(digit) || el.scrollTop === 0) el.scrollTop = desired;
  }, [digit]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div ref={ref} role="spinbutton" tabIndex={0}
      aria-label={`${label}, dígito ${index + 1}`} aria-valuemin={0} aria-valuemax={9} aria-valuenow={Number(digit)}
      onKeyDown={(e) => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        onSelect(e.key === 'Home' ? 0 : e.key === 'End' ? 9 : Number(digit) + (e.key === 'ArrowUp' ? 1 : -1));
      }}
      onScroll={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const el = ref.current;
          const n = Math.max(0, Math.min(29, Math.round(el.scrollTop / ROW)));
          el.scrollTop = (10 + n % 10) * ROW;
          if (n % 10 !== Number(digit)) onSelectRef.current(n % 10);
        }, 140);
      }}
      className="odometer-digit gc-code min-w-0 flex-1 text-center rounded-lg"
      style={{ height: ROW * 3, overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain', scrollbarWidth: 'none', touchAction: 'pan-y', backgroundColor: T.surfaceRaised, border: `1px solid ${T.border}`, color: muted ? T.textFaint : T.textPrimary, maskImage: 'linear-gradient(transparent, black 33%, black 67%, transparent)' }}>
      <div style={{ height: ROW }} aria-hidden="true" />
      {Array.from({ length: 30 }, (_, n) => {
        const selected = n % 10 === Number(digit);
        return <div key={n} aria-hidden="true" style={{
          height: ROW, lineHeight: `${ROW}px`, scrollSnapAlign: 'center',
          fontSize: selected ? 36 : 24, fontWeight: selected ? 700 : 400,
          color: selected ? (muted ? T.textSecondary : T.textPrimary) : T.textFaint,
          opacity: selected ? 1 : 0.35,
        }}>{n % 10}</div>;
      })}
      <div style={{ height: ROW }} aria-hidden="true" />
    </div>
  );
}

export default function OdometerWheel({ label, value, onChange, base = '' }) {
  const [typing, setTyping] = useState(false);
  const has = value !== '' && value != null;
  const shown = has ? String(Math.trunc(Number(value) || 0)) : String(Math.trunc(Number(base) || 0));
  const digits = shown.padStart(6, '0').split('');
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase gc-eyebrow" style={{ color: T.textFaint }}>{label}</span>
        <button type="button" onClick={() => setTyping(!typing)} className="flex items-center gap-1 text-[12px] py-2" style={{ color: T.textSecondary }} aria-label={`Escribir ${label}`}>
          <Keyboard size={14} /> {typing ? 'Ruedas' : 'Escribir'}
        </button>
      </div>
      {typing ? (
        <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder={shown}
          className="gc-code w-full mt-1 rounded-lg px-3 py-3 text-[24px] outline-none" style={{ backgroundColor: T.surfaceRaised, color: T.textPrimary, border: `1px solid ${T.border}` }} />
      ) : (
        <div className="relative mt-1">
          <div aria-hidden="true" className="absolute pointer-events-none left-0 right-0 rounded-lg" style={{ top: ROW, height: ROW, zIndex: 1, border: `2px solid ${has ? T.red : T.border}`, boxShadow: `0 0 0 1px ${T.bg}` }} />
          <div className="relative flex gap-1.5">
            {digits.map((d, index) => <DigitWheel key={index} digit={d} index={index} muted={!has} label={label} onSelect={(n) => onChange(setOdometerDigit(shown, index, n))} />)}
          </div>
        </div>
      )}
      {!typing && <>
        <div className="flex justify-between items-center gap-2 mt-2 text-[12px]" style={{ color: T.textSecondary }}>
          <span>{has ? 'Lectura seleccionada' : base !== '' && base != null ? 'Lectura sugerida' : 'Sin lectura seleccionada'}</span>
          {(has || (base !== '' && base != null)) && <output className="gc-code text-[19px] font-semibold" style={{ color: has ? T.textPrimary : T.textFaint }}>{Number(has ? value : base).toLocaleString('en-US')} mi</output>}
        </div>
        <div className="text-[11px] mt-1" style={{ color: T.textFaint }}>Desliza cada número arriba o abajo</div>
      </>}
    </div>
  );
}
