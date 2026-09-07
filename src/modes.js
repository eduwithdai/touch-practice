// 3つの難易度。的の大きさ・動き方だけが違う。
//
//   size  : 的の直径(px)。画面が小さいときは spawnTarget 側で縮める
//   bob   : その場でふわふわ上下するか
//   speed : 画面を動き回る速さ(px/秒)。0 なら動かない

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

export const DEFAULT_MODE = 'normal';

export function getMode(id) {
  return MODES.find(m => m.id === id) || MODES.find(m => m.id === DEFAULT_MODE);
}
