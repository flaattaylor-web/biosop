import { SopDocument, ReactionSheet, ReagentComponent, StepByStepReactionStep } from '../types';
import { checkEquipmentInventory } from './equipmentCheck';
import { calculateReaction, ComponentInput } from '../core/reactionMath';
import { auditProtocol } from '../core/auditor';

export function buildStepByStepFromSop(sop: SopDocument, components: ReagentComponent[]): StepByStepReactionStep[] {
  if (!sop.steps || sop.steps.length === 0) {
    return [];
  }

  return sop.steps.map((sopStep, index) => {
    let cond = 'Biosafety Cabinet / Lab Bench';
    if (sopStep.tempCelsius !== undefined) {
      if (sopStep.tempCelsius <= 4) cond = 'Cold Chain (4°C / On Ice)';
      else if (sopStep.tempCelsius >= 90) cond = `Thermal Block / Incubator (${sopStep.tempCelsius}°C)`;
      else cond = `Controlled Temp (${sopStep.tempCelsius}°C)`;
    }

    const stepReagents: { reagentName: string; volPerRxnMicroliters: number; finalAmountOrConc?: string; notes?: string }[] = [];
    const instLower = (sopStep.instruction || '').toLowerCase();
    const titleLower = (sopStep.title || '').toLowerCase();
    const fullText = `${titleLower} ${instLower}`;

    const isMasterMixStep =
      fullText.includes('master mix') ||
      fullText.includes('reagent preparation') ||
      fullText.includes('thawing') ||
      fullText.includes('prepare mix') ||
      fullText.includes('combine') ||
      index === 0 ||
      (index === 2 && fullText.includes('preparation'));

    const isSampleAdditionStep =
      fullText.includes('template') ||
      fullText.includes('aliquot') ||
      fullText.includes('add sample') ||
      fullText.includes('add dna') ||
      fullText.includes('add rna') ||
      fullText.includes('dispense');

    const isPurelyThermalOrMechanical =
      fullText.includes('thermal cycling') ||
      fullText.includes('thermocycler') ||
      fullText.includes('centrifuge') ||
      fullText.includes('vortex') ||
      fullText.includes('decontamination') ||
      fullText.includes('incubate at') ||
      fullText.includes('hold at');

    components.forEach((comp) => {
      const compNameLower = comp.name.toLowerCase();
      const matchByName =
        instLower.includes(compNameLower) ||
        titleLower.includes(compNameLower);

      if (matchByName) {
        stepReagents.push({
          reagentName: comp.name,
          volPerRxnMicroliters: comp.volPerRxnMicroliters,
          finalAmountOrConc: `${comp.finalConc} ${comp.finalUnit}`,
          notes: comp.notes || `Stock: ${comp.stockConc} ${comp.stockUnit}`
        });
      }
    });

    // Fallback if no direct name match was found
    if (stepReagents.length === 0 && components.length > 0 && !isPurelyThermalOrMechanical) {
      if (isMasterMixStep) {
        // Master Mix Step: Include all components EXCEPT template / biological sample
        components.forEach((c) => {
          const cName = c.name.toLowerCase();
          const isSample = cName.includes('template') || cName.includes('sample') || cName.includes('cell') || cName.includes('gdna') || cName.includes('mrna');
          if (!isSample) {
            stepReagents.push({
              reagentName: c.name,
              volPerRxnMicroliters: c.volPerRxnMicroliters,
              finalAmountOrConc: `${c.finalConc} ${c.finalUnit}`,
              notes: c.notes || `Stock: ${c.stockConc} ${c.stockUnit}`
            });
          }
        });
      } else if (isSampleAdditionStep) {
        // Sample Addition Step: Include template/sample components
        components.forEach((c) => {
          const cName = c.name.toLowerCase();
          const isSample = cName.includes('template') || cName.includes('sample') || cName.includes('cell') || cName.includes('gdna') || cName.includes('mrna');
          if (isSample) {
            stepReagents.push({
              reagentName: c.name,
              volPerRxnMicroliters: c.volPerRxnMicroliters,
              finalAmountOrConc: `${c.finalConc} ${c.finalUnit}`,
              notes: c.notes || `Stock: ${c.stockConc} ${c.stockUnit}`
            });
          }
        });
      }
    }

    const stepMasterMixVol = stepReagents.reduce((acc, curr) => acc + (curr.volPerRxnMicroliters || 0), 0);

    let phase = 'Reaction Step';
    if (index === 0) phase = 'Preparation & Master Mix Assembly';
    else if (index === 1) phase = 'Reagent Addition & Aliquoting';
    else if (index === sop.steps.length - 1) phase = 'Incubation, Thermal Profile & Analysis';
    else phase = 'Reaction Procedure';

    return {
      stepNumber: sopStep.stepNumber || index + 1,
      stepName: sopStep.title || `Step ${index + 1}`,
      phase,
      tempCelsius: sopStep.tempCelsius,
      timingMinutes: sopStep.timingMinutes,
      conditions: cond,
      reagentsAndVolumes: stepReagents,
      stepMasterMixVolumeMicroliters: stepMasterMixVol,
      instructions: sopStep.instruction,
      criticalCheckpoint: sopStep.criticalCheckpoint,
      safetyWarning: sopStep.safetyWarning
    };
  });
}

export function ensureReactionSheet(sop: SopDocument): ReactionSheet {
  let sheet: ReactionSheet;

  if (sop.reactionSheet && Array.isArray(sop.reactionSheet.components) && sop.reactionSheet.components.length > 0) {
    sheet = {
      ...sop.reactionSheet,
      isDeNovo: sop.isDeNovo || sop.reactionSheet.isDeNovo,
      generationMode: sop.generationMode || sop.reactionSheet.generationMode
    };
  } else {
    // Generate reaction components from reagents required
    const reagents = (sop.reagentsRequired && sop.reagentsRequired.length > 0)
      ? sop.reagentsRequired
      : [
          'Nuclease-Free Water',
          '2X Reaction Master Mix Buffer',
          'Forward Primer / Substrate A',
          'Reverse Primer / Substrate B',
          'Enzyme / Catalyst',
          'Target Template / Sample'
        ];

    const components = reagents.map((r, idx) => {
      let vol = 5.0;
      let notes = '';
      const nameLower = r.toLowerCase();
      if (nameLower.includes('water') || nameLower.includes('ddh2o') || nameLower.includes('buffer')) {
        vol = 25.0;
        notes = 'Add first';
      } else if (nameLower.includes('primer') || nameLower.includes('oligo')) {
        vol = 1.0;
        notes = 'Keep on ice';
      } else if (nameLower.includes('enzyme') || nameLower.includes('polymerase') || nameLower.includes('taq') || nameLower.includes('cas9')) {
        vol = 0.5;
        notes = 'Add last, keep cold (-20°C)';
      } else if (nameLower.includes('template') || nameLower.includes('sample') || nameLower.includes('dna') || nameLower.includes('rna') || nameLower.includes('cell')) {
        vol = 2.0;
        notes = 'Add directly to individual reaction tubes';
      }

      return {
        id: `c_${idx + 1}`,
        name: r,
        stockConc: 10,
        stockUnit: nameLower.includes('water') ? 'X' : 'µM',
        finalConc: 1,
        finalUnit: nameLower.includes('water') ? 'X' : 'µM',
        volPerRxnMicroliters: vol,
        pipettingOrder: idx + 1,
        notes,
        storageTemp: nameLower.includes('water') ? '20°C' : '-20°C'
      };
    });

    sheet = {
      id: `rxn_${sop.id || Date.now()}`,
      title: `${sop.title} - Reaction Sheet & Master Mix Calculator`,
      assayType: sop.category || 'Molecular Assay',
      isDeNovo: sop.isDeNovo,
      generationMode: sop.generationMode,
      reactionVolumeMicroliters: components.reduce((a, b) => a + b.volPerRxnMicroliters, 0),
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components,
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Initial Denaturation / Incubation', tempCelsius: 95, durationSeconds: 180, cycles: 1 },
        { stepNumber: 2, phase: 'Reaction / Amplification Cycle', tempCelsius: 60, durationSeconds: 30, cycles: 30 },
        { stepNumber: 3, phase: 'Final Hold', tempCelsius: 4, durationSeconds: 0, cycles: 1, notes: 'Hold at 4°C' }
      ],
      plateLayout: {
        numRows: 8,
        numCols: 12,
        wellMapping: {
          'A1': 'control_pos',
          'A2': 'control_neg',
          'A3': 'sample',
          'A4': 'sample',
          'A5': 'sample',
          'A6': 'sample'
        }
      }
    };
  }

  // Ensure stepByStepReactionSteps is always populated directly from SOP
  if (!sheet.stepByStepReactionSteps || sheet.stepByStepReactionSteps.length === 0) {
    sheet.stepByStepReactionSteps = buildStepByStepFromSop(sop, sheet.components);
  } else {
    // Ensure stepMasterMixVolumeMicroliters is calculated for each existing step
    sheet.stepByStepReactionSteps = sheet.stepByStepReactionSteps.map((st) => {
      const stepVol = (st.reagentsAndVolumes || []).reduce((acc, curr) => acc + (curr.volPerRxnMicroliters || 0), 0);
      return {
        ...st,
        stepMasterMixVolumeMicroliters: st.stepMasterMixVolumeMicroliters || stepVol
      };
    });
  }

  return sheet;
}

/**
 * Language models occasionally fall into a repetition loop mid-field — one generated reviewer
 * title ran "Director Controls" several hundred times before drifting into another language.
 * The document is otherwise fine, so the fix is to repair the field rather than reject the run.
 *
 * Detects a phrase of 1-6 words repeated three or more times in a row, keeps one copy, and caps
 * short metadata fields at a sane length.
 */
export function collapseRepetition(text: string): string {
  if (!text || text.length < 60) return text;
  const words = text.split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    let collapsed = false;
    for (let unit = 1; unit <= 6 && i + unit * 3 <= words.length; unit++) {
      const phrase = words.slice(i, i + unit).join(' ').toLowerCase();
      let reps = 1;
      while (
        i + unit * (reps + 1) <= words.length &&
        words.slice(i + unit * reps, i + unit * (reps + 1)).join(' ').toLowerCase() === phrase
      ) reps++;
      if (reps >= 3) {
        out.push(...words.slice(i, i + unit));
        i += unit * reps;
        collapsed = true;
        break;
      }
    }
    if (!collapsed) out.push(words[i++]);
  }
  return out.join(' ');
}

/** Repetition-collapsed and length-capped, for fields that should be a line rather than an essay. */
export function cleanMetadataField(text: string | undefined, maxChars: number): string | undefined {
  if (typeof text !== 'string') return text;
  const collapsed = collapseRepetition(text).trim();
  if (collapsed.length <= maxChars) return collapsed;
  const cut = collapsed.slice(0, maxChars);
  const lastBreak = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '), cut.lastIndexOf(' '));
  return (lastBreak > maxChars * 0.6 ? cut.slice(0, lastBreak) : cut).trim();
}

/** Coerces a value the model may have emitted as an object or number into displayable text. */
function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join('; ');
  const vals = Object.values(v as Record<string, unknown>).map(asText).filter(Boolean);
  return vals.join(' — ');
}

/** Everything the UI iterates over must be an array of the shape it expects, or React throws mid-render. */
function coerceShapes(sop: SopDocument): SopDocument {
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const textList = (v: unknown): string[] => arr<unknown>(v).map(asText).filter(Boolean);

  return {
    ...sop,
    steps: arr<Record<string, unknown>>(sop.steps).map((st, i) => ({
      ...st,
      stepNumber: typeof st.stepNumber === 'number' ? st.stepNumber : i + 1,
      title: asText(st.title) || `Step ${i + 1}`,
      instruction: asText(st.instruction),
    })) as SopDocument['steps'],
    qualityControl: textList(sop.qualityControl),
    equipmentRequired: textList(sop.equipmentRequired),
    reagentsRequired: textList(sop.reagentsRequired),
    hazards: arr<Record<string, unknown>>(sop.hazards).map((h) => ({
      ...h,
      label: asText(h.label) || 'Hazard',
      description: asText(h.description),
    })) as SopDocument['hazards'],
    ppeRequirements: arr<unknown>(sop.ppeRequirements).map((pRaw) => {
      const item = pRaw as Record<string, unknown>;
      return typeof pRaw === 'string'
        ? { item: pRaw, required: true }
        : { ...item, item: asText(item.item) || 'PPE', required: item.required !== false };
    }) as SopDocument['ppeRequirements'],
    troubleshooting: arr<Record<string, unknown>>(sop.troubleshooting).map((t) => ({
      issue: asText(t.issue),
      cause: asText(t.cause),
      solution: asText(t.solution),
    })),
    references: arr<Record<string, unknown>>(sop.references).map((r) => ({
      ...r,
      citation: asText(r.citation),
    })) as SopDocument['references'],
    revisionHistory: arr<Record<string, unknown>>(sop.revisionHistory).map((r) => ({
      version: asText(r.version),
      date: asText(r.date),
      changes: asText(r.changes),
      author: asText(r.author),
    })),
  };
}

export function sanitizeAndValidateSop(sop: SopDocument): SopDocument {
  if (!sop) return sop;

  // A protocol the model shaped unexpectedly — steps omitted entirely, QC criteria emitted as
  // objects instead of strings — used to throw inside React's render and blank the whole page.
  // Normalise the shape here, before any view touches it.
  const sanitized: SopDocument = coerceShapes(sop);

  // Repair runaway repetition before anything else reads these fields.
  sanitized.title = cleanMetadataField(sanitized.title, 300) as string;
  sanitized.author = cleanMetadataField(sanitized.author, 200) as string;
  sanitized.reviewer = cleanMetadataField(sanitized.reviewer, 200);
  sanitized.category = cleanMetadataField(sanitized.category, 120) as string;
  sanitized.documentId = cleanMetadataField(sanitized.documentId, 60) as string;
  sanitized.scope = collapseRepetition(sanitized.scope || '');
  if (Array.isArray(sanitized.steps)) {
    sanitized.steps = sanitized.steps.map((st) => ({
      ...st,
      title: cleanMetadataField(st.title, 200) as string,
      instruction: collapseRepetition(st.instruction || ''),
    }));
  }

  if (!sanitized.documentId) {
    sanitized.documentId = `SOP-${(sanitized.category || 'BIO').substring(0, 3).toUpperCase()}-2026-${Math.floor(100 + Math.random() * 900)}`;
  }
  if (!sanitized.version) sanitized.version = '1.0';
  if (!sanitized.effectiveDate) sanitized.effectiveDate = new Date().toISOString().split('T')[0];
  if (!sanitized.biosafetyLevel) sanitized.biosafetyLevel = 'BSL-1';

  // Ensure Hazards list is complete & realistic
  if (!sanitized.hazards || sanitized.hazards.length === 0) {
    sanitized.hazards = [
      { type: 'BIOHAZARD', label: 'Biohazard Level', description: `Handled under ${sanitized.biosafetyLevel} containment protocol.` },
      { type: 'CHEMICAL', label: 'Reagent Hazards', description: 'Reagents may cause mild skin/eye irritation. Handle in ventilated hood.' },
      { type: 'TOXIC', label: 'Thermal / Chemical Hazards', description: 'High operational temperatures up to 98°C and active enzyme solutions.' }
    ];
  }

  // Ensure PPE Requirements are complete
  if (!sanitized.ppeRequirements || sanitized.ppeRequirements.length === 0) {
    sanitized.ppeRequirements = [
      { item: 'Nitrile Powder-Free Gloves', required: true, notes: 'Change immediately upon chemical or biological contact.' },
      { item: 'Standard Flame-Resistant Lab Coat', required: true, notes: 'Buttoned fully during all bench operations.' },
      { item: 'ANSI Z87.1 Safety Glasses', required: true, notes: 'Wear continuously in active laboratory zones.' },
      { item: 'Chemical / Biosafety Fume Hood', required: sanitized.biosafetyLevel !== 'BSL-1', notes: 'Utilize for volatile or infectious operations.' }
    ];
  }

  // Ensure Quality Control benchmarks exist
  if (!sanitized.qualityControl || sanitized.qualityControl.length === 0) {
    sanitized.qualityControl = [
      'Include No Template Control (NTC) in every batch run to verify zero reagent contamination.',
      'Run Positive Calibration Reference Control to confirm enzyme efficiency and detection sensitivity.',
      'Verify spectrophotometric purity ratios (A260/A280 = 1.8–2.0 for DNA; 2.0–2.2 for RNA) prior to amplification.'
    ];
  }

  // Ensure Troubleshooting guide exists
  if (!sanitized.troubleshooting || sanitized.troubleshooting.length === 0) {
    sanitized.troubleshooting = [
      { issue: 'No product amplification / zero signal', cause: 'Enzyme denaturation, expired reagents, or improper annealing temperature.', solution: 'Verify enzyme storage at -20°C, run gradient temperature optimization, and test fresh primer stocks.' },
      { issue: 'NTC contamination / false positive signal', cause: 'Cross-contamination of master mix with template DNA or aerosol carrying.', solution: 'Decontaminate pipettes with 10% bleach / UV irradiation, use filter barrier tips, and prepare fresh aliquots.' },
      { issue: 'Non-specific band forming or primer dimers', cause: 'Excessive primer concentration or non-optimal annealing temperature.', solution: 'Increase annealing temperature by 1–3°C or reduce primer concentration to 0.2 µM.' }
    ];
  }

  // Ensure Literature References exist
  if (!sanitized.references || sanitized.references.length === 0) {
    sanitized.references = [
      { citation: 'Sambrook, J., & Russell, D. W. (2001). Molecular Cloning: A Laboratory Manual (3rd ed.). Cold Spring Harbor Laboratory Press.', doiOrUrl: 'https://doi.org/10.1016/B978-0-12-818549-0.00001-9', summary: 'Standard benchmark literature for molecular biology and laboratory quality assurance.' }
    ];
  }

  // Ensure ReactionSheet exists
  const sheet = ensureReactionSheet(sanitized);

  // ---- Deterministic reaction calculation (src/core/reactionMath) ----
  // The model proposes concentrations; the engine derives volumes. Nothing is
  // silently rewritten: every deviation from the proposed value is recorded as
  // a finding, and the derivation is kept on each component.
  const targetTotalVol = sheet.reactionVolumeMicroliters && sheet.reactionVolumeMicroliters > 0
    ? sheet.reactionVolumeMicroliters
    : 50;

  const inputs: ComponentInput[] = sheet.components.map((c) => ({
    id: c.id,
    name: c.name,
    stockConc: c.stockConc,
    stockUnit: c.stockUnit,
    finalConc: c.finalConc,
    finalUnit: c.finalUnit,
    volPerRxnMicroliters: c.volPerRxnMicroliters,
    pipettingOrder: c.pipettingOrder,
    role: c.role,
    molecularWeight: c.molecularWeight,
    notes: c.notes,
  }));

  const calc = calculateReaction(inputs, { targetVolumeMicroliters: targetTotalVol });

  // If the engine could not find a diluent and volume is short, add water so
  // the reaction balances — but ONLY when there is a genuine gap, and record it.
  let components: ReagentComponent[] = sheet.components.map((c) => {
    const r = calc.components.find((x) => x.id === c.id);
    return r
      ? { ...c, volPerRxnMicroliters: r.volPerRxnMicroliters, role: r.role }
      : { ...c };
  });

  const hasDiluent = calc.components.some((r) => r.role === 'DILUENT');
  const shortfall = calc.targetVolumeMicroliters - calc.actualVolumeMicroliters;
  if (!hasDiluent && shortfall > 0.005) {
    components.unshift({
      id: 'c_water',
      name: 'Nuclease-Free Water',
      stockConc: 1,
      stockUnit: 'X',
      finalConc: 1,
      finalUnit: 'X',
      volPerRxnMicroliters: Number(shortfall.toFixed(2)),
      pipettingOrder: 0,
      notes: 'Added by the calculator to bring the reaction to volume.',
      storageTemp: 'RT',
      role: 'DILUENT',
    });
    // Re-run so the calculation object reflects the water we just added.
    const calc2 = calculateReaction(
      components.map((c) => ({
        id: c.id, name: c.name, stockConc: c.stockConc, stockUnit: c.stockUnit, finalConc: c.finalConc,
        finalUnit: c.finalUnit, volPerRxnMicroliters: c.volPerRxnMicroliters, pipettingOrder: c.pipettingOrder,
        role: c.role, molecularWeight: c.molecularWeight, notes: c.notes,
      })),
      { targetVolumeMicroliters: targetTotalVol }
    );
    sanitized.reactionCalculation = calc2;
    components = components.map((c) => {
      const r = calc2.components.find((x) => x.id === c.id);
      return r ? { ...c, volPerRxnMicroliters: r.volPerRxnMicroliters, role: r.role } : c;
    });
  } else {
    sanitized.reactionCalculation = calc;
  }

  // Do NOT redefine the reaction volume to whatever the components sum to. If
  // they overflow, that is an ERROR finding the user must resolve.
  sheet.reactionVolumeMicroliters = targetTotalVol;
  sheet.components = components;

  // Only rebuild step-by-step reagent assignments when the model did not
  // provide them. Previously this was unconditional and discarded the model's
  // per-step master mixes.
  const modelProvidedSteps = Array.isArray(sheet.stepByStepReactionSteps) &&
    sheet.stepByStepReactionSteps.some((st) => (st.reagentsAndVolumes || []).length > 0);
  if (!modelProvidedSteps) {
    sheet.stepByStepReactionSteps = buildStepByStepFromSop(sanitized, components);
  } else {
    // Keep the model's assignments but sync volumes to the engine's numbers.
    sheet.stepByStepReactionSteps = sheet.stepByStepReactionSteps!.map((st) => {
      const rv = (st.reagentsAndVolumes || []).map((r) => {
        const comp = components.find((c) => c.name.toLowerCase() === (r.reagentName || '').toLowerCase());
        return comp ? { ...r, volPerRxnMicroliters: comp.volPerRxnMicroliters } : r;
      });
      return {
        ...st,
        reagentsAndVolumes: rv,
        stepMasterMixVolumeMicroliters: rv.reduce((a, r) => a + (r.volPerRxnMicroliters || 0), 0),
      };
    });
  }

  sanitized.reactionSheet = sheet;

  // Run or refresh Equipment Inventory Verification Check
  if (!sanitized.equipmentInventoryCheck || sanitized.equipmentRequired) {
    sanitized.equipmentInventoryCheck = checkEquipmentInventory(sanitized.equipmentRequired || []);
  }

  // Honest audit (src/core/auditor). This CAN fail. The legacy clamped
  // accuracyAuditReport is intentionally no longer generated.
  sanitized.auditReport = auditProtocol(sanitized, sanitized.reactionCalculation || null);
  delete (sanitized as { accuracyAuditReport?: unknown }).accuracyAuditReport;

  return sanitized;
}
