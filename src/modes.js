// 3つの難易度。的の大きさ・動き方だけが違う。
//
//   size  : 的の直径(px)。画面が小さいときは spawnTarget 側で縮める
//   bob   : その場でふわふわ上下するか
//   speed : 画面を動き回る速さ(px/秒)。0 なら動かない

// メニューに出る3つ
export const MODES = [
  {
    id: 'easy',
    label: 'かんたん',
    hint: '大きな まとが じっとしています',
    emoji: '🐢',
    accent: '#69DB7C',
    size: 360,
    bob: false,
    speed: 0,
  },
  {
    id: 'normal',
    label: 'ふつう',
    hint: 'まとが ふわふわ うごきます',
    emoji: '⭐',
    accent: '#4DABF7',
    size: 180,
    bob: true,
    speed: 0,
  },
  {
    id: 'hard',
    label: 'むずかしい',
    hint: 'まとが 画面を とびまわります',
    emoji: '🚀',
    accent: '#FF922B',
    size: 180,
    bob: false,
    speed: 150,
  },
];

// メニューには出さない裏モード。
// タイトルを5回つづけてタップすると始まる（Menu.jsx）。
export const HIDDEN_MODES = [
  {
    id: 'oni',
    label: 'おに',
    hint: '小さな まとが とんでもない速さで とびまわります',
    emoji: '👹',
    accent: '#FF5252',
    size: 90,   // ふつうの半分（かんたんが2倍なのに合わせた）
    bob: false,
    speed: 450, // むずかしいの3倍
  },
];

export const ONI = HIDDEN_MODES[0];

export const DEFAULT_MODE = 'normal';

const ALL_MODES = [...MODES, ...HIDDEN_MODES];

export function getMode(id) {
  return ALL_MODES.find(m => m.id === id) || ALL_MODES.find(m => m.id === DEFAULT_MODE);
}
