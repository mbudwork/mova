/**
 * Pure logic for the scored exercise: AUDIO → meaning options → answer →
 * feedback → reveal. Kept out of React so the rules that matter most —
 * "never reveal German before an answer", "never show duplicate options",
 * "never leave fewer than 3 options unless the pool is genuinely too small"
 * — are unit-testable without mounting a component.
 */

export type ExerciseState = 'unanswered' | 'answered';

export function computeExerciseState(chosenId: string | null): ExerciseState {
  return chosenId === null ? 'unanswered' : 'answered';
}

/** Same non-negotiable gate as the marketing diagnostic (src/lib/diagnostic-flow.ts). */
export function shouldRevealGerman(state: ExerciseState): boolean {
  return state === 'answered';
}

export type OptionSource = { id: string; germanText: string; translation: string };
export type ExerciseOption = { id: string; text: string; isCorrect: boolean };

/**
 * Builds the meaning options for one phrase. Distractors are real
 * translations of other phrases from the same pool (the rest of the lesson,
 * or the rest of the review batch) — never invented text. Degrades to 3
 * options rather than padding with a repeat when the pool is too small, and
 * never returns fewer than 2 (1 correct + 1 distractor) unless the pool truly
 * has nothing else to offer.
 *
 * `seed` makes option order deterministic for a given render input (so a
 * server-rendered page and its hydration agree), while still varying
 * naturally from phrase to phrase and pool to pool.
 */
export function buildOptions(
  target: OptionSource,
  pool: OptionSource[],
  maxOptions = 4,
  seed = target.id,
): ExerciseOption[] {
  const candidates = pool.filter((p) => p.id !== target.id && p.translation !== target.translation);

  // Deduplicate by translation text: two source phrases that happen to share
  // a Russian translation would otherwise produce two visually identical
  // wrong answers.
  const seen = new Set<string>();
  const distractorPool = candidates.filter((c) => {
    if (seen.has(c.translation)) return false;
    seen.add(c.translation);
    return true;
  });

  const wantedDistractors = Math.min(maxOptions - 1, distractorPool.length);
  const distractors = seededShuffle(distractorPool, seed).slice(0, wantedDistractors);

  const options: ExerciseOption[] = [
    { id: target.id, text: target.translation, isCorrect: true },
    ...distractors.map((d) => ({ id: d.id, text: d.translation, isCorrect: false })),
  ];

  return seededShuffle(options, `${seed}-order`);
}

/** Deterministic shuffle: same seed always produces the same order. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = items.slice();
  let state = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;

    /*
      Индекс берётся из СТАРШИХ бит состояния, а не через `state % (i + 1)`.

      Линейный конгруэнтный генератор по модулю 2^32 имеет известную слабость:
      младшие биты почти не перемешиваются — нулевой бит просто чередуется с
      периодом 2, первый с периодом 4. А `% 2` и `% 4` — это ровно они. На
      четырёх вариантах ответа правильный оказывался только на первой или
      третьей позиции, причём на первой в 63% случаев: угадать можно было, не
      слушая. Деление на 2^32 переводит состояние в дробь [0,1) и использует
      старшие биты, где перемешивание нормальное.
    */
    const j = Math.floor((state / 4294967296) * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** FNV-1a: simple, fast, and mixes short strings well enough that adjacent
 * seeds (e.g. two phrase UUIDs, or "seed" vs "seed-order") don't produce
 * visibly correlated shuffles. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 1;
}
