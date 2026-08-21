/**
 * The rubric BioSOP's own output is graded against.
 *
 * This is the SOP-drafting rubric from the bench evaluation work, expressed as
 * typed data so it can be scored in a test rather than read off a screen.
 *
 * Two design decisions worth not re-litigating:
 *
 *   1. **Criteria are binary, never a 1-5 scale.** The same grading task run at
 *      two-way and five-way granularity drops accuracy from 76 to 57 percent and
 *      kappa from 0.51 to 0.34. Decomposing a judgement into yes/no checks is
 *      what makes two readers agree.
 *   2. **Hard failures gate; they are not a large negative weight.** A negative
 *      weight is compensable, so enough satisfied criteria bury it. The gate is
 *      evaluated before the score and overrides it, which is the same rule
 *      `auditor.ts` follows when an ERROR forces FAIL at any score.
 */

export type CriterionWeight = 'ESSENTIAL' | 'IMPORTANT' | 'OPTIONAL';

/** Essential 1.0, Important 0.7, Optional 0.3. */
export const WEIGHT_VALUE: Record<CriterionWeight, number> = {
  ESSENTIAL: 1.0,
  IMPORTANT: 0.7,
  OPTIONAL: 0.3,
};

export interface RubricCriterion {
  id: string;
  weight: CriterionWeight;
  text: string;
}

export interface HardFail {
  id: string;
  text: string;
}

export interface Rubric {
  id: string;
  title: string;
  /** Fraction of available weight required to pass, absent any hard failure. */
  passThreshold: number;
  criteria: RubricCriterion[];
  hardFails: HardFail[];
  /** What a golden set for this rubric needs to look like. */
  goldenSetGuidance: string;
}

export const SOP_DRAFTING_RUBRIC: Rubric = {
  id: 'sop-drafting',
  title: 'SOP drafting from a validated method',
  passThreshold: 0.9,
  criteria: [
    { id: 'c0', weight: 'ESSENTIAL', text: 'Every step in the source method appears with the same parameters' },
    { id: 'c1', weight: 'ESSENTIAL', text: 'No step invented, reordered or merged in a way that changes chemistry or timing' },
    { id: 'c2', weight: 'ESSENTIAL', text: "Any regulation, standard or guidance cited exists and says what's claimed" },
    { id: 'c3', weight: 'ESSENTIAL', text: 'Safety and hazard steps preserved at the same or greater specificity' },
    { id: 'c4', weight: 'ESSENTIAL', text: 'Inference log present and complete: everything not stated in the source is listed there' },
    { id: 'c5', weight: 'IMPORTANT', text: 'Pitched so someone trained but new to the method could execute it' },
    { id: 'c6', weight: 'IMPORTANT', text: 'Acceptance criteria and expected results carried through from the source' },
    { id: 'c7', weight: 'IMPORTANT', text: "Equipment and reagents listed with the source's exact identifiers" },
    { id: 'c8', weight: 'IMPORTANT', text: 'Language specific to your lab, not generic template filler' },
    { id: 'c9', weight: 'IMPORTANT', text: 'Trace table maps every SOP step back to a source method line' },
    { id: 'c10', weight: 'OPTIONAL', text: 'Follows your SOP template structure and numbering' },
    { id: 'c11', weight: 'OPTIONAL', text: 'Change-control fields present and left blank for you' },
  ],
  hardFails: [
    { id: 'h0', text: "A cited standard or guidance that doesn't exist or doesn't say that" },
    { id: 'h1', text: 'Any safety step weakened, merged or removed' },
    { id: 'h2', text: 'A parameter changed from the source method' },
  ],
  goldenSetGuidance:
    'Method-to-SOP pairs where an approved SOP already exists to grade against. Fifteen is a working minimum ' +
    'and twenty to fifty is the useful range. Over-sample hard cases, reserve about a third as adversarial, ' +
    'and include a few where the correct answer is that the source does not say.',
};

/** One graded item: which criteria were met, and which hard failures fired. */
export interface ItemScoreInput {
  /** Criterion ids judged met. Anything absent counts as not met. */
  criteriaMet: readonly string[];
  /** Hard-fail ids that fired. */
  hardFailsFired: readonly string[];
}

export interface ItemScore {
  /** Fraction of available weight satisfied, in [0, 1]. */
  score: number;
  /** Count of criteria met, which is not the same as the weighted score. */
  metCount: number;
  hardFailed: boolean;
  /** A hard failure fails the item at any score. */
  passed: boolean;
}

export function scoreItem(rubric: Rubric, input: ItemScoreInput): ItemScore {
  const totalWeight = rubric.criteria.reduce((s, c) => s + WEIGHT_VALUE[c.weight], 0);
  const met = new Set(input.criteriaMet);
  let earned = 0;
  let metCount = 0;
  for (const c of rubric.criteria) {
    if (met.has(c.id)) {
      earned += WEIGHT_VALUE[c.weight];
      metCount++;
    }
  }
  const score = totalWeight > 0 ? earned / totalWeight : 0;
  const hardFailed = input.hardFailsFired.length > 0;
  return {
    score,
    metCount,
    hardFailed,
    // The gate comes first, deliberately. A document that weakened a safety step
    // does not pass because it did well on formatting.
    passed: !hardFailed && score >= rubric.passThreshold,
  };
}

export interface CriterionMetRate {
  id: string;
  text: string;
  weight: CriterionWeight;
  met: number;
  n: number;
  rate: number;
}

/**
 * Met-rate per criterion, worst first.
 *
 * The aggregate score says a run failed. This says where, which is the only
 * version of the number you can act on.
 */
export function criterionMetRates(
  rubric: Rubric,
  items: readonly ItemScoreInput[],
): CriterionMetRate[] {
  const n = items.length;
  return rubric.criteria
    .map((c) => {
      const met = items.filter((it) => it.criteriaMet.includes(c.id)).length;
      return { id: c.id, text: c.text, weight: c.weight, met, n, rate: n ? met / n : NaN };
    })
    .sort((a, b) => a.rate - b.rate);
}
