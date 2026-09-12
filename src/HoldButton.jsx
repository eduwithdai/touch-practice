import { useState, useRef, useCallback, useEffect } from 'react';

export const HOLD_MS = 800; // 押し続ける時間

// 先生用のボタンはすべて長押しにしてある。
// 子どもが画面を連打しても、偶然押されて画面が変わってしまわないようにするため。
// 押しているあいだ、下地が左から右へ伸びて進みぐあいを見せる。
export default function HoldButton({ label, onHold, ms = HOLD_MS, style, fill }) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const start = useCallback((e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    clearTimeout(timerRef.current);
    setHolding(true);
    timerRef.current = setTimeout(() => {
      setHolding(false);
      onHold();
    }, ms);
  }, [onHold, ms]);

  const cancel = useCallback((e) => {
    if (e) e.stopPropagation();
    clearTimeout(timerRef.current);
    setHolding(false);
  }, []);

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      aria-label={`長押しで${label}`}
      style={{
        position: 'relative',
        width: 68, height: 34, borderRadius: 17,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'transparent',
        color: 'rgba(255,255,255,0.25)',
        font: 'inherit', fontSize: 11, fontFamily: 'sans-serif',
        display: 'grid', placeItems: 'center',
        padding: 0, overflow: 'hidden',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <span style={{
        position: 'absolute', inset: 0,
        background: fill || 'rgba(255,255,255,0.22)',
        transformOrigin: 'left center',
        transform: holding ? 'scaleX(1)' : 'scaleX(0)',
        transition: `transform ${holding ? ms : 200}ms linear`,
      }} />
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}
