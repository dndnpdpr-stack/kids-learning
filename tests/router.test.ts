import { describe, it, expect, vi } from 'vitest';
import { go, startRouter } from '../src/router';

describe('go replace', () => {
  it('does not grow history and still triggers the route handler', async () => {
    location.hash = '#/';
    const seen: string[] = [];
    const stop = startRouter((r) => seen.push(r.name));
    const before = history.length;
    go({ name: 'friendPick' }, { replace: true });
    await vi.waitFor(() => expect(seen).toContain('friendPick'));
    expect(history.length).toBe(before);
    expect(location.hash).toBe('#/friend/pick');
    stop();
  });
});
