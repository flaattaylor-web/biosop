import {
  SopDocument,
  LabEquipmentItem,
  EquipmentMatchItem,
  EquipmentInventoryCheck,
  EquipmentCategory,
  EquipmentSubstitution
} from '../types';
import { DEFAULT_LAB_EQUIPMENT_INVENTORY } from '../data/labEquipmentInventory';

/**
 * Standard Hardware Substitutions database for common molecular biology equipment
 */
/* ---------------------------------------------------------------- matching helpers

   Three real mis-matches this replaces, all seen in generated documents:
     - a 20-200 uL pipette "matched" to the lab's 2-20 uL one, because both names
       contain "8-channel";
     - "Single channel pipettes (P2...P1000)" matched to an 8-channel pipette;
     - "Covaris microTUBE AFA Fiber Snap-Cap (130 uL)" — a plastic consumable —
       matched to the Covaris instrument, because both names contain "covaris".
------------------------------------------------------------------------------- */

/** Consumables are not hardware; they must not be matched to an instrument or scored as one. */
const CONSUMABLE_RE = /microtube|snap-?cap|afa fiber|screentape|filter tips?|\btips?\b|pcr plate|96-well plate|\bflow cell\b|cartridge|spri\s?select|ampure|assay kit|reagent kit|\bstrips?\b/i;
const INSTRUMENT_WORD_RE = /stand|rack|magnet|centrifuge|cycler|sequencer|reader|analyz|station|mixer|hood|freezer|incubator|pipette|fluorometer|spectrophotometer|ultrasonicator|thermomixer/i;

export function isConsumable(requirement: string): boolean {
  return CONSUMABLE_RE.test(requirement) && !INSTRUMENT_WORD_RE.test(requirement);
}

function parseVolumeRange(s: string): { min: number; max: number } | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:–|—|-|to)\s*(\d+(?:\.\d+)?)\s*(?:µ|u)\s?l/i);
  return m ? { min: parseFloat(m[1]), max: parseFloat(m[2]) } : null;
}

function channelCount(s: string): number | null {
  if (/\b12[-\s]?channel\b/i.test(s)) return 12;
  if (/\b8[-\s]?channel\b/i.test(s)) return 8;
  if (/single[-\s]?channel/i.test(s) || /\bp(?:2|10|20|200|1000)\b/i.test(s)) return 1;
  if (/multi-?channel/i.test(s)) return 8;
  return null;
}

function isPipetteRequest(s: string): boolean {
  return /pipette|pipettor|micropipette|\bp(?:2|10|20|200|1000)\b/i.test(s);
}

/** A pipette matches only when the channel count agrees AND its range covers what is asked for. */
function pipetteMatches(requirement: string, inventoryName: string): boolean {
  const reqChannels = channelCount(requirement);
  const invChannels = channelCount(inventoryName);
  if (reqChannels !== null && invChannels !== null && reqChannels !== invChannels) return false;

  const reqRange = parseVolumeRange(requirement);
  const invRange = parseVolumeRange(inventoryName);
  if (reqRange && invRange) {
    return invRange.min <= reqRange.min + 1e-9 && invRange.max >= reqRange.max - 1e-9;
  }
  // No range stated on one side: channel agreement is the most we can honestly assert.
  return reqChannels === null || invChannels === null || reqChannels === invChannels;
}

const COMMON_HARDWARE_SUBSTITUTIONS: Record<string, {
  alternativeEquipment: string;
  category: EquipmentCategory;
  adjustmentNotes: string;
  compatibilityScore: number;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  parameterAdjustments: string[];
}> = {
  microfluidics: {
    alternativeEquipment: 'Manual Serial Dilution & Microplate Partitioning (or Chromium X System)',
    category: 'MICROFLUIDICS',
    adjustmentNotes: 'Microfluidic partitioning unit under maintenance. Use Chromium X or delegate run to external core facility.',
    compatibilityScore: 70,
    impactLevel: 'HIGH',
    parameterAdjustments: [
      'Confirm chip loading order manually within 2 minutes of master mix preparation',
      'Verify emulsion integrity under brightfield microscope before thermocycling'
    ]
  },
  cell_counter: {
    alternativeEquipment: 'Hemocytometer & Brightfield Light Microscopy with Trypan Blue (0.4%)',
    category: 'CELL_COUNTER',
    adjustmentNotes: 'Automated cell counter unavailable. Perform manual cell chamber count using 1:1 Trypan Blue dilution on Neubauer hemocytometer.',
    compatibilityScore: 90,
    impactLevel: 'LOW',
    parameterAdjustments: [
      'Mix 10 µL cell suspension with 10 µL 0.4% Trypan Blue (2x dilution factor)',
      'Count at least 4 corner quadrant grids (64 small squares) for accurate viability %'
    ]
  },
  fluorometer: {
    alternativeEquipment: 'Thermo Scientific NanoDrop One Microvolume UV-Vis Spectrophotometer',
    category: 'SPECTROPHOTOMETER',
    adjustmentNotes: 'Fluorescence-based dye quantification unavailable. Measure concentration via UV absorbance at A260 nm.',
    compatibilityScore: 82,
    impactLevel: 'MEDIUM',
    parameterAdjustments: [
      'UV spectrophotometry may overestimate yield if residual primers or dNTPs are present',
      'Ensure A260/A280 ratio is between 1.8 and 2.0 before proceeding'
    ]
  },
  capillary_electrophoresis: {
    alternativeEquipment: '1.5% High-Resolution Agarose Gel Electrophoresis & Gel Doc EZ Imaging',
    category: 'ELECTROPHORESIS',
    adjustmentNotes: 'TapeStation automated capillary system missing/busy. Cast 1.5% TAE agarose gel with Ethidium Bromide / SYBR Safe.',
    compatibilityScore: 85,
    impactLevel: 'MEDIUM',
    parameterAdjustments: [
      'Run gel at 100V for 45 minutes with 100 bp DNA Ladder',
      'Gel imaging provides qualitative size verification; quantify band density via Gel Doc software'
    ]
  },
  shaker_incubator: {
    alternativeEquipment: 'Water Bath / Dry Heat Block (56°C) + Manual Vortexing every 5 minutes',
    category: 'SHAKER_INCUBATOR',
    adjustmentNotes: 'Thermomixer with active shaking unavailable. Incubate in standard heat block and pulse vortex manually.',
    compatibilityScore: 88,
    impactLevel: 'LOW',
    parameterAdjustments: [
      'Pulse-vortex samples for 5 seconds every 5 minutes during the 30-minute incubation'
    ]
  },
  sonicator: {
    alternativeEquipment: 'Enzymatic Fragmentation (NEBNext dsDNA Fragmentase / Illumicase)',
    category: 'OTHER',
    adjustmentNotes: 'Mechanical shearing sonicator unavailable. Substitute with 15-minute enzymatic fragmentation reaction at 37°C.',
    compatibilityScore: 92,
    impactLevel: 'MEDIUM',
    parameterAdjustments: [
      'Incubate with Fragmentase at 37°C for exactly 15 minutes',
      'Stop reaction immediately by adding 5 µL 0.5 M EDTA (pH 8.0)'
    ]
  },
  realtime_pcr: {
    alternativeEquipment: 'Applied Biosystems Veriti 96-Well Thermal Cycler + End-Point Gel Analysis',
    category: 'THERMOCYCLER',
    adjustmentNotes: 'Real-time qPCR fluorescence instrument missing. Run end-point PCR thermocycling followed by gel or Qubit fluorometry.',
    compatibilityScore: 78,
    impactLevel: 'HIGH',
    parameterAdjustments: [
      'End-point PCR does not generate real-time Cq curves; rely on endpoint band intensity comparison'
    ]
  }
};

/**
 * Checks a protocol's required equipment list against the available lab hardware inventory.
 */
export function checkEquipmentInventory(
  sopEquipment: string[],
  inventory: LabEquipmentItem[] = DEFAULT_LAB_EQUIPMENT_INVENTORY
): EquipmentInventoryCheck {
  if (!sopEquipment || sopEquipment.length === 0) {
    return {
      checkedAt: new Date().toISOString().split('T')[0],
      totalRequired: 0,
      availableCount: 0,
      missingCount: 0,
      overallCompatibilityScore: 100,
      equipmentMatches: [],
      substitutionSummary: 'No specific hardware required for this SOP.'
    };
  }

  const equipmentMatches: EquipmentMatchItem[] = [];
  let availableCount = 0;
  let totalScoreSum = 0;

  for (const req of sopEquipment) {
    const reqLower = req.toLowerCase();

    // Plasticware and kits are ordered, not scheduled. Scoring them as hardware both dilutes the
    // readiness figure and produces nonsense matches like a microTUBE "matched to" a sonicator.
    if (isConsumable(req)) continue;

    // Search for matching item in inventory
    const matchedItem = inventory.find((inv) => {
      const invNameLower = inv.name.toLowerCase();
      if (isPipetteRequest(reqLower)) {
        return inv.category === 'LIQUID_HANDLING' && pipetteMatches(req, inv.name);
      }
      const invMfgLower = (inv.manufacturer || '').toLowerCase();
      const invModelLower = (inv.model || '').toLowerCase();

      // Check key terms
      if (reqLower.includes(invNameLower) || invNameLower.includes(reqLower)) return true;
      if (invModelLower && reqLower.includes(invModelLower)) return true;

      // Functional keyword checks
      if (reqLower.includes('real-time') || reqLower.includes('qpcr') || reqLower.includes('cfx96')) {
        return inv.category === 'THERMOCYCLER' && invNameLower.includes('cfx96');
      }
      if (reqLower.includes('thermal cycler') || reqLower.includes('pcr machine')) {
        return inv.category === 'THERMOCYCLER';
      }
      if (reqLower.includes('centrifuge')) {
        return inv.category === 'CENTRIFUGE';
      }
      if (reqLower.includes('spectrophotometer') || reqLower.includes('nanodrop')) {
        return inv.category === 'SPECTROPHOTOMETER';
      }
      if (reqLower.includes('qubit') || reqLower.includes('fluorometer')) {
        return inv.category === 'FLUOROMETER';
      }
      if (reqLower.includes('tapestation') || reqLower.includes('bioanalyzer') || reqLower.includes('capillary')) {
        return inv.category === 'ELECTROPHORESIS' && invNameLower.includes('tapestation');
      }
      if (reqLower.includes('gel') || reqLower.includes('agarose') || reqLower.includes('geldoc')) {
        return inv.category === 'ELECTROPHORESIS' && invNameLower.includes('gel');
      }
      if (reqLower.includes('magnetic') || reqLower.includes('magnet')) {
        return inv.category === 'MAGNETIC_RACK';
      }
      if (reqLower.includes('thermomixer') || reqLower.includes('heat block') || reqLower.includes('shaker')) {
        return inv.category === 'SHAKER_INCUBATOR';
      }
      if (reqLower.includes('chromium') || reqLower.includes('10x controller') || reqLower.includes('microfluidic')) {
        return inv.category === 'MICROFLUIDICS';
      }
      if (reqLower.includes('countess') || reqLower.includes('cell counter')) {
        return inv.category === 'CELL_COUNTER';
      }
      if (reqLower.includes('covaris') || reqLower.includes('focused-ultrasonicator') || reqLower.includes('afa') || reqLower.includes('shearing')) {
        return inv.name.toLowerCase().includes('covaris') || inv.id.includes('covaris');
      }
      if (reqLower.includes('platefuge') || reqLower.includes('microplate centrifuge') || reqLower.includes('plate spinner')) {
        return inv.name.toLowerCase().includes('platefuge') || inv.id.includes('plate-fuge');
      }
      if (reqLower.includes('speedvac') || reqLower.includes('vacuum concentrator')) {
        return inv.name.toLowerCase().includes('speedvac') || inv.id.includes('speedvac');
      }
      if (reqLower.includes('safety cabinet') || reqLower.includes('fume hood') || reqLower.includes('biosafety')) {
        return inv.category === 'SAFETY_HOOD';
      }

      return false;
    });

    if (matchedItem && matchedItem.status === 'AVAILABLE') {
      availableCount++;
      totalScoreSum += 100;
      equipmentMatches.push({
        requiredEquipment: req,
        isAvailable: true,
        matchedInventoryId: matchedItem.id,
        matchedInventoryName: matchedItem.name,
        category: matchedItem.category,
        status: matchedItem.status
      });
    } else {
      // Hardware is missing or under maintenance
      let substitution: EquipmentSubstitution | undefined = undefined;

      // Find appropriate substitution
      if (reqLower.includes('chromium') || reqLower.includes('10x') || reqLower.includes('microfluidic')) {
        substitution = COMMON_HARDWARE_SUBSTITUTIONS.microfluidics;
      } else if (reqLower.includes('countess') || reqLower.includes('cell counter')) {
        substitution = COMMON_HARDWARE_SUBSTITUTIONS.cell_counter;
      } else if (reqLower.includes('qubit') || reqLower.includes('fluorometer')) {
        const availableNanoDrop = inventory.find(i => i.category === 'SPECTROPHOTOMETER' && i.status === 'AVAILABLE');
        if (availableNanoDrop) {
          substitution = {
            ...COMMON_HARDWARE_SUBSTITUTIONS.fluorometer,
            alternativeEquipment: availableNanoDrop.name
          };
        } else {
          substitution = COMMON_HARDWARE_SUBSTITUTIONS.fluorometer;
        }
      } else if (reqLower.includes('tapestation') || reqLower.includes('bioanalyzer')) {
        substitution = COMMON_HARDWARE_SUBSTITUTIONS.capillary_electrophoresis;
      } else if (reqLower.includes('thermomixer') || reqLower.includes('shaker')) {
        substitution = COMMON_HARDWARE_SUBSTITUTIONS.shaker_incubator;
      } else if (reqLower.includes('sonicator') || reqLower.includes('bioruptor')) {
        substitution = COMMON_HARDWARE_SUBSTITUTIONS.sonicator;
      } else if (reqLower.includes('real-time') || reqLower.includes('qpcr')) {
        substitution = COMMON_HARDWARE_SUBSTITUTIONS.realtime_pcr;
      } else {
        // No catalogued alternative. Previously this branch invented one by echoing the missing
        // instrument's own name back — "Standard Lab Alternative for MinION" rendered as the MinION
        // substituting for itself, at 80% compatibility. Saying nothing is the honest answer, and a
        // sequencer or partitioning instrument has no substitute in any case: it defines the platform.
        substitution = undefined;
      }

      totalScoreSum += substitution?.compatibilityScore ?? 0;
      equipmentMatches.push({
        requiredEquipment: req,
        isAvailable: false,
        matchedInventoryId: matchedItem?.id,
        matchedInventoryName: matchedItem?.name,
        category: matchedItem?.category || substitution?.category,
        status: matchedItem?.status || 'UNAVAILABLE',
        suggestedSubstitution: substitution
      });
    }
  }

  const missingCount = sopEquipment.length - availableCount;
  const overallCompatibilityScore = Math.round(totalScoreSum / sopEquipment.length);

  let substitutionSummary = '';
  if (missingCount === 0) {
    substitutionSummary = '100% Hardware Readiness: All required instruments are available in the lab inventory.';
  } else {
    substitutionSummary = `${availableCount}/${sopEquipment.length} required instruments available. ${missingCount} instrument(s) missing or under maintenance — substitutions generated.`;
  }

  return {
    checkedAt: new Date().toISOString().split('T')[0],
    totalRequired: sopEquipment.length,
    availableCount,
    missingCount,
    overallCompatibilityScore,
    equipmentMatches,
    substitutionSummary
  };
}

/**
 * Applies a selected equipment substitution to an SOP, replacing required equipment and updating step instructions.
 */
export function applyEquipmentSubstitution(
  sop: SopDocument,
  originalEquipmentName: string,
  substitution: EquipmentSubstitution
): SopDocument {
  // Replace in equipmentRequired array
  const updatedEquipmentRequired = sop.equipmentRequired.map((e) =>
    e === originalEquipmentName ? substitution.alternativeEquipment : e
  );

  // Update steps where the original equipment is mentioned
  const origLower = originalEquipmentName.toLowerCase();
  const updatedSteps = sop.steps.map((step) => {
    let inst = step.instruction;
    if (inst.toLowerCase().includes(origLower)) {
      inst = `${inst} [Substituted hardware: ${substitution.alternativeEquipment} — ${substitution.adjustmentNotes}]`;
    }

    return {
      ...step,
      instruction: inst
    };
  });

  // Create updated SOP copy
  const updatedSop: SopDocument = {
    ...sop,
    equipmentRequired: updatedEquipmentRequired,
    steps: updatedSteps
  };

  // Re-run inventory check on the updated SOP
  updatedSop.equipmentInventoryCheck = checkEquipmentInventory(updatedSop.equipmentRequired);

  return updatedSop;
}
