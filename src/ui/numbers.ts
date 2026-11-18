import type { NumberQuestion } from '../core/quiz';
import { button, el } from './dom';

/** 이모지 n개를 담은 묶음. */
export function emojiGroup(emoji: string, n: number): HTMLElement {
  const g = el('div', `emoji-group${n > 10 ? ' many' : ''}`);
  for (let i = 0; i < n; i++) g.append(el('span', 'emoji', [emoji]));
  return g;
}

/**
 * 숫자 문제를 그린다. count/add는 이모지 묶음 + 숫자 보기 버튼,
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

  const picture =
    q.kind === 'add'
      ? el('div', 'add-row', [emojiGroup(q.emoji, q.groups[0]), el('span', 'plus', ['➕']), emojiGroup(q.emoji, q.groups[1])])
      : emojiGroup(q.emoji, q.groups[0]);

  const choices = q.choices.map((c) => {
    const b = button(String(c), () => onChoose(c, b), 'choice-btn', { 'data-choice': String(c) });
    return b;
  });

  return el('div', `number-question ${q.kind}`, [el('div', 'picture', [picture]), el('div', 'choices', choices)]);
}
