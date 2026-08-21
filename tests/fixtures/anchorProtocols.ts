/**
 * Frozen protocol fixtures for auditor drift detection.
 *
 * These are anchors. Their contents must not be edited to make a test pass. If
 * the auditor's output moves on a fixture, either the change was intended (in
 * which case re-baseline deliberately and say why in the commit) or it was not
 * (in which case the anchor just did its job).
 *
 * They deliberately span the verdict range: one clean, one with a fatal
 * arithmetic defect, one thin on safety, one with an unverifiable citation.
 */

import type { SopDocument } from '../../src/types';
import { calculateReaction, type ReactionCalculation } from '../../src/core/reactionMath';

function baseDocument(overrides: Partial<SopDocument> = {}): SopDocument {
  return {
    id: 'anchor',
    documentId: 'SOP-ANCHOR',
    version: '1.0',
    effectiveDate: '2026-01-01',
    title: 'Anchor protocol',
    category: 'PCR',
    author: 'Anchor',
    scope: 'Fixed fixture for drift detection.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Ethidium bromide', description: 'Mutagen; handle in fume hood.' }],
    ppeRequirements: [{ item: 'nitrile gloves', required: true }],
    equipmentRequired: ['thermocycler', 'microcentrifuge'],
    reagentsRequired: ['2X master mix', 'nuclease-free water'],
    steps: [
      {
        stepNumber: 1,
        title: 'Thaw and mix',
        instruction: 'Thaw the 2X master mix on ice for 10 min and vortex for 5 s.',
        timingMinutes: 10,
        tempCelsius: 4,
      },
      {
        stepNumber: 2,
        title: 'Assemble',
        instruction: 'Assemble a 20 uL reaction: 10 uL of 2X mix, 8 uL water, 2 uL template.',
        timingMinutes: 15,
        tempCelsius: 22,
      },
      {
        stepNumber: 3,
        title: 'Cycle',
        instruction: 'Run 35 cycles of 95 C for 15 s and 60 C for 60 s.',
        timingMinutes: 90,
        tempCelsius: 95,
      },
    ],
    qualityControl: ['Include a no-template control on every plate.'],
    troubleshooting: [{ issue: 'No product', cause: 'Primer degradation', solution: 'Use a fresh aliquot.' }],
    references: [{ citation: 'A real paper', doiOrUrl: '10.1/x', verificationStatus: 'VERIFIED' }],
    revisionHistory: [{ version: '1.0', date: '2026-01-01', changes: 'Initial issue.', author: 'Anchor' }],
    ...overrides,
  };
}

export interface AnchorCase {
  id: string;
  /** Why this fixture exists, so a future reader knows what it is protecting. */
  intent: string;
  sop: SopDocument;
  calc: ReactionCalculation | null;
}

const cleanCalc = (): ReactionCalculation =>
  calculateReaction(
    [
      { id: 'mix', name: '2X Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
      { id: 'water', name: 'Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
    ],
    { targetVolumeMicroliters: 20 },
  );

/** Components whose required volumes exceed the reaction volume. */
const overflowingCalc = (): ReactionCalculation =>
  calculateReaction(
    [
      { id: 'mix', name: 'Mix', stockConc: 2, stockUnit: 'X', finalConc: 1.5, finalUnit: 'X' },
      { id: 'primer', name: 'Primer', stockConc: 10, stockUnit: 'µM', finalConc: 4, finalUnit: 'µM' },
      { id: 'probe', name: 'Probe', stockConc: 5, stockUnit: 'µM', finalConc: 2, finalUnit: 'µM' },
    ],
    { targetVolumeMicroliters: 20 },
  );

export const ANCHOR_CASES: AnchorCase[] = [
  {
    id: 'clean-pcr',
    intent: 'A well-formed document with balanced arithmetic. Guards against the auditor becoming harsher by accident.',
    sop: baseDocument(),
    calc: cleanCalc(),
  },
  {
    id: 'overflowing-volumes',
    intent: 'Component volumes exceed the reaction volume. This must never stop being a FAIL.',
    sop: baseDocument({ documentId: 'SOP-ANCHOR-2', title: 'Overflowing reaction' }),
    calc: overflowingCalc(),
  },
  {
    id: 'no-safety-content',
    intent: 'Hazards, PPE and QC stripped out. Guards the safety dimension against silently loosening.',
    sop: baseDocument({
      documentId: 'SOP-ANCHOR-3',
      title: 'No safety content',
      hazards: [],
      ppeRequirements: [],
      qualityControl: [],
    }),
    calc: cleanCalc(),
  },
  {
    id: 'unverified-citation',
    intent: 'A citation whose DOI resolves to the wrong paper, which is the hallucination signature.',
    sop: baseDocument({
      documentId: 'SOP-ANCHOR-4',
      title: 'Mismatched citation',
      references: [
        { citation: 'Claimed paper', doiOrUrl: '10.1/wrong', verificationStatus: 'MISMATCH' },
        { citation: 'Unchecked paper', doiOrUrl: '10.1/unknown', verificationStatus: 'UNCHECKED' },
      ],
    }),
    calc: cleanCalc(),
  },
  {
    id: 'no-reaction-data',
    intent: 'No reaction calculation at all. The arithmetic dimensions must decline to score rather than pass by default.',
    sop: baseDocument({ documentId: 'SOP-ANCHOR-5', title: 'Document only' }),
    calc: null,
  },
];
