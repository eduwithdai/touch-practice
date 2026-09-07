import { MODES } from './modes';

// モードえらび画面。ボタンは画面の高さいっぱいに3等分して、
// どこを押しても選べるくらい大きくとってある。
export default function Menu({ onSelect }) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a1a 100%)',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none', touchAction: 'manipulation',
      overflow: 'hidden',
    }}>
      <h1 style={{
        margin: 0,
        padding: 'clamp(16px, 4vh, 40px) 16px clamp(8px, 2vh, 20px)',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.9)',
        fontSize: 'clamp(22px, 4.5vh, 40px)',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textShadow: '0 0 30px rgba(120,140,255,0.5)',
      }}>
        タッチ れんしゅう
      </h1>

      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        gap: 'clamp(8px, 1.6vh, 18px)',
        padding: '0 clamp(12px, 4vw, 48px) clamp(16px, 4vh, 40px)',
        minHeight: 0,
      }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex', alignItems: 'center',
              gap: 'clamp(12px, 3vw, 28px)',
              padding: '0 clamp(16px, 4vw, 36px)',
              borderRadius: 'clamp(16px, 3vw, 28px)',
              border: `3px solid ${m.accent}88`,
              background: `linear-gradient(135deg, ${m.accent}33, ${m.accent}11)`,
              boxShadow: `0 0 30px ${m.accent}33, inset 0 0 40px ${m.accent}11`,
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 'clamp(32px, 7vh, 64px)', lineHeight: 1 }}>{m.emoji}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{
                fontSize: 'clamp(20px, 4vh, 36px)', fontWeight: 700,
                color: m.accent, letterSpacing: '0.06em',
              }}>
                {m.label}
              </span>
              <span style={{
                fontSize: 'clamp(12px, 2vh, 18px)',
                color: 'rgba(255,255,255,0.6)',
              }}>
                {m.hint}
              </span>
            </span>
          </button>
        ))}
      </div>

      <style>{`
        button:focus-visible {
          outline: 3px solid #fff;
          outline-offset: 3px;
        }
        button:active {
          filter: brightness(1.35);
        }
      `}</style>
    </div>
  );
}
