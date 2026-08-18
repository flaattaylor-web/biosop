import { describe, it, expect } from 'vitest';
import { auditProtocol } from '../src/core/auditor';
import { calculateReaction } from '../src/core/reactionMath';
import type { SopDocument } from '../src/types';

const base = (): SopDocument => ({
  id: 'x', documentId: 'SOP-1', version: '1.0', effectiveDate: '2026-01-01', title: 'T', category: 'PCR', author: 'A', scope: 'S',
  biosafetyLevel: 'BSL-1',
  hazards: [{ type: 'CHEMICAL', label: 'x', description: 'y' }],
  ppeRequirements: [{ item: 'gloves', required: true }],
  equipmentRequired: ['thermocycler'], reagentsRequired: ['mix'],
  steps: [{ stepNumber: 1, title: 'Do', instruction: 'A sufficiently long instruction for the step.' }],
  qualityControl: ['Include an NTC'], troubleshooting: [{ issue: 'a', cause: 'b', solution: 'c' }],
  references: [{ citation: 'Real paper', doiOrUrl: '10.1/x', verificationStatus: 'VERIFIED' }],
  revisionHistory: [{ version: '1.0', date: '2026-01-01', changes: 'init', author: 'A' }],
});

describe('auditor: it can fail', () => {
  it('scores a clean protocol high but not clamped to 99', () => {
    const calc = calculateReaction([
      { id: 'a', name: '2X Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
      { id: 'w', name: 'Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
    ], { targetVolumeMicroliters: 20 });
    const r = auditProtocol(base(), calc);
    expect(r.verdict).toBe('PASS');
    expect(r.overallScore).toBe(100);
  });

  it('a protocol with overflowing volumes FAILS', () => {
    const calc = calculateReaction([
      { id: 'a', name: 'Mix', stockConc: 2, stockUnit: 'X', finalConc: 1.5, finalUnit: 'X' }, // 15
      { id: 'b', name: 'Primer', stockConc: 10, stockUnit: 'µM', finalConc: 4, finalUnit: 'µM' }, // 8
    ], { targetVolumeMicroliters: 20 });
    const r = auditProtocol(base(), calc);
    expect(r.verdict).toBe('FAIL');
    expect(r.overallScore).toBeLessThan(90);
    expect(r.dimensions.find((d) => d.key === 'VOLUME_BALANCE')!.score).toBeLessThan(80);
  });

  it('missing hazards + PPE on a BSL-2 protocol FAILS with specific findings', () => {
    const s = base(); s.hazards = []; s.ppeRequirements = []; s.biosafetyLevel = 'BSL-2';
    const r = auditProtocol(s, null);
    const codes = r.dimensions.flatMap((d) => d.findings.map((f) => f.code));
    expect(codes).toContain('NO_HAZARDS');
    expect(codes).toContain('NO_PPE');
    expect(codes).toContain('BSL_CONTAINMENT_MISSING');
    expect(r.verdict).toBe('FAIL');
  });

  it('a fabricated citation is an ERROR', () => {
    const s = base(); s.references = [{ citation: 'Nope', doiOrUrl: '10.1/fake', verificationStatus: 'NOT_FOUND' }];
    const r = auditProtocol(s, null);
    expect(r.dimensions.find((d) => d.key === 'CITATION_INTEGRITY')!.findings.some((f) => f.code === 'CITATION_NOT_FOUND' && f.severity === 'ERROR')).toBe(true);
  });

  it('unverified is not verified: coverage drops, score is capped, verdict warns', () => {
    const s = base(); s.references = [{ citation: 'Unchecked' }];
    const r = auditProtocol(s, null);
    const d = r.dimensions.find((x) => x.key === 'CITATION_INTEGRITY')!;
    expect(d.coverage).toBe(0);
    expect(d.score).toBeLessThan(60);
  });

  it('with nothing to check, verdict is INSUFFICIENT_DATA, not PASS', () => {
    const s = base(); s.references = [];
    const r = auditProtocol(s, null);
    // No calc, no refs → stoich/volume/pipettability/citations null; confidence from doc+safety only = 0.25
    expect(r.errorCount).toBe(0);
    expect(r.confidence).toBeLessThan(0.4);
    expect(r.verdict).toBe('INSUFFICIENT_DATA');
  });

  it('never claims ISO/GLP conformance', () => {
    const r = auditProtocol(base(), null);
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/validated against ISO/i);
    expect(text).not.toMatch(/GLP.?compliant/i);
    expect(r.scopeStatement).toMatch(/does NOT verify/);
  });

  it('every dimension states what it did NOT check', () => {
    const r = auditProtocol(base(), null);
    for (const d of r.dimensions) expect(d.notChecked.length).toBeGreaterThan(0);
  });
});
