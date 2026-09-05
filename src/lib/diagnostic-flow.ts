/**
 * Pure diagnostic-flow logic, deliberately separated from any component.
 *
 * This file exists because of one specific audit finding (V1 mini-probe
 * leaked the German sentence into the DOM before the visitor answered,
 * which defeats a listening-comprehension check). Putting the reveal rule
 * in a pure function — instead of a JSX conditional buried in a component —
 * makes it possible to unit-test the guarantee directly, without a browser:
 * "German is visible" becomes a return value, not a rendering side effect.
 */

export type AnswerState = 'unanswered' | 'answered';

export type QuestionResult = {
  position: number;
  skillLabel: string;
  correct: boolean;
};

/**
 * The single gate the UI is allowed to consult. A component MUST call this
 * rather than checking `chosen !== null` inline in JSX — that keeps the rule
 * in one place instead of re-implemented per screen.
 */
export function shouldRevealGerman(state: AnswerState): boolean {
  return state === 'answered';
}

export function computeAnswerState(chosenOptionId: string | null): AnswerState {
  return chosenOptionId === null ? 'unanswered' : 'answered';
}

export type DiagnosticSummary = {
  correctCount: number;
  total: number;
  share: number;
  missedSkills: string[];
  strongSkills: string[];
};

/**
 * Plain rule-based scoring — no "AI analysis" of any kind, matching the
 * explicit instruction against inventing an analysis the product does not
 * perform. A skill counts as missed if the visitor got at least one question
 * on it wrong, and strong if every question on it was answered correctly.
 */
export function summarizeDiagnostic(results: QuestionResult[]): DiagnosticSummary {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;

  const bySkill = new Map<string, boolean[]>();
  for (const r of results) {
    const list = bySkill.get(r.skillLabel) ?? [];
    list.push(r.correct);
    bySkill.set(r.skillLabel, list);
  }

  const missedSkills: string[] = [];
  const strongSkills: string[] = [];
  for (const [skill, outcomes] of bySkill) {
    if (outcomes.every(Boolean)) strongSkills.push(skill);
    else missedSkills.push(skill);
  }

  return {
    correctCount,
    total,
    share: total > 0 ? correctCount / total : 0,
    missedSkills,
    strongSkills,
  };
}

export type ResultTier = 'low' | 'mid' | 'high';

export function resultTier(share: number): ResultTier {
  if (share >= 0.85) return 'high';
  if (share >= 0.5) return 'mid';
  return 'low';
}
