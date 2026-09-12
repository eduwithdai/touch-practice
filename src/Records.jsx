import { useState } from 'react';
import HoldButton from './HoldButton';
import { loadRecords, clearRecords, formatStamp } from './recordStore';
import { getMode } from './modes';

// 保存したきろくの一覧（先生用）。メニュー画面の上にかぶせて出す。
export default function Records({ onClose }) {
  const [records, setRecords] = useState(() => loadRecords());

  const handleClear = () => {
    clearRecords();
    setRecords([]);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      background: '#07071a',
      display: 'flex', flexDirection: 'column',
      padding: 'clamp(14px, 3vh, 28px) clamp(12px, 4vw, 48px)',
      fontFamily: 'sans-serif', color: 'rgba(255,255,255,0.85)',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 14, flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(16px, 2.4vh, 22px)', letterSpacing: '0.08em' }}>
          きろく <span style={{ opacity: 0.45, fontSize: '0.8em' }}>{records.length}けん</span>
        </h2>
        <button
          onClick={onClose}
          style={{
            border: '1px solid rgba(255,255,255,0.3)', borderRadius: 18,
            background: 'transparent', color: 'rgba(255,255,255,0.75)',
            font: 'inherit', fontSize: 13, padding: '8px 20px', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          とじる
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
        {records.length === 0 ? (
          <p style={{ opacity: 0.5, fontSize: 14, margin: '24px 0' }}>
            まだ ありません。れんしゅうのあと、右下の「ほぞん」を長押しすると残ります。
          </p>
        ) : (
          <table style={{
            width: '100%', borderCollapse: 'separate', borderSpacing: 0,
            fontSize: 'clamp(12px, 1.7vh, 15px)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <thead>
              <tr style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>
                <th style={th}>日づけ</th>
                <th style={th}>レベル</th>
                <th style={{ ...th, textAlign: 'right' }}>タッチ</th>
                <th style={{ ...th, textAlign: 'right' }}>せいこう</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={`${r.at}-${i}`}>
                  <td style={td}>{formatStamp(r.at)}</td>
                  <td style={{ ...td, color: getMode(r.mode).accent, opacity: 0.85 }}>{r.level}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.touch}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.hit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {records.length > 0 && (
        <footer style={{
          flexShrink: 0, paddingTop: 12, marginTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ fontSize: 11, opacity: 0.4 }}>
            この端末のブラウザだけに残ります
          </span>
          <HoldButton
            label="ぜんぶ消す"
            onHold={handleClear}
            style={{ width: 88, color: 'rgba(255,150,150,0.65)', borderColor: 'rgba(255,120,120,0.35)' }}
            fill="rgba(255,110,110,0.3)"
          />
        </footer>
      )}
    </div>
  );
}

const th = {
  padding: '6px 8px', fontWeight: 500, whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 1, // スクロールしても見出しを残す
  background: '#07071a',
  borderBottom: '1px solid rgba(255,255,255,0.14)',
};
const td = {
  padding: '8px', whiteSpace: 'nowrap',
  borderTop: '1px solid rgba(255,255,255,0.09)',
};
