// きろくは、その端末のブラウザ(localStorage)だけに保存する。
// サーバーには送らないので、端末を替えると引き継がれない。

const KEY = 'touch-practice.records.v1';
const LIMIT = 500; // たまりすぎないよう、古いものから捨てる

export function loadRecords() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    // プライベートモードなどで読めないことがある
    return [];
  }
}

// 保存できたら true。容量オーバーや保存禁止の設定だと false
export function addRecord(rec) {
  try {
    const list = loadRecords();
    list.unshift(rec); // 新しいものが先頭
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
    return true;
  } catch {
    return false;
  }
}

// 一覧をまるごと書き戻す（1件消すときに使う）
export function saveRecords(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
    return true;
  } catch {
    return false;
  }
}

export function clearRecords() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

// 2026/9/12 14:03 の形にする
export function formatStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
