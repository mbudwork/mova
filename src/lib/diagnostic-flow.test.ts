import { describe, expect, it } from 'vitest';
import {
  computeAnswerState,
  resultTier,
  shouldRevealGerman,
  summarizeDiagnostic,
} from './diagnostic-flow';

describe('shouldRevealGerman', () => {
  it('never reveals before an answer is chosen', () => {
    expect(shouldRevealGerman(computeAnswerState(null))).toBe(false);
  });

  it('reveals only once an option id is chosen', () => {
    expect(shouldRevealGerman(computeAnswerState('option-1'))).toBe(true);
  });

  it('has no third state that could accidentally reveal early', () => {
    // Exhaustiveness by construction: computeAnswerState only returns
    // 'unanswered' | 'answered', so this covers the whole domain.
    for (const input of [null, '', 'x', 'a-long-uuid-value'] as (string | null)[]) {
      const state = computeAnswerState(input);
      expect(['unanswered', 'answered']).toContain(state);
      if (input === null) expect(shouldRevealGerman(state)).toBe(false);
    }
  });
});

describe('summarizeDiagnostic', () => {
  it('scores by simple counting, no AI, no randomness', () => {
    const s = summarizeDiagnostic([
      { position: 1, skillLabel: 'Инструмент', correct: true },
      { position: 2, skillLabel: 'Направление', correct: false },
      { position: 3, skillLabel: 'Направление', correct: true },
    ]);
    expect(s.correctCount).toBe(2);
    expect(s.total).toBe(3);
    expect(s.share).toBeCloseTo(2 / 3);
  });

  it('marks a skill missed if any question on it was wrong', () => {
    const s = summarizeDiagnostic([
      { position: 1, skillLabel: 'Размер', correct: true },
      { position: 2, skillLabel: 'Размер', correct: false },
    ]);
    expect(s.missedSkills).toEqual(['Размер']);
    expect(s.strongSkills).toEqual([]);
  });

  it('marks a skill strong only if every question on it was correct', () => {
    const s = summarizeDiagnostic([
      { position: 1, skillLabel: 'Инструмент', correct: true },
      { position: 2, skillLabel: 'Инструмент', correct: true },
    ]);
    expect(s.strongSkills).toEqual(['Инструмент']);
  });

  it('handles zero questions without dividing by zero', () => {
    const s = summarizeDiagnostic([]);
    expect(s.share).toBe(0);
    expect(s.total).toBe(0);
  });
});

describe('resultTier', () => {
  it('is deterministic across the boundaries the copy relies on', () => {
    expect(resultTier(0)).toBe('low');
    expect(resultTier(0.49)).toBe('low');
    expect(resultTier(0.5)).toBe('mid');
    expect(resultTier(0.84)).toBe('mid');
    expect(resultTier(0.85)).toBe('high');
    expect(resultTier(1)).toBe('high');
  });
});
