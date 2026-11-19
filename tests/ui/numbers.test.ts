import { describe, expect, it, vi } from 'vitest';
import { getWorld } from '../../src/content';
import { cardLabel } from '../../src/ui/groupItems';
import type { NumberQuestion } from '../../src/core/quiz';
import { emojiGroup, renderNumberQuestion } from '../../src/ui/numbers';

const frames = (g: HTMLElement) => [...g.querySelectorAll<HTMLElement>('.ten-frame')];
const filled = (g: HTMLElement) => g.querySelectorAll('.frame-cell.filled').length;
const empty = (g: HTMLElement) => g.querySelectorAll('.frame-cell.empty').length;

describe('emojiGroup ten-frames', () => {
  it('1..5 fill one 5-cell row', () => {
    for (let n = 1; n <= 5; n++) {
      const g = emojiGroup('🍎', n);
      expect(frames(g)).toHaveLength(1);
      expect(frames(g)[0].classList.contains('five')).toBe(true);
      expect(filled(g)).toBe(n);
      expect(empty(g)).toBe(5 - n);
    }
  });
  it('6..10 fill one 10-cell frame', () => {
    for (let n = 6; n <= 10; n++) {
      const g = emojiGroup('🍎', n);
      expect(frames(g)).toHaveLength(1);
      expect(frames(g)[0].classList.contains('five')).toBe(false);
      expect(filled(g)).toBe(n);
      expect(empty(g)).toBe(10 - n);
    }
  });
  it('13 is a full frame plus a frame of 3 (13 filled, 7 empty)', () => {
    const g = emojiGroup('🍎', 13);
    const f = frames(g);
    expect(f).toHaveLength(2);
    expect(filled(g)).toBe(13);
    expect(empty(g)).toBe(7);
    expect(f[0].querySelectorAll('.filled').length).toBe(10);
    expect(f[1].querySelectorAll('.filled').length).toBe(3);
    expect(g.textContent).toBe('🍎'.repeat(13));
  });
  it('20 is two full frames', () => {
    const g = emojiGroup('⭐', 20);
    expect(frames(g)).toHaveLength(2);
    expect(filled(g)).toBe(20);
    expect(empty(g)).toBe(0);
  });
});

function q(partial: Partial<NumberQuestion>): NumberQuestion {
  return { kind: 'count', prompt: '', emoji: '🍎', groups: [], choices: [1, 2, 3], answer: 1, ...partial };
}

describe('renderNumberQuestion', () => {
  it('oneMore +1 shows n apples and a "+ one apple" hint', () => {
    const node = renderNumberQuestion(q({ kind: 'oneMore', groups: [4, 1], choices: [5, 2, 8], answer: 5 }), vi.fn());
    expect(node.querySelector('.one-more-hint')!.textContent).toBe('➕🍎');
    expect(filled(node)).toBe(4);
    expect(node.querySelectorAll('.leaving').length).toBe(0);
    expect(node.querySelectorAll('.choice-btn')).toHaveLength(3);
  });
  it('oneMore −1 shows n apples with the last one flying away', () => {
    const node = renderNumberQuestion(q({ kind: 'oneMore', groups: [6, -1], choices: [5, 2, 8], answer: 5 }), vi.fn());
    expect(node.querySelector('.one-more-hint')).toBeNull();
    expect(filled(node)).toBe(6);
    const leaving = node.querySelectorAll('.frame-cell.leaving');
    expect(leaving).toHaveLength(1);
    expect(node.querySelectorAll('.frame-cell.filled')[5]).toBe(leaving[0]);
  });
  it('sequence shows three big cards with one "?" and number choices', () => {
    const onChoose = vi.fn();
    const node = renderNumberQuestion(
      q({ kind: 'sequence', sequence: [3, null, 5], choices: [4, 7, 1], answer: 4 }),
      onChoose,
    );
    const cards = [...node.querySelectorAll('.seq-card')].map((c) => c.textContent);
    expect(cards).toEqual(['3', '?', '5']);
    expect(node.querySelector('.seq-card.blank')!.textContent).toBe('?');
    const btn = node.querySelector<HTMLButtonElement>('[data-choice="4"]')!;
    btn.click();
    expect(onChoose).toHaveBeenCalledWith(4, btn);
  });
});

describe('number group cards', () => {
  it('every numbers group has its own card picture', () => {
    const labels = getWorld('numbers').groups.map((g) => cardLabel(g));
    expect(labels).toEqual(['1 2 3', '6 7 8', '⚖️', '➕1', '1 2 ?', '➕', '🔟', '🍓🍓']);
  });
});
