import { describe, expect, it } from 'vitest';
import { buildOptions, computeExerciseState, shouldRevealGerman } from './exercise';

describe('reveal gate (scored exercise)', () => {
  it('never reveals before an answer', () => {
    expect(shouldRevealGerman(computeExerciseState(null))).toBe(false);
  });
  it('reveals once an option is chosen', () => {
    expect(shouldRevealGerman(computeExerciseState('opt-1'))).toBe(true);
  });
});

describe('buildOptions', () => {
  const target = { id: 'p1', germanText: 'Hol die Wasserwaage.', translation: 'Принеси уровень.' };
  const pool = [
    target,
    { id: 'p2', germanText: 'Stell das hier hin.', translation: 'Поставь это сюда.' },
    { id: 'p3', germanText: 'Mach das nochmal.', translation: 'Сделай это ещё раз.' },
    { id: 'p4', germanText: 'Warte kurz.', translation: 'Подожди немного.' },
    { id: 'p5', germanText: 'Komm mal her.', translation: 'Подойди сюда.' },
  ];

  it('includes exactly one correct option', () => {
    const options = buildOptions(target, pool);
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(options.find((o) => o.isCorrect)?.text).toBe(target.translation);
  });

  it('returns up to maxOptions total, never more', () => {
    const options = buildOptions(target, pool, 4);
    expect(options.length).toBeLessThanOrEqual(4);
  });

  it('never includes a duplicate text among options', () => {
    const options = buildOptions(target, pool);
    const texts = options.map((o) => o.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('degrades to fewer options instead of padding when the pool is small', () => {
    const smallPool = [target, { id: 'p2', germanText: 'X', translation: 'Y' }];
    const options = buildOptions(target, smallPool, 4);
    expect(options).toHaveLength(2); // correct + exactly one real distractor
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  it('never crashes with an empty distractor pool — falls back to the correct answer alone', () => {
    const options = buildOptions(target, [target], 4);
    expect(options).toHaveLength(1);
    expect(options[0]!.isCorrect).toBe(true);
  });

  it('excludes candidates that share the target\'s translation, even under a different phrase id', () => {
    const poolWithDupeTranslation = [
      target,
      { id: 'dup', germanText: 'Different German.', translation: target.translation },
      { id: 'p2', germanText: 'Stell das hier hin.', translation: 'Поставь это сюда.' },
    ];
    const options = buildOptions(target, poolWithDupeTranslation);
    expect(options.filter((o) => o.text === target.translation)).toHaveLength(1);
  });

  it('is deterministic for the same seed', () => {
    const a = buildOptions(target, pool, 4, 'fixed-seed');
    const b = buildOptions(target, pool, 4, 'fixed-seed');
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
  });

  it('varies option order across different seeds (not always correct-answer-first)', () => {
    const positions = new Set<number>();
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const options = buildOptions(target, pool, 4, seed);
      positions.add(options.findIndex((o) => o.isCorrect));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});
