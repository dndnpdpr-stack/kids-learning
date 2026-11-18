import { describe, expect, it } from 'vitest';
import { isTestMode } from '../../src/core/devFlags';

describe('isTestMode (dev-only start option)', () => {
  it('is on only in dev with VITE_TEST_MODE=true', () => {
    expect(isTestMode({ DEV: true, VITE_TEST_MODE: 'true' })).toBe(true);
  });
  it('is off without the flag', () => {
    expect(isTestMode({ DEV: true })).toBe(false);
    expect(isTestMode({ DEV: true, VITE_TEST_MODE: 'false' })).toBe(false);
  });
  it('can never turn on in a production build', () => {
    expect(isTestMode({ DEV: false, VITE_TEST_MODE: 'true' })).toBe(false);
  });
});
