const ONES = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];

/** 1~20을 고유어로 읽는다 (하나 … 열, 열하나 … 스물). */
export function koreanCount(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new RangeError(`koreanCount: ${n} is not in 1..20`);
  if (n === 20) return '스물';
  if (n === 10) return '열';
  return n < 10 ? ONES[n - 1] : `열${ONES[n - 11]}`;
}

/** 11~20을 10과 나머지로 나눠 말한다. 예: 13 → "열셋! 열하고 셋!" */
export function splitTen(n: number): string {
  return `${koreanCount(n)}! 열하고 ${koreanCount(n - 10)}!`;
}
