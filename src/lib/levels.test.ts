import { describe, expect, it } from 'vitest';
import { levelName, levelOrder } from './levels';

describe('level naming', () => {
  it('gives every internal level a plain-language name', () => {
    expect(levelName('B0')).toBe('Начало');
    expect(levelName('B4')).toBe('Моя специальность');
  });

  it('never leaks a CEFR-looking label into the UI', () => {
    const cefr = /\b[ABC][12]\b/;
    for (const level of ['B0', 'B1', 'B2', 'B3', 'B4'] as const) {
      expect(levelName(level)).not.toMatch(cefr);
    }
  });

  it('orders levels for progression checks', () => {
    expect(levelOrder('B0')).toBeLessThan(levelOrder('B3'));
  });
});
