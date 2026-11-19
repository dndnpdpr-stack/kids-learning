import type { NumberQuestion } from '../core/quiz';
import { button, el } from './dom';

/** 칸 수만큼 채운 칸(이모지)과 빈칸(흐린 점)으로 된 틀 하나. */
function frame(emoji: string, filled: number, size: 5 | 10): HTMLElement {
  const cells = Array.from({ length: size }, (_, i) =>
    i < filled ? el('span', 'frame-cell filled', [emoji]) : el('span', 'frame-cell empty'),
  );
  return el('div', `ten-frame${size === 5 ? ' five' : ''}`, cells);
}

/**
 * 이모지 n개를 흩지 않고 10칸 틀에 담는다.
 * 5 이하: 5칸 한 줄 · 6~10: 10칸 틀 하나 · 11~20: 다 채운 10칸 틀 + 나머지를 담은 10칸 틀.
 */
export function emojiGroup(emoji: string, n: number): HTMLElement {
  if (n <= 5) return el('div', 'emoji-group small', [frame(emoji, n, 5)]);
  if (n <= 10) return el('div', 'emoji-group', [frame(emoji, n, 10)]);
  return el('div', 'emoji-group two', [frame(emoji, 10, 10), frame(emoji, n - 10, 10)]);
}

/** 하나 더(+1): 틀 옆에 "➕ 🍎". 하나 덜(−1): 마지막 하나가 흐리게 날아간다. */
function oneMorePicture(q: NumberQuestion): HTMLElement {
  const [n, delta] = q.groups;
  const group = emojiGroup(q.emoji, n);
  if (delta < 0) {
    const cells = group.querySelectorAll('.frame-cell.filled');
    cells[cells.length - 1]?.classList.add('leaving');
    return el('div', 'one-more-row minus', [group]);
  }
  const hint = el('span', 'one-more-hint', [el('span', 'plus', ['➕']), el('span', 'hint-emoji', [q.emoji])]);
  return el('div', 'one-more-row', [group, hint]);
}

function sequencePicture(q: NumberQuestion): HTMLElement {
  const cards = (q.sequence ?? []).map((v) =>
    v === null ? el('div', 'seq-card blank', ['?']) : el('div', 'seq-card', [String(v)]),
  );
  return el('div', 'seq-row', cards);
}

function picture(q: NumberQuestion): HTMLElement {
  switch (q.kind) {
    case 'add':
      return el('div', 'add-row', [
        emojiGroup(q.emoji, q.groups[0]),
        el('span', 'plus', ['➕']),
        emojiGroup(q.emoji, q.groups[1]),
      ]);
    case 'oneMore':
      return oneMorePicture(q);
    case 'sequence':
      return sequencePicture(q);
    default:
      return emojiGroup(q.emoji, q.groups[0]);
  }
}

/**
 * 숫자 문제를 그린다. count/add/oneMore/sequence는 그림 + 숫자 보기 버튼,
 * compare는 두 묶음 자체가 누를 수 있는 보기(값 0=왼쪽, 1=오른쪽)다.
 */
export function renderNumberQuestion(
  q: NumberQuestion,
  onChoose: (choice: number, node: HTMLElement) => void,
): HTMLElement {
  if (q.kind === 'compare') {
    const sides = q.groups.map((n, i) => {
      const b = button(emojiGroup(q.emoji, n), () => onChoose(i, b), 'compare-btn', {
        'data-choice': String(i),
      });
      return b;
    });
    return el('div', 'number-question compare', [el('div', 'compare-row', sides)]);
  }

  const choices = q.choices.map((c) => {
    const b = button(String(c), () => onChoose(c, b), 'choice-btn', { 'data-choice': String(c) });
    return b;
  });

  return el('div', `number-question ${q.kind}`, [el('div', 'picture', [picture(q)]), el('div', 'choices', choices)]);
}
