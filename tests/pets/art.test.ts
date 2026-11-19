import { describe, it, expect } from 'vitest';
import { drawFriend } from '../../src/pets/art';
import { FRIENDS, FRIEND_ORDER } from '../../src/pets/friends';

const STAGES = [0, 1, 2, 3] as const;
const PARTS = ['whole', 'body-g', 'head-g', 'eyes-open', 'eyes-happy', 'eyes-sleep', 'mouth-closed', 'mouth-open'];

describe('drawFriend', () => {
  for (const kind of FRIEND_ORDER) {
    for (const stage of STAGES) {
      it(`${kind} stage ${stage}: valid svg with all parts`, () => {
        const svg = drawFriend(kind, stage);
        expect(svg.startsWith(`<svg class="pet ${kind}"`)).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        for (const p of PARTS) expect(svg).toContain(`class="${p}`);
      });
    }
  }
});

describe('FRIENDS', () => {
  it('matches the approved preview table', () => {
    expect(FRIEND_ORDER).toEqual(['dog', 'cat', 'chick', 'tree']);
    expect(FRIENDS.tree.care.eat.icon).toBe('💧');
    expect(FRIENDS.chick.care.play.label).toBe('노래');
    expect(FRIENDS.dog.pet.line).toBe('헤헤, 좋아!');
    expect(FRIENDS.chick.stageNames[0]).toBe('알');
    expect(FRIENDS.cat.hello).toBe('야옹! 반가워!');
    for (const k of FRIEND_ORDER) expect(FRIENDS[k].kind).toBe(k);
  });
});
