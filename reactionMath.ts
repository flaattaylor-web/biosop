/**
 * Authoritative reaction-volume mathematics.
 *
 * The model proposes concentrations; THIS module decides volumes. Every number a
 * user sees should come from here, with a provenance record explaining how it was
 * derived and whether it agreed with what the model proposed.
 *
 * Nothing in this module silently rewrites a value. Corrections are returned as
 * data for the UI to display and the user to accept.
 */

import { conversionFactor, ConversionOk, ConversionErr, parseUnit, roundTo } from './units';

export type ComponentRole =
  /** Goes into the shared master mix, scaled by reaction count. */
  | 'MASTER_MIX'
  /** Added to each tube/well individually — must NOT be scaled into the mix. */
  | 'PER_SAMPLE'
  /** Balances the reaction to its target volume. */
  | 'DILUENT';

export type Provenance = 'COMPUTED' | 'MODEL_PROPOSED' | 'USER_ENTERED' | 'CATALOG';

export interface ComponentInput {
  id: string;
  name: string;
  stockConc?: number;
  stockUnit?: string;
  finalConc?: number;
  finalUnit?: string;
  /** What the model or user proposed. Treated as a hypothesis, not a fact. */
  volPerRxnMicroliters?: number;
  pipettingOrder?: number;
  molecularWeight?: number;
  role?: ComponentRole;
  notes?: string;
}

export interface ComponentCalculation {
  id: string;
  name: string;
  role: ComponentRole;
  /** Whether the role was declared explicitly or inferred by heuristic. */
  roleInferred: boolean;
  /** The volume the app will use. */
  volPerRxnMicroliters: number;
  provenance: Provenance;
  /** Volume independently derived from C1V1 = C2V2, when derivable. */
  computedVolumeMicroliters: number | null;
  /** Volume originally proposed by the model/user. */
  proposedVolumeMicroliters: number | null;
  /** Signed relative difference (computed vs proposed), e.g. 0.12 = proposed is 12% high. */
  relativeDeviation: number | null;
  /** Human-readable derivation, e.g. "(0.2 µM x 50 µL) / 10 µM = 1.00 µL". */
  derivation: string | null;
  /** Why a volume could not be computed, when applicable. */
  uncomputableReason: string | null;
  /** Actual achieved final concentration given the volume in use. */
  achievedFinalConc: number | null;
  achievedFinalUnit: string | null;
  belowMinPipettable: boolean;
  /** Populated when belowMinPipettable — a concrete intermediate dilution. */
  intermediateDilution: IntermediateDilution | null;
}

export interface IntermediateDilution {
  /** e.g. 10 for a 1:10 pre-dilution. */
  foldDilution: number;
  dilutedStockConc: number;
  dilutedStockUnit: string;
  /** Volume to pipette from the diluted stock instead. */
  volumeFromDilutedStockMicroliters: number;
  recipe: string;
}

export type FindingSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface CalculationFinding {
  severity: FindingSeverity;
  code: string;
  componentId?: string;
  message: string;
  /** What the user should do about it. */
  remedy?: string;
}

export interface ReactionCalculation {
  targetVolumeMicroliters: number;
  actualVolumeMicroliters: number;
  volumeBalanced: boolean;
  components: ComponentCalculation[];
  findings: CalculationFinding[];
  /** True when every concentration pair was convertible and checkable. */
  fullyVerifiable: boolean;
  verifiableComponentCount: number;
  totalComponentCount: number;
}

export interface ReactionOptions {
  targetVolumeMicroliters: number;
  /** Smallest volume the lab's pipettes can accurately dispense. */
  minPipettableMicroliters?: number;
  /** Relative deviation above which a proposed volume is flagged. Default 2%. */
  deviationTolerance?: number;
  /** When true, computed volumes replace proposed ones. Default true. */
  preferComputed?: boolean;
  decimals?: number;
}

const PER_SAMPLE_PATTERNS = [
  /\btemplate\b/i, /\bsample\b/i, /\bgdna\b/i, /\bcdna\b/i, /\bmrna\b/i,
  /\btotal rna\b/i, /\blysate\b/i, /\bgenomic dna\b/i, /\binput dna\b/i,
  /\bextracted\b/i, /\bspecimen\b/i,
];

const DILUENT_PATTERNS = [
  /nuclease[- ]free water/i, /\bnf-?h2o\b/i, /\bddh2o\b/i, /\bdiethyl/i,
  /^water$/i, /\bmolecular grade water\b/i, /\bpcr[- ]grade water\b/i,
  /\bte buffer\b/i, /\beb\b/i, /\belution buffer\b/i, /\bdiluent\b/i,
];

/**
 * Classify a component when the model did not declare a role.
 *
 * This is a heuristic and is flagged as such in the output — the UI should let
 * the user override it, because getting this wrong changes master-mix volumes.
 */
export function inferRole(name: string): { role: ComponentRole; inferred: true } {
  const n = String(name || '');
  if (DILUENT_PATTERNS.some((re) => re.test(n))) return { role: 'DILUENT', inferred: true };
  if (PER_SAMPLE_PATTERNS.some((re) => re.test(n))) return { role: 'PER_SAMPLE', inferred: true };
  return { role: 'MASTER_MIX', inferred: true };
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toPrecision(3).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Compute the volume of one component from C1V1 = C2V2.
 *
 * Returns null (with a reason) when the concentration pair cannot be converted —
 * we never fall back to "accept whatever the model said" without recording it.
 */
export function computeComponentVolume(
  comp: ComponentInput,
  targetVolumeMicroliters: number
): { volume: number | null; derivation: string | null; reason: string | null } {
  const { stockConc, stockUnit, finalConc, finalUnit } = comp;

  if (stockConc === undefined || finalConc === undefined || !stockUnit || !finalUnit) {
    return { volume: null, derivation: null, reason: 'Missing stock or final concentration.' };
  }
  if (!Number.isFinite(stockConc) || !Number.isFinite(finalConc)) {
    return { volume: null, derivation: null, reason: 'Concentration is not a finite number.' };
  }
  if (stockConc <= 0) {
    return { volume: null, derivation: null, reason: 'Stock concentration must be greater than zero.' };
  }
  if (finalConc < 0) {
    return { volume: null, derivation: null, reason: 'Final concentration cannot be negative.' };
  }
  if (finalConc === 0) {
    return { volume: 0, derivation: 'Final concentration is 0 — component contributes no volume.', reason: null };
  }

  const conv = conversionFactor(finalUnit, stockUnit, comp.molecularWeight);
  if (conv.ok === false) {
    return { volume: null, derivation: null, reason: (conv as ConversionErr).reason };
  }
  const okConv = conv as ConversionOk;

  // Express the final concentration in the stock's units, then C1V1 = C2V2.
  const finalInStockUnits = finalConc * okConv.factor;
  // Relative epsilon: "final == stock" (use neat) must not be rejected because
  // the unit round-trip landed one ulp above the stock value.
  if (finalInStockUnits > stockConc * (1 + 1e-9)) {
    return {
      volume: null,
      derivation: null,
      reason: `Target final concentration (${formatNum(finalConc)} ${finalUnit}) exceeds the stock concentration (${formatNum(stockConc)} ${stockUnit}) — this dilution is impossible.`,
    };
  }

  const volume = (finalInStockUnits * targetVolumeMicroliters) / stockConc;
  const mwNote = okConv.usedMolecularWeight ? ` [via MW ${comp.molecularWeight} g/mol]` : '';
  const derivation =
    `(${formatNum(finalConc)} ${finalUnit} x ${formatNum(targetVolumeMicroliters)} µL) / ` +
    `${formatNum(stockConc)} ${stockUnit} = ${formatNum(volume)} µL${mwNote}`;

  return { volume, derivation, reason: null };
}

/** Build a concrete intermediate dilution for a volume below the pipettable floor. */
export function buildIntermediateDilution(
  comp: ComponentInput,
  requiredVolume: number,
  minPipettable: number
): IntermediateDilution | null {
  if (requiredVolume <= 0 || comp.stockConc === undefined || !comp.stockUnit) return null;

  // Smallest 10^n dilution that lifts the pipetted volume to/above the floor.
  const needed = minPipettable / requiredVolume;
  const fold = Math.pow(10, Math.ceil(Math.log10(needed)));
  if (!Number.isFinite(fold) || fold < 2) return null;

  const dilutedStock = comp.stockConc / fold;
  const newVolume = requiredVolume * fold;
  const partsStock = 1;
  const partsDiluent = fold - 1;

  return {
    foldDilution: fold,
    dilutedStockConc: roundTo(dilutedStock, 6),
    dilutedStockUnit: comp.stockUnit,
    volumeFromDilutedStockMicroliters: roundTo(newVolume, 2),
    recipe:
      `Prepare a 1:${fold} intermediate: ${partsStock} part stock + ${partsDiluent} parts nuclease-free water ` +
      `(e.g. ${formatNum(10)} µL stock + ${formatNum(10 * partsDiluent)} µL water) to give ` +
      `${formatNum(dilutedStock)} ${comp.stockUnit}. Pipette ${formatNum(newVolume)} µL of this instead of ` +
      `${formatNum(requiredVolume)} µL of neat stock.`,
  };
}

/**
 * Full reaction calculation. This replaces the previous `sanitizeAndValidateSop`
 * volume logic, which silently rewrote volumes deviating by >15% and silently
 * accepted anything under that threshold.
 */
export function calculateReaction(
  inputs: ComponentInput[],
  options: ReactionOptions
): ReactionCalculation {
  const targetVolume = options.targetVolumeMicroliters;
  const minPipettable = options.minPipettableMicroliters ?? 0.5;
  const tolerance = options.deviationTolerance ?? 0.02;
  const preferComputed = options.preferComputed ?? true;
  const decimals = options.decimals ?? 2;

  const findings: CalculationFinding[] = [];
  const results: ComponentCalculation[] = [];

  if (!Number.isFinite(targetVolume) || targetVolume <= 0) {
    findings.push({
      severity: 'ERROR',
      code: 'INVALID_TARGET_VOLUME',
      message: `Target reaction volume must be a positive number (received ${targetVolume}).`,
      remedy: 'Set a reaction volume before calculating.',
    });
  }

  let verifiableCount = 0;

  for (const comp of inputs) {
    const declaredRole = comp.role;
    const roleInfo = declaredRole
      ? { role: declaredRole, inferred: false }
      : inferRole(comp.name);

    // Diluent volume is set by difference in the balance step, not by C1V1=C2V2.
    const isDiluent = roleInfo.role === 'DILUENT';
    const { volume: computed, derivation, reason } = isDiluent
      ? { volume: null, derivation: null, reason: null }
      : computeComponentVolume(comp, targetVolume);
    const proposed = Number.isFinite(comp.volPerRxnMicroliters as number)
      ? (comp.volPerRxnMicroliters as number)
      : null;

    if (computed !== null || isDiluent) verifiableCount++;

    let chosen: number;
    let provenance: Provenance;

    if (computed !== null && preferComputed) {
      chosen = computed;
      provenance = 'COMPUTED';
    } else if (proposed !== null) {
      chosen = proposed;
      provenance = 'MODEL_PROPOSED';
    } else if (isDiluent) {
      chosen = 0; // filled by balance step below
      provenance = 'COMPUTED';
    } else {
      chosen = 0;
      provenance = 'MODEL_PROPOSED';
      findings.push({
        severity: 'ERROR',
        code: 'NO_VOLUME',
        componentId: comp.id,
        message: `"${comp.name}" has no usable volume: ${reason ?? 'no value proposed'}.`,
        remedy: 'Supply a stock and final concentration in compatible units, or enter a volume directly.',
      });
    }

    let deviation: number | null = null;
    if (computed !== null && proposed !== null && computed > 0) {
      deviation = (proposed - computed) / computed;
      if (Math.abs(deviation) > tolerance) {
        findings.push({
          severity: Math.abs(deviation) > 0.1 ? 'ERROR' : 'WARNING',
          code: 'STOICHIOMETRY_DEVIATION',
          componentId: comp.id,
          message:
            `"${comp.name}": the protocol specifies ${formatNum(proposed)} µL, but C1V1=C2V2 gives ` +
            `${formatNum(computed)} µL (${deviation > 0 ? '+' : ''}${(deviation * 100).toFixed(1)}%). ${derivation ?? ''}`,
          remedy: preferComputed
            ? `Using the computed value ${formatNum(computed)} µL.`
            : `Review the stock/final concentrations for this component.`,
        });
      }
    }

    if (computed === null && reason) {
      findings.push({
        severity: 'WARNING',
        code: 'UNVERIFIABLE_COMPONENT',
        componentId: comp.id,
        message: `"${comp.name}" could not be independently verified: ${reason}`,
        remedy:
          reason.includes('molecular weight')
            ? 'Add a molecular weight (g/mol) to enable mass/molar conversion.'
            : 'Check that stock and final concentrations use compatible units.',
      });
    }

    // Achieved final concentration given the volume actually in use.
    let achievedFinalConc: number | null = null;
    let achievedFinalUnit: string | null = null;
    if (
      comp.stockConc !== undefined &&
      comp.stockUnit &&
      comp.finalUnit &&
      targetVolume > 0 &&
      Number.isFinite(chosen)
    ) {
      const back = conversionFactor(comp.stockUnit, comp.finalUnit, comp.molecularWeight);
      if (back.ok === true) {
        const inFinalUnits = comp.stockConc * (back as ConversionOk).factor;
        achievedFinalConc = roundTo((inFinalUnits * chosen) / targetVolume, 6);
        achievedFinalUnit = parseUnit(comp.finalUnit).canonical;
      }
    }

    const isBelowFloor = roleInfo.role !== 'DILUENT' && chosen > 0 && chosen < minPipettable;
    let dilution: IntermediateDilution | null = null;
    if (isBelowFloor) {
      dilution = buildIntermediateDilution(comp, chosen, minPipettable);
      findings.push({
        severity: 'WARNING',
        code: 'BELOW_MIN_PIPETTABLE',
        componentId: comp.id,
        message:
          `"${comp.name}" requires ${formatNum(chosen)} µL, below the ${minPipettable} µL accurate-pipetting floor.`,
        remedy: dilution ? dilution.recipe : 'Prepare an intermediate dilution of this stock.',
      });
    }

    results.push({
      id: comp.id,
      name: comp.name,
      role: roleInfo.role,
      roleInferred: roleInfo.inferred,
      volPerRxnMicroliters: roundTo(chosen, decimals),
      provenance,
      computedVolumeMicroliters: computed === null ? null : roundTo(computed, decimals),
      proposedVolumeMicroliters: proposed === null ? null : roundTo(proposed, decimals),
      relativeDeviation: deviation,
      derivation,
      uncomputableReason: reason,
      achievedFinalConc,
      achievedFinalUnit,
      belowMinPipettable: isBelowFloor,
      intermediateDilution: dilution,
    });
  }

  // ---- Volume balance ----
  const diluentIdx = results.findIndex((r) => r.role === 'DILUENT');
  const nonDiluentSum = results.reduce(
    (sum, r, i) => (i === diluentIdx ? sum : sum + r.volPerRxnMicroliters),
    0
  );

  if (nonDiluentSum > targetVolume + 1e-9) {
    // Previously this case silently inflated the reaction volume. It is an error.
    findings.push({
      severity: 'ERROR',
      code: 'VOLUME_OVERFLOW',
      message:
        `Components sum to ${formatNum(nonDiluentSum)} µL, which exceeds the ${formatNum(targetVolume)} µL ` +
        `target reaction volume by ${formatNum(nonDiluentSum - targetVolume)} µL. Every final concentration ` +
        `in this reaction is therefore lower than specified.`,
      remedy:
        `Either increase the reaction volume to at least ${formatNum(nonDiluentSum)} µL, or use more ` +
        `concentrated stocks so the components fit.`,
    });
    if (diluentIdx >= 0) {
      results[diluentIdx].volPerRxnMicroliters = 0;
      results[diluentIdx].provenance = 'COMPUTED';
    }
  } else if (diluentIdx >= 0) {
    const fill = roundTo(targetVolume - nonDiluentSum, decimals);
    results[diluentIdx].volPerRxnMicroliters = fill;
    results[diluentIdx].provenance = 'COMPUTED';
    results[diluentIdx].derivation =
      `${formatNum(targetVolume)} µL target − ${formatNum(nonDiluentSum)} µL components = ${formatNum(fill)} µL`;
  } else if (targetVolume - nonDiluentSum > 1e-6) {
    findings.push({
      severity: 'WARNING',
      code: 'NO_DILUENT',
      message:
        `Components sum to ${formatNum(nonDiluentSum)} µL but the target is ${formatNum(targetVolume)} µL — ` +
        `${formatNum(targetVolume - nonDiluentSum)} µL is unaccounted for and no diluent is listed.`,
      remedy: 'Add nuclease-free water (or an appropriate buffer) to bring the reaction to volume.',
    });
  }

  const actual = roundTo(results.reduce((s, r) => s + r.volPerRxnMicroliters, 0), decimals);

  return {
    targetVolumeMicroliters: targetVolume,
    actualVolumeMicroliters: actual,
    volumeBalanced: Math.abs(actual - targetVolume) < 0.005,
    components: results,
    findings,
    fullyVerifiable: verifiableCount === inputs.length && inputs.length > 0,
    verifiableComponentCount: verifiableCount,
    totalComponentCount: inputs.length,
  };
}

// ---------------------------------------------------------------------------
// Master mix
// ---------------------------------------------------------------------------

export interface MasterMixOptions {
  sampleCount: number;
  replicates: number;
  posControls: number;
  negControls: number;
  overflowPercent: number;
  minPipettableMicroliters?: number;
  decimals?: number;
}

export interface MasterMixLine {
  id: string;
  name: string;
  role: ComponentRole;
  volPerRxnMicroliters: number;
  /** Volume to prepare in the shared mix. Zero for PER_SAMPLE components. */
  volForRunMicroliters: number;
  includedInMix: boolean;
  note?: string;
}

export interface MasterMixResult {
  totalReactions: number;
  effectiveReactions: number;
  overflowPercent: number;
  lines: MasterMixLine[];
  masterMixVolumePerReaction: number;
  masterMixTotalVolume: number;
  perSampleVolumePerReaction: number;
  findings: CalculationFinding[];
}

/** Reaction count from the experimental design. Single source of truth. */
export function totalReactions(o: Pick<MasterMixOptions, 'sampleCount' | 'replicates' | 'posControls' | 'negControls'>): number {
  const samples = Math.max(0, Math.floor(o.sampleCount || 0));
  const reps = Math.max(1, Math.floor(o.replicates || 1));
  const pos = Math.max(0, Math.floor(o.posControls || 0));
  const neg = Math.max(0, Math.floor(o.negControls || 0));
  return samples * reps + pos + neg;
}

/**
 * Scale a reaction into a master mix.
 *
 * Critically: PER_SAMPLE components (template, sample, gDNA) are NOT scaled into
 * the shared mix — they are added to each tube individually. The previous Excel
 * and Word exports scaled every component, overstating template consumption on
 * every sheet.
 */
export function calculateMasterMix(
  calc: ReactionCalculation,
  options: MasterMixOptions
): MasterMixResult {
  const decimals = options.decimals ?? 2;
  const findings: CalculationFinding[] = [];

  const n = totalReactions(options);
  const overflow = Number.isFinite(options.overflowPercent) ? Math.max(0, options.overflowPercent) : 10;
  const effective = n * (1 + overflow / 100);

  if (n === 0) {
    findings.push({
      severity: 'ERROR',
      code: 'ZERO_REACTIONS',
      message: 'The experimental design yields zero reactions.',
      remedy: 'Set a sample count, or add positive/negative controls.',
    });
  }

  const lines: MasterMixLine[] = calc.components.map((c) => {
    const inMix = c.role !== 'PER_SAMPLE';
    return {
      id: c.id,
      name: c.name,
      role: c.role,
      volPerRxnMicroliters: c.volPerRxnMicroliters,
      volForRunMicroliters: inMix ? roundTo(c.volPerRxnMicroliters * effective, decimals) : 0,
      includedInMix: inMix,
      note: inMix ? undefined : 'Added per tube — excluded from the shared master mix.',
    };
  });

  const mixPerRxn = roundTo(
    lines.filter((l) => l.includedInMix).reduce((s, l) => s + l.volPerRxnMicroliters, 0),
    decimals
  );
  const perSamplePerRxn = roundTo(
    lines.filter((l) => !l.includedInMix).reduce((s, l) => s + l.volPerRxnMicroliters, 0),
    decimals
  );
  const mixTotal = roundTo(mixPerRxn * effective, decimals);

  const minPip = options.minPipettableMicroliters ?? 0.5;
  for (const l of lines) {
    if (l.includedInMix && l.volForRunMicroliters > 0 && l.volForRunMicroliters < minPip) {
      findings.push({
        severity: 'WARNING',
        code: 'MIX_VOLUME_BELOW_FLOOR',
        componentId: l.id,
        message: `Master mix requires only ${formatNum(l.volForRunMicroliters)} µL of "${l.name}" for the whole run.`,
        remedy: 'Scale the batch up, or prepare an intermediate dilution.',
      });
    }
  }

  return {
    totalReactions: n,
    effectiveReactions: roundTo(effective, 2),
    overflowPercent: overflow,
    lines,
    masterMixVolumePerReaction: mixPerRxn,
    masterMixTotalVolume: mixTotal,
    perSampleVolumePerReaction: perSamplePerRxn,
    findings,
  };
}
