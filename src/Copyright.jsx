import { copyrightYears } from './copyrightYears';

// 年はモジュールの読み込み時に1度だけ決める。
// 描画のたびに new Date() を呼ぶと純粋でなくなるため。
const YEARS = copyrightYears(new Date().getFullYear());

// 画面のいちばん下に出す著作権表示。
// 見た目と印刷時の非表示は index.css の .copyright にまとめてある。
export default function Copyright() {
  return (
    <footer className="copyright">
      © {YEARS} eduwithdai. All rights reserved.
    </footer>
  );
}
