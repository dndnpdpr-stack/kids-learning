import { describe, it, expect } from 'vitest';
import { APP_NAME } from '../src/main';

describe('smoke', () => {
  it('exposes the app name', () => {
    expect(APP_NAME).toBe('놀이 학교');
  });
});
