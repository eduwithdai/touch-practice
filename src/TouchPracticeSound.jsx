import { useState, useEffect, useRef, useCallback } from "react";
import { getMode } from "./modes";

const COLORS = ["#FF6B6B","#FF922B","#FFD43B","#69DB7C","#4DABF7","#CC5DE8","#F783AC","#63E6BE"];
const EMOJIS = ["⭐","🌟","💫","✨","🎈","🎉","🌈","❤️","🐱","🐶","🐸","🦋","🌸","🍎","🍊","🌻"];

const EXIT_HOLD_MS = 800; // メニューに戻るのに押し続ける時間

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
export default function App({ mode, onExit }) {
  const cfg = getMode(mode);

  const [effects, setEffects] = useState([]);
  const [target, setTarget] = useState(null);
  const [burst, setBurst] = useState(null);
  // タッチ＝画面にふれた回数（ターゲットに当たった分も含む）
  // せいこう＝ターゲットをさわれた回数
  const [touchCount, setTouchCount] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [holding, setHolding] = useState(false);

  const areaRef = useRef(null);
  const targetTimerRef = useRef(null);
  const targetElRef = useRef(null);
  const holdTimerRef = useRef(null);
  // 動く的の現在位置。毎フレーム書き換えるので state ではなく ref で持つ
  const motionRef = useRef(null);

  const spawnTarget = useCallback(() => {
    if (!areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    // 画面が小さいときは的を縮める（かんたんモードの360pxがはみ出さないように）
    const size = Math.min(cfg.size, Math.min(rect.width, rect.height) * 0.6);
    const pad = size / 2 + 20;
    const x = pad + Math.random() * Math.max(0, rect.width - pad * 2);
    const y = pad + Math.random() * Math.max(0, rect.height - pad * 2);

    // むずかしいモードはランダムな向きに飛ばす
    const angle = Math.random() * Math.PI * 2;
    motionRef.current = {
      x, y, size,
      vx: Math.cos(angle) * cfg.speed,
      vy: Math.sin(angle) * cfg.speed,
    };

    setTarget({
      id: uid(),
      x, y, size,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }, [cfg.size, cfg.speed]);

  useEffect(() => {
    targetTimerRef.current = setTimeout(spawnTarget, 600);
    return () => clearTimeout(targetTimerRef.current);
  }, [spawnTarget]);

  useEffect(() => () => clearTimeout(holdTimerRef.current), []);

  // 的を動かす（むずかしいモードのみ）。壁ではね返る
  useEffect(() => {
    if (!cfg.speed || !target) return;
    let raf = 0;
    let last = performance.now();

    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = motionRef.current;
      const area = areaRef.current;
      if (m && area) {
        const r = m.size / 2 + 10;
        const { width, height } = area.getBoundingClientRect();
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.x < r) { m.x = r; m.vx = Math.abs(m.vx); }
        if (m.x > width - r) { m.x = width - r; m.vx = -Math.abs(m.vx); }
        if (m.y < r) { m.y = r; m.vy = Math.abs(m.vy); }
        if (m.y > height - r) { m.y = height - r; m.vy = -Math.abs(m.vy); }
        const el = targetElRef.current;
        if (el) {
          el.style.left = `${m.x}px`;
          el.style.top = `${m.y}px`;
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, cfg.speed]);

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
    // 動いている的は motionRef が今の位置を持っている
    const m = motionRef.current;
    const x = m ? m.x : target.x;
    const y = m ? m.y : target.y;
    const color = target.color;

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
    setHitCount(c => c + 1);
    setTarget(null);
    motionRef.current = null;
    clearTimeout(targetTimerRef.current);
    targetTimerRef.current = setTimeout(spawnTarget, 1200);
  }, [target, spawnTarget]);

  // メニューに戻る：子どもが偶然さわっても抜けないよう、押し続けたときだけ
  const startHold = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setHolding(true);
    holdTimerRef.current = setTimeout(onExit, EXIT_HOLD_MS);
  }, [onExit]);

  const cancelHold = useCallback((e) => {
    if (e) e.stopPropagation();
    setHolding(false);
    clearTimeout(holdTimerRef.current);
  }, []);

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
          ref={targetElRef}
          onPointerDown={handleTargetTouch}
          style={{
            position: "fixed",
            left: target.x, top: target.y,
            width: target.size, height: target.size,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, ${target.color}ee, ${target.color}88)`,
            boxShadow: `0 0 40px ${target.color}99, 0 0 80px ${target.color}44, inset 0 0 30px rgba(255,255,255,0.2)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: target.size * 0.4,
            cursor: "pointer",
            animation: cfg.bob
              ? "floatIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275), floatBob 2s ease-in-out 0.4s infinite"
              : "floatIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)",
            zIndex: 10,
          }}
        >
          {target.emoji}
        </div>
      )}

      {/* メニューに戻る（先生用・長押し） */}
      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        aria-label="長押しでメニューに戻る"
        style={{
          position: "fixed", left: 16, bottom: 14,
          width: 68, height: 34, borderRadius: 17,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "transparent",
          color: "rgba(255,255,255,0.25)",
          font: "inherit", fontSize: 11, fontFamily: "sans-serif",
          display: "grid", placeItems: "center",
          padding: 0, overflow: "hidden",
          cursor: "pointer", zIndex: 20,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span style={{
          position: "absolute", inset: 0,
          background: "rgba(255,255,255,0.22)",
          transformOrigin: "left center",
          transform: holding ? "scaleX(1)" : "scaleX(0)",
          transition: `transform ${holding ? EXIT_HOLD_MS : 200}ms linear`,
        }} />
        <span style={{ position: "relative" }}>メニュー</span>
      </button>

      {/* モードとカウント（先生用） */}
      <div style={{
        position: "fixed", bottom: 14, right: 16,
        color: "rgba(255,255,255,0.25)", fontSize: 13,
        fontFamily: "sans-serif", pointerEvents: "none",
        textAlign: "right", lineHeight: 1.6,
        fontVariantNumeric: "tabular-nums",
        zIndex: 20,
      }}>
        <div style={{ color: cfg.accent, opacity: 0.55 }}>{cfg.label}</div>
        <div>タッチ {touchCount}</div>
        <div>せいこう {hitCount}</div>
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
        /* 的の大きさがモードで変わるので、幅ではなく scale で出す */
        @keyframes floatIn {
          from { transform:translate(-50%, -50%) scale(0); opacity:0; }
          to   { transform:translate(-50%, -50%) scale(1); opacity:1; }
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
