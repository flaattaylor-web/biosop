export type BioSafetyLevel = 'BSL-1' | 'BSL-2' | 'BSL-3';

export type HazardType = 'BIOHAZARD' | 'CHEMICAL' | 'CORROSIVE' | 'FLAMMABLE' | 'TOXIC' | 'SHARPS' | 'MUTAGEN';

export interface HazardInfo {
  type: HazardType;
  label: string;
  description: string;
}

export interface PpeRequirement {
  item: string;
  required: boolean;
  notes?: string;
}

export interface BiotechStockReagent {
  id: string;
  name: string;
  synonyms?: string[];
  category:
    | 'Buffers & Salts'
    | 'Enzymes & Master Mixes'
    | 'Nucleotides & Cofactors'
    | 'Antibiotics & Selection'
    | 'Detergents & Additives'
    | 'Transfection & Cell Culture'
    | 'Dyes, Stains & Ladders';
  standardStockConc: number;
  stockUnit: string;
  stockDisplayString: string;
  recommendedFinalConc: number;
  finalUnit: string;
  recommendedFinalDisplayString: string;
  storageCondition: string;
  storageTempBucket: '-80°C' | '-20°C' | '4°C' | '15–25°C RT';
  shelfLife: string;
  hazardClassification?: string;
  preparationNotes: string;
  aliquotGuidance?: string;
  casNumber?: string;
  molecularWeight?: number;
}

export interface SelectedReagentConstraint {
  reagentId: string;
  name: string;
  category: string;
  stockConc: number;
  stockUnit: string;
  finalConc: number;
  finalUnit: string;
  storageCondition: string;
  storageTempBucket: '-80°C' | '-20°C' | '4°C' | '15–25°C RT';
  preparationNotes: string;
  notes?: string;
}

export type ComponentRole = 'MASTER_MIX' | 'PER_SAMPLE' | 'DILUENT';

export interface ReagentComponent {
  id: string;
  name: string;
  stockConc: number;
  stockUnit: string;
  finalConc: number;
  finalUnit: string;
  volPerRxnMicroliters: number;
  pipettingOrder: number;
  notes?: string;
  storageTemp?: string;
  hazardNote?: string;
  /** MASTER_MIX (shared), PER_SAMPLE (added per tube, never scaled into mix), DILUENT (balances to volume). */
  role?: ComponentRole;
  /** g/mol — enables mass/volume <-> molar conversion in the calculation engine. */
  molecularWeight?: number;
}

export interface ReactionStepItem {
  reagentName: string;
  volPerRxnMicroliters: number;
  finalAmountOrConc?: string;
  notes?: string;
}

export interface CovarisShearingParameters {
  targetBasePairs: number;
  peakIncidentPowerWatts: number;
  dutyFactorPercent: number;
  cyclesPerBurst: number;
  durationSeconds: number;
  waterBathTempCelsius: number;
  tubeType: 'microTUBE AFA Fiber Snap-Cap (130 µL)' | '8 microTUBE Strip' | '96 microTUBE Plate' | 'miniTUBE (200 µL)';
  sampleVolumeMicroliters: number;
  targetDnaInputNg?: number;
  chillerStatus?: string;
  degasLevel?: string;
}

export interface DnaNormalizationSample {
  id: string;
  sampleId: string;
  wellPosition: string; // e.g. "A1", "B2"
  initialConcNgPerUl: number;
  initialVolumeUl?: number;
  targetMassNg: number;
  targetVolumeUl: number;
  sampleVolumeUl: number;
  bufferVolumeUl: number;
  finalConcNgPerUl: number;
  finalMassNg: number;
  status: 'NORMALIZED' | 'TOO_DILUTE' | 'HIGH_CONC_PREDILUTE' | 'INSUFFICIENT_VOLUME';
  warning?: string;
  notes?: string;
}

export interface DnaNormalizationConfig {
  mode: 'TARGET_MASS_AND_VOLUME' | 'TARGET_CONCENTRATION_AND_VOLUME';
  targetMassNg: number;
  targetVolumeUl: number;
  targetConcNgPerUl: number;
  diluentName: string;
  minPipettingVolumeUl: number;
  maxSampleVolumeUl: number;
}

export interface DnaNormalizationResult {
  config: DnaNormalizationConfig;
  samples: DnaNormalizationSample[];
  totalSamples: number;
  normalizedCount: number;
  tooDiluteCount: number;
  highConcCount: number;
  totalDiluentNeededUl: number;
  totalSampleVolumeNeededUl: number;
  averageInputConcNgPerUl: number;
}

export interface StepByStepReactionStep {
  stepNumber: number;
  stepName: string;
  phase: string;
  tempCelsius?: number;
  timingMinutes?: number;
  conditions: string;
  reagentsAndVolumes: ReactionStepItem[];
  stepMasterMixVolumeMicroliters?: number;
  instructions: string;
  criticalCheckpoint?: string;
  safetyWarning?: string;
  stoppingPoint?: string;
  covarisShearing?: CovarisShearingParameters;
}

export interface ThermocyclerStep {
  stepNumber: number;
  phase: string; // e.g. Initial Denaturation, Denaturation, Annealing, Extension, Hold
  tempCelsius: number;
  durationSeconds: number;
  cycles?: number;
  notes?: string;
}

export interface ReactionSheet {
  id: string;
  title: string;
  assayType: string;
  isDeNovo?: boolean;
  generationMode?: 'de_novo' | 'literature_benchmark';
  reactionVolumeMicroliters: number;
  defaultNumReactions: number;
  defaultOverflowPercent: number;
  sampleCount?: number;
  replicates?: number;
  posControls?: number;
  negControls?: number;
  components: ReagentComponent[];
  stepByStepReactionSteps?: StepByStepReactionStep[];
  thermocyclerProfile?: ThermocyclerStep[];
  plateLayout?: {
    numRows: number;
    numCols: number;
    wellMapping: Record<string, 'sample' | 'control_pos' | 'control_neg' | 'standard' | 'blank'>;
  };
  costEstimation?: SopCostEstimation;
  dnaNormalization?: DnaNormalizationResult;
  notes?: string;
}

export interface ReagentCostItem {
  id: string;
  name: string;
  category?: string;
  volPerRxnMicroliters: number;
  unitPricePerPackage: number;
  packageVolumeOrQuantity: number;
  packageUnit: 'µL' | 'mL' | 'L' | 'units' | 'reactions' | 'mg' | 'g' | 'preps';
  costPerMicroliter: number;
  supplier?: string;
  catalogNumber?: string;
  isIncluded: boolean;
  notes?: string;
}

export interface ConsumableCostItem {
  id: string;
  name: string;
  category: 'PLASTICWARE' | 'COLUMNS_FILTERS' | 'TIPS' | 'TUBES_PLATES' | 'PPE_GENERAL';
  unitCost: number;
  quantityPerRun: number;
  unit: string;
  supplier?: string;
  catalogNumber?: string;
  isIncluded: boolean;
}

export interface SopCostEstimation {
  currency: string;
  currencyCode: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';
  reagents: ReagentCostItem[];
  consumables?: ConsumableCostItem[];
  includeConsumables: boolean;
  laborRatePerHour?: number;
  laborHours?: number;
  includeLabor?: boolean;
  sampleCount?: number;
  numReactions?: number;
  overflowPercent?: number;
  customOverheadPercent?: number;
}

export interface SopStep {
  stepNumber: number;
  title: string;
  instruction: string;
  timingMinutes?: number;
  tempCelsius?: number;
  safetyWarning?: string;
  criticalCheckpoint?: string;
  stoppingPoint?: string;
  reagentsAndVolumes?: ReactionStepItem[];
}

export type EquipmentCategory =
  | 'THERMOCYCLER'
  | 'CENTRIFUGE'
  | 'SPECTROPHOTOMETER'
  | 'FLUOROMETER'
  | 'ELECTROPHORESIS'
  | 'MAGNETIC_RACK'
  | 'SHAKER_INCUBATOR'
  | 'LIQUID_HANDLING'
  | 'MICROFLUIDICS'
  | 'SAFETY_HOOD'
  | 'CELL_COUNTER'
  | 'OTHER';

export interface LabEquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  manufacturer: string;
  model: string;
  location: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'DECOMMISSIONED' | 'IN_USE';
  specifications: string;
}

export interface EquipmentSubstitution {
  alternativeEquipment: string;
  category?: EquipmentCategory;
  adjustmentNotes: string;
  compatibilityScore: number; // 0 to 100
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  parameterAdjustments?: string[];
}

export interface EquipmentMatchItem {
  requiredEquipment: string;
  isAvailable: boolean;
  matchedInventoryId?: string;
  matchedInventoryName?: string;
  category?: EquipmentCategory;
  status?: string;
  suggestedSubstitution?: EquipmentSubstitution;
}

export interface EquipmentInventoryCheck {
  checkedAt: string;
  totalRequired: number;
  availableCount: number;
  missingCount: number;
  overallCompatibilityScore: number;
  equipmentMatches: EquipmentMatchItem[];
  substitutionSummary?: string;
}

export interface RequestorInfo {
  name?: string;
  department?: string;
  emailOrRole?: string;
  dateRequested?: string;
}

export interface ReviewerInfo {
  name?: string;
  titleOrRole?: string;
  dateReviewed?: string;
  status?: string; // e.g. Pending, Approved, Revision Requested
  comments?: string;
}

export interface CompanyKitMetadata {
  vendor: string;
  catalogNumber: string;
  officialDocUrl?: string;
  storageConditions: string;
  kitIncludes: string[];
}

export interface SopDocument {
  id: string;
  documentId: string;
  version: string;
  effectiveDate: string;
  title: string;
  category: string;
  companyKitInfo?: CompanyKitMetadata;
  isDeNovo?: boolean;
  generationMode?: 'de_novo' | 'literature_benchmark';
  customTemplateApplied?: boolean;
  customTemplateName?: string;
  author: string;
  reviewer?: string;
  requestorInfo?: RequestorInfo;
  reviewerInfo?: ReviewerInfo;
  scope: string;
  biosafetyLevel: BioSafetyLevel;
  hazards: HazardInfo[];
  ppeRequirements: PpeRequirement[];
  equipmentRequired: string[];
  reagentsRequired: string[];
  steps: SopStep[];
  qualityControl: string[];
  troubleshooting: { issue: string; cause: string; solution: string }[];
  references: {
    citation: string;
    doiOrUrl?: string;
    summary?: string;
    /** Set by /api/literature/verify. Absent = never checked. */
    verificationStatus?: 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'UNCHECKED';
    verificationNote?: string;
    resolvedTitle?: string;
    /** The registry's own citation string, for replacing a wrong one. */
    canonicalCitation?: string;
  }[];
  reactionSheet?: ReactionSheet;
  equipmentInventoryCheck?: EquipmentInventoryCheck;
  dnaNormalization?: DnaNormalizationResult;
  /** @deprecated Score-clamped legacy report. Kept for backward compatibility of stored documents. */
  accuracyAuditReport?: AccuracyAuditReport;
  /** Honest audit from src/core/auditor. Replaces accuracyAuditReport. */
  auditReport?: import('./core/auditor').AuditReport;
  /** Deterministic reaction calculation with provenance. */
  reactionCalculation?: import('./core/reactionMath').ReactionCalculation;
  deNovoBlueprint?: DeNovoProtocolBlueprint;
  revisionHistory: { version: string; date: string; changes: string; author: string }[];
}

export interface LiteratureReference {
  id: string;
  title: string;
  authors: string;
  journalOrSource: string;
  year: number;
  doiOrUrl?: string;
  contentSnippet: string;
}

export interface AiThoughtStep {
  stepNumber: number;
  title: string;
  category: 'INTENT_PARSING' | 'STOICHIOMETRY' | 'BIOSAFETY_QC' | 'LITERATURE_SYNTHESIS' | 'RECOMMENDATION';
  detail: string;
  keyFactors?: string[];
}

export interface ProtocolSuggestion {
  id: string;
  title: string;
  category: string;
  matchScore: number;
  description: string;
  targetHostOrOrganism: string;
  biosafetyLevel: BioSafetyLevel;
  estimatedDuration: string;
  keyReagents: string[];
  scientificRationale: string;
  suggestedTopic: string;
  suggestedCategory: string;
  suggestedAdditionalReqs: string;
  sampleCountDefault?: number;
}

export interface SearchAndSuggestionResult {
  query: string;
  thoughtSteps: AiThoughtStep[];
  suggestions: ProtocolSuggestion[];
  overallAnalysisSummary: string;
}

export type SeverityLevel = 'CRITICAL_HAZARD' | 'CONCENTRATION_DEVIATION' | 'VOLUME_MISMATCH' | 'OPTIMIZATION_SUGGESTION';

export interface Discrepancy {
  id: string;
  category: 'Chemical/Buffer' | 'Stoichiometry/Math' | 'Safety/BSL' | 'Protocol Step' | 'Incubation/Temp';
  severity: SeverityLevel;
  title: string;
  location: string;
  currentValue: string;
  literatureValue: string;
  citation: string;
  explanation: string;
  suggestedFix: string;
}

export interface DeNovoProtocolBlueprint {
  userDescription: string;
  protocolTitle: string;
  targetHostOrOrganism: string;
  category: string;
  biosafetyLevel: BioSafetyLevel;
  startingMaterial: string;
  inputMassOrConcentration: string;
  shearingMethod: 'COVARIS_ACOUSTIC' | 'ENZYMATIC' | 'NONE';
  shearingTargetBp?: number;
  pipettingFormat: '8_CHANNEL_MULTICHANNEL' | 'SINGLE_CHANNEL' | 'HYBRID';
  purificationStrategy: 'SPRI_BEADS' | 'SPIN_COLUMN' | 'NONE';
  keyStepsOutline: string[];
  qcCheckpoints: string[];
  customReagents: string[];
  safeStoppingPoints: string[];
}

export interface AccuracyAuditReport {
  overallScore: number;
  stoichiometryScore: number;
  volumeBalanceScore: number;
  equipmentScore: number;
  reagentCompletenessScore: number;
  safetyAndQcScore: number;
  passedChecks: { category: string; description: string; score: number }[];
  precisionNotes: string[];
}

export interface CrossTestResult {
  testedAt: string;
  overallScore: number; // 0-100
  summary: string;
  passedChecks: number;
  totalChecks: number;
  discrepancies: Discrepancy[];
  literatureReferences: LiteratureReference[];
}

// ---------------------------------------------------------------------------
// Commercial kit repository
// ---------------------------------------------------------------------------

export type KitCategory =
  | 'PCR & Amplification' | 'qPCR & Digital PCR' | 'Reverse Transcription' | 'Cloning & DNA Assembly'
  | 'Nucleic Acid Purification' | 'NGS Library Preparation' | 'NGS Library QC & Quantification' | 'Single-Cell & Spatial'
  | 'Long-Read Sequencing' | 'CRISPR & Genome Editing' | 'Epigenetics & Methylation' | 'Protein Expression & Purification'
  | 'Western Blot & Immunoassay' | 'Cell Culture & Transfection' | 'Cell Analysis & Viability' | 'Diagnostics & Pathogen Detection'
  | 'Enzymes & Modifying Reagents' | 'Oligos, Probes & Standards';

/**
 * One commercial kit/product. Every entry is traceable to a vendor page:
 * `verified` means the catalog number was found in the fetched `sourceUrl`.
 */
export interface KitIndexEntry {
  id: string;
  vendor: string;
  vendorShort: string;
  productName: string;
  catalogNumbers: string[];
  category: KitCategory | string;
  subcategory?: string;
  description: string;
  productUrl: string;
  protocolUrl?: string;
  storage?: string;
  kitSize?: string;
  applications?: string[];
  keyParameters?: Record<string, string>;
  sourceUrl: string;
  retrievedAt: string;
  verified: boolean;
  verificationNote?: string;
  /** 'index' = shipped catalog; 'discovered' = added by the user via web search (stored in their browser). */
  source: 'index' | 'discovered';
}
