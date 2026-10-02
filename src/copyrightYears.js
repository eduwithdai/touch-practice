export const START_YEAR = 2026;

// 著作権表示の年。最初の年のあいだは「2026」、
// 年をまたいだら「2026–2027」のように今の年まで伸ばす。
// 端末の時計が狂って過去になっていても、最初の年だけを出す。
export function copyrightYears(currentYear, startYear = START_YEAR) {
  if (!Number.isFinite(currentYear) || currentYear <= startYear) return `${startYear}`;
  return `${startYear}–${currentYear}`;
}
