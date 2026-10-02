import { useState, useEffect, useRef, useCallback } from "react";
import { getMode } from "./modes";
import HoldButton from "./HoldButton";
import { addRecord } from "./recordStore";

const COLORS = ["#FF6B6B","#FF922B","#FFD43B","#69DB7C","#4DABF7","#CC5DE8","#F783AC","#63E6BE"];
const EMOJIS = ["⭐","🌟","💫","✨","🎈","🎉","🌈","❤️","🐱","🐶","🐸","🦋","🌸","🍎","🍊","🌻"];

const MILESTONE = 10;      // この回数ごとに、ごほうび音を豪華にする
const IDLE_MS = 8000;     // これだけさわらないと呼びかける
const MAX_CALLS = 6;      // 呼びかけの上限。置きっぱなしでも鳴り続けないように

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

  // 10回ごとのごほうび音。かけ上がり＋低音の土台＋最後に和音を重ねる
  function fanfare() {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => {
      tone(f, 0.22, "triangle", 0.3, i * 0.06);
    });
    tone(131, 0.7, "sine", 0.3, 0);     // 低いド
    tone(196, 0.7, "sine", 0.22, 0);    // 低いソ
    [1047, 1319, 1568, 2093].forEach(f => {
      tone(f, 0.9, "triangle", 0.2, 0.46); // 最後のジャーン
    });
    for (let i = 0; i < 8; i++) {
      tone(2093 + Math.random() * 2000, 0.25, "sine", 0.1, 0.52 + i * 0.07);
    }
  }

  // しばらくさわらないときの呼びかけ。おどろかせないようゆっくりめのチャイム
  function attention() {
    [784, 1047, 880, 659].forEach((f, i) => {
      tone(f, 0.5, "sine", 0.28, i * 0.24);
    });
  }

  return { pop, sparkle, drum, fanfare, attention };
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
  const [toast, setToast] = useState(null);
  const [attracting, setAttracting] = useState(false); // 呼びかけ中

  const areaRef = useRef(null);
  const targetTimerRef = useRef(null);
  const targetElRef = useRef(null);
  // 動く的の現在位置。毎フレーム書き換えるので state ではなく ref で持つ
  const motionRef = useRef(null);
  // せいこう数の控え。StrictMode で更新関数が2回走っても音が重ならないよう、
  // 音を鳴らす判定はこちらの ref で行う
  const hitCountRef = useRef(0);
  const lastTouchRef = useRef(0);   // 最後にさわった時刻
  const callCountRef = useRef(0);   // 連続で呼びかけた回数
  const startedRef = useRef(false); // 一度でもさわったか

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

  // 「ほぞんしました」などの短い知らせを自動で消す
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);


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

  const addRipple = useCallback((x, y, color) => {
    const id = uid();
    setEffects(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== id)), 800);
  }, []);

  // さわられたことを控える。呼びかけの時計はここで巻き戻る
  const noteActivity = useCallback(() => {
    startedRef.current = true;
    lastTouchRef.current = Date.now();
    callCountRef.current = 0;
    setAttracting(false);
  }, []);

  // しばらく反応がないときに、音と波紋で注意を引く
  const callAttention = useCallback(() => {
    getAudio().attention();
    setAttracting(true);
    const m = motionRef.current;
    const rect = areaRef.current?.getBoundingClientRect();
    const cx = m ? m.x : (rect ? rect.width / 2 : 0);
    const cy = m ? m.y : (rect ? rect.height / 2 : 0);
    // 的のまわりに輪を広げて、見てほしい場所を示す
    for (let i = 0; i < 3; i++) {
      setTimeout(() => addRipple(cx, cy, COLORS[Math.floor(Math.random() * COLORS.length)]), i * 220);
    }
  }, [addRipple]);

  // 0.5秒ごとに、最後にさわってからの時間を見るだけの軽い見張り
  useEffect(() => {
    const id = setInterval(() => {
      if (!startedRef.current) return;              // 最初のタッチまでは鳴らさない
      if (callCountRef.current >= MAX_CALLS) return; // 呼びかけすぎない
      if (Date.now() - lastTouchRef.current < IDLE_MS) return;
      callCountRef.current += 1;
      lastTouchRef.current = Date.now();
      callAttention();
    }, 500);
    return () => clearInterval(id);
  }, [callAttention]);

  // 画面のどこかをタッチ
  const handleAreaTouch = useCallback((e) => {
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    getAudio().pop();
    addRipple(x, y, color);
    setTouchCount(c => c + 1);
    noteActivity();
  }, [addRipple, noteActivity]);

  // ターゲットをタッチ
  const handleTargetTouch = useCallback((e) => {
    e.stopPropagation();
    if (!target) return;
    // 動いている的は motionRef が今の位置を持っている
    const m = motionRef.current;
    const x = m ? m.x : target.x;
    const y = m ? m.y : target.y;
    const color = target.color;

    // 10回目のせいこうごとに、ごほうび音を豪華にする
    const nextHit = hitCountRef.current + 1;
    hitCountRef.current = nextHit;
    const milestone = nextHit % MILESTONE === 0;

    if (milestone) {
      getAudio().fanfare();
      getAudio().drum();
      setTimeout(() => getAudio().drum(), 460); // 最後のジャーンに合わせてもう一打
    } else {
      getAudio().sparkle();
      getAudio().drum();
    }

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
    setHitCount(nextHit);
    noteActivity();
    setTarget(null);
    motionRef.current = null;
    clearTimeout(targetTimerRef.current);
    targetTimerRef.current = setTimeout(spawnTarget, 1200);
  }, [target, spawnTarget, noteActivity]);

  // いまの回の成績を、日付・レベルといっしょに端末に残す
  const handleSave = useCallback(() => {
    const ok = addRecord({
      at: new Date().toISOString(),
      mode: cfg.id,
      level: cfg.label,
      touch: touchCount,
      hit: hitCount,
    });
    setToast({
      id: uid(),
      text: ok ? "ほぞんしました" : "ほぞんできませんでした",
    });
  }, [cfg.id, cfg.label, touchCount, hitCount]);

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
            animation: [
              "floatIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)",
              cfg.bob && "floatBob 2s ease-in-out 0.4s infinite",
              attracting && "attentionGlow 1.1s ease-in-out infinite",
            ].filter(Boolean).join(", "),
            zIndex: 10,
          }}
        >
          {target.emoji}
        </div>
      )}

      {/* メニューに戻る（先生用・長押し） */}
      <HoldButton
        label="メニュー"
        onHold={onExit}
        style={{ position: "fixed", left: 16, bottom: "calc(14px + var(--copyright-h))", zIndex: 20 }}
      />

      {/* モード・カウント・ほぞん（先生用） */}
      <div style={{
        position: "fixed", bottom: "calc(14px + var(--copyright-h))", right: 16, zIndex: 20,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
        pointerEvents: "none", // 数字の余白でタッチを止めない
      }}>
        <div style={{
          color: "rgba(255,255,255,0.25)", fontSize: 13,
          fontFamily: "sans-serif",
          textAlign: "right", lineHeight: 1.6,
          fontVariantNumeric: "tabular-nums",
        }}>
          <div style={{ color: cfg.accent, opacity: 0.55 }}>{cfg.label}</div>
          <div>タッチ {touchCount}</div>
          <div>せいこう {hitCount}</div>
        </div>
        <HoldButton
          label="ほぞん"
          onHold={handleSave}
          style={{ pointerEvents: "auto" }}
        />
      </div>

      {/* ほぞんの知らせ */}
      {toast && (
        <div key={toast.id} style={{
          position: "fixed", left: "50%", bottom: "calc(70px + var(--copyright-h))",
          transform: "translateX(-50%)",
          padding: "9px 20px", borderRadius: 18,
          background: "rgba(255,255,255,0.13)",
          border: "1px solid rgba(255,255,255,0.22)",
          color: "rgba(255,255,255,0.8)", fontSize: 13,
          fontFamily: "sans-serif", whiteSpace: "nowrap",
          pointerEvents: "none", zIndex: 25,
          animation: "toastIn 0.25s ease-out",
        }}>
          {toast.text}
        </div>
      )}

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
        @keyframes toastIn {
          from { opacity:0; transform:translateX(-50%) translateY(8px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        /* 呼びかけ中の明滅。transform ではなく filter を動かすので
           floatBob と同時にかけても打ち消し合わない */
        @keyframes attentionGlow {
          0%,100% { filter:brightness(1); }
          50%     { filter:brightness(1.7); }
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
