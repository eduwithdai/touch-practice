import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = ["#FF6B6B","#FF922B","#FFD43B","#69DB7C","#4DABF7","#CC5DE8","#F783AC","#63E6BE"];
const EMOJIS = ["⭐","🌟","💫","✨","🎈","🎉","🌈","❤️","🐱","🐶","🐸","🦋","🌸","🍎","🍊","🌻"];

let idCounter = 0;
function uid() { return ++idCounter; }

// ── Web Audio API サウンドエンジン ──────────────────
function createAudio() {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // 単音：周波数・長さ・波形を指定
  function tone(freq, duration, type = "sine", gainVal = 0.4, delay = 0) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(gainVal, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.05);
  }

  // ポップ音（どこかを触ったとき）
  function pop() {
    const freqs = [523, 659, 784]; // C5 E5 G5
    const f = freqs[Math.floor(Math.random() * freqs.length)];
    tone(f, 0.12, "sine", 0.25);
  }

  // キラキラ上昇音（ターゲットにヒット）
  function sparkle() {
    const scale = [523, 659, 784, 1047, 1319]; // C E G C E
    scale.forEach((f, i) => {
      tone(f, 0.18, "sine", 0.35, i * 0.07);
    });
    // 高音キラキラ
    [2093, 2637, 3136].forEach((f, i) => {
      tone(f, 0.15, "sine", 0.18, 0.28 + i * 0.06);
    });
  }

  // ドラム（バースト時に追加）
  function drum() {
    const c = getCtx();
    const bufSize = c.sampleRate * 0.15;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.5, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    src.connect(gain);
    gain.connect(c.destination);
    src.start();
  }

  return { pop, sparkle, drum };
}

// シングルトン
let audio = null;
function getAudio() {
  if (!audio) audio = createAudio();
  return audio;
}

// ── メインコンポーネント ──────────────────────────
export default function App() {
  const [effects, setEffects] = useState([]);
  const [target, setTarget] = useState(null);
  const [burst, setBurst] = useState(null);
  const [touchCount, setTouchCount] = useState(0);
  const areaRef = useRef(null);
  const targetTimerRef = useRef(null);

  const spawnTarget = useCallback(() => {
    if (!areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const size = 180;
    const pad = size / 2 + 20;
    const x = pad + Math.random() * (rect.width - pad * 2);
    const y = pad + Math.random() * (rect.height - pad * 2);
    setTarget({
      id: uid(),
      x, y,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }, []);

  useEffect(() => {
    targetTimerRef.current = setTimeout(spawnTarget, 600);
    return () => clearTimeout(targetTimerRef.current);
  }, []);

  // 画面のどこかをタッチ
  const handleAreaTouch = useCallback((e) => {
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const id = uid();

    // 音
    getAudio().pop();

    // 波紋
    setEffects(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== id)), 800);
    setTouchCount(c => c + 1);
  }, []);

  // ターゲットをタッチ
  const handleTargetTouch = useCallback((e) => {
    e.stopPropagation();
    if (!target) return;
    const { x, y, color } = target;

    // 音：キラキラ＋ドラム
    getAudio().sparkle();
    getAudio().drum();

    // バースト
    const burstId = uid();
    setBurst({ id: burstId, x, y, color });
    setTimeout(() => setBurst(null), 1000);

    // 周囲8方向に波紋
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 60 + Math.random() * 60;
      const rx = x + Math.cos(angle) * dist;
      const ry = y + Math.sin(angle) * dist;
      const rc = COLORS[Math.floor(Math.random() * COLORS.length)];
      const rid = uid();
      setTimeout(() => {
        setEffects(prev => [...prev, { id: rid, x: rx, y: ry, color: rc }]);
        setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== rid)), 800);
      }, i * 40);
    }

    setTouchCount(c => c + 1);
    setTarget(null);
    clearTimeout(targetTimerRef.current);
    targetTimerRef.current = setTimeout(spawnTarget, 1200);
  }, [target, spawnTarget]);

  return (
    <div
      ref={areaRef}
      onPointerDown={handleAreaTouch}
      style={{
        width: "100vw", height: "100vh", overflow: "hidden",
        background: "radial-gradient(ellipse at center, #1a1a3a 0%, #0a0a1a 100%)",
        position: "relative",
        userSelect: "none",
        touchAction: "none",
        cursor: "crosshair",
      }}
    >
      <BackgroundSparkles />

      {/* 波紋 */}
      {effects.map(ef => (
        <div key={ef.id} style={{
          position: "fixed",
          left: ef.x, top: ef.y,
          width: 80, height: 80,
          borderRadius: "50%",
          background: ef.color + "55",
          border: `3px solid ${ef.color}`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          animation: "rippleOut 0.8s ease-out forwards",
          zIndex: 5,
        }} />
      ))}

      {/* バースト */}
      {burst && (
        <div key={burst.id} style={{
          position: "fixed",
          left: burst.x, top: burst.y,
          width: 300, height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${burst.color}aa 0%, ${burst.color}00 70%)`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          animation: "burstOut 1s ease-out forwards",
          zIndex: 15,
        }} />
      )}

      {/* ターゲット */}
      {target && (
        <div
          key={target.id}
          onPointerDown={handleTargetTouch}
          style={{
            position: "fixed",
            left: target.x, top: target.y,
            width: 180, height: 180,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, ${target.color}ee, ${target.color}88)`,
            boxShadow: `0 0 40px ${target.color}99, 0 0 80px ${target.color}44, inset 0 0 30px rgba(255,255,255,0.2)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 72,
            cursor: "pointer",
            animation: "floatIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275), floatBob 2s ease-in-out 0.4s infinite",
            zIndex: 10,
          }}
        >
          {target.emoji}
        </div>
      )}

      {/* タッチカウント（先生用） */}
      <div style={{
        position: "fixed", bottom: 16, right: 16,
        color: "rgba(255,255,255,0.25)", fontSize: 14,
        fontFamily: "sans-serif", pointerEvents: "none",
        zIndex: 20,
      }}>
        {touchCount}
      </div>

      <style>{`
        @keyframes rippleOut {
          0%   { width:80px;  height:80px;  opacity:1; }
          100% { width:240px; height:240px; opacity:0; }
        }
        @keyframes burstOut {
          0%   { width:150px; height:150px; opacity:1; }
          100% { width:500px; height:500px; opacity:0; }
        }
        @keyframes floatIn {
          from { width:0;   height:0;   opacity:0; }
          to   { width:180px; height:180px; opacity:1; }
        }
        @keyframes floatBob {
          0%,100% { transform:translate(-50%, -58%); }
          50%     { transform:translate(-50%, -42%); }
        }
        @keyframes twinkle {
          0%,100% { opacity:0.2; transform:scale(0.8); }
          50%     { opacity:0.8; transform:scale(1.2); }
        }
        * { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
      `}</style>
    </div>
  );
}

function BackgroundSparkles() {
  const sparkles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
    }))
  ).current;

  return (
    <>
      {sparkles.map(s => (
        <div key={s.id} style={{
          position: "fixed",
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: "50%",
          background: s.color,
          pointerEvents: "none",
          animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          zIndex: 1,
        }} />
      ))}
    </>
  );
}
