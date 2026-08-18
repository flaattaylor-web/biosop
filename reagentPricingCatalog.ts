export interface CatalogReagentPrice {
  name: string;
  keywords: string[];
  category:
    | 'Enzymes & Polymerases'
    | 'Master Mixes'
    | 'Nucleotides & Primers'
    | 'Buffers & Salts'
    | 'Dyes & Ladders'
    | 'Antibiotics & Selection'
    | 'Transfection & Cells'
    | 'Detergents & Additives'
    | 'Water & Solvents';
  packagePrice: number; // in USD
  packageVolumeOrQuantity: number;
  packageUnit: 'µL' | 'mL' | 'L' | 'units' | 'reactions' | 'mg' | 'g' | 'preps';
  effectiveVolumeMicroliters: number; // For cost-per-µL calculation
  costPerMicroliter: number;
  supplier: string;
  catalogNumber: string;
  notes: string;
}

export const REAGENT_PRICING_CATALOG: CatalogReagentPrice[] = [
  // ==========================================
  // 1. MASTER MIXES & POLYMERASES
  // ==========================================
  {
    name: 'Q5 High-Fidelity 2X Master Mix',
    keywords: ['q5', 'q5 high-fidelity', 'q5 master mix', 'q5 2x'],
    category: 'Master Mixes',
    packagePrice: 365.0,
    packageVolumeOrQuantity: 12500, // 500 rxns of 25 µL master mix = 12.5 mL = 12,500 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 12500,
    costPerMicroliter: 365.0 / 12500, // $0.0292/µL
    supplier: 'New England Biolabs (NEB)',
    catalogNumber: 'M0492L',
    notes: '500 reactions (25 µL 2X mix per 50 µL rxn)'
  },
  {
    name: 'Taq 2X Master Mix',
    keywords: ['taq 2x', 'taq master mix', 'onetaq', 'taq mix'],
    category: 'Master Mixes',
    packagePrice: 195.0,
    packageVolumeOrQuantity: 12500,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 12500,
    costPerMicroliter: 195.0 / 12500, // $0.0156/µL
    supplier: 'New England Biolabs (NEB)',
    catalogNumber: 'M0270L',
    notes: '500 reactions of Standard Taq Mix'
  },
  {
    name: 'Phusion High-Fidelity 2X Master Mix',
    keywords: ['phusion', 'phusion 2x', 'phusion master mix'],
    category: 'Master Mixes',
    packagePrice: 380.0,
    packageVolumeOrQuantity: 12500,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 12500,
    costPerMicroliter: 380.0 / 12500, // $0.0304/µL
    supplier: 'Thermo Fisher Scientific',
    catalogNumber: 'F531L',
    notes: '500 reactions (25 µL 2X mix)'
  },
  {
    name: 'PowerTrack SYBR Green Master Mix (qPCR)',
    keywords: ['sybr', 'sybr green', 'qpcr master mix', 'powertrack', 'real-time pcr mix'],
    category: 'Master Mixes',
    packagePrice: 425.0,
    packageVolumeOrQuantity: 5000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 5000,
    costPerMicroliter: 425.0 / 5000, // $0.085/µL
    supplier: 'Thermo Fisher / Applied Biosystems',
    catalogNumber: 'A46109',
    notes: '500 x 20 µL qPCR reactions (10 µL 2X mix per well)'
  },
  {
    name: 'Taq DNA Polymerase (5 U/µL)',
    keywords: ['taq polymerase', 'taq enzyme', 'taq dna poly'],
    category: 'Enzymes & Polymerases',
    packagePrice: 185.0,
    packageVolumeOrQuantity: 400, // 2000 units @ 5 U/µL = 400 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 400,
    costPerMicroliter: 185.0 / 400, // $0.4625/µL ($0.0925/unit)
    supplier: 'New England Biolabs (NEB)',
    catalogNumber: 'M0273L',
    notes: '2,000 units with 10X Standard Taq Reaction Buffer'
  },
  {
    name: 'Q5 High-Fidelity DNA Polymerase (2 U/µL)',
    keywords: ['q5 polymerase', 'q5 enzyme', 'q5 dna polymerase'],
    category: 'Enzymes & Polymerases',
    packagePrice: 320.0,
    packageVolumeOrQuantity: 250, // 500 units @ 2 U/µL = 250 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 250,
    costPerMicroliter: 320.0 / 250, // $1.28/µL ($0.64/unit)
    supplier: 'New England Biolabs (NEB)',
    catalogNumber: 'M0491L',
    notes: '500 units with 5X Q5 Reaction Buffer & High GC Enhancer'
  },
  {
    name: 'T4 DNA Ligase (400,000 U/mL)',
    keywords: ['t4 ligase', 't4 dna ligase', 'ligase'],
    category: 'Enzymes & Polymerases',
    packagePrice: 275.0,
    packageVolumeOrQuantity: 250,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 250,
    costPerMicroliter: 275.0 / 250, // $1.10/µL
    supplier: 'New England Biolabs (NEB)',
    catalogNumber: 'M0202L',
    notes: '100,000 units with 10X T4 DNA Ligase Buffer (with ATP)'
  },
  {
    name: 'Spy Cas9 NLS Nuclease (20 µM / ~3.2 mg/mL)',
    keywords: ['cas9', 'cas9 nuclease', 'spy cas9', 'cas9 nls', 'rnp cas9'],
    category: 'Enzymes & Polymerases',
    packagePrice: 295.0,
    packageVolumeOrQuantity: 25, // 50 µg @ ~20 µM = ~25 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 25,
    costPerMicroliter: 295.0 / 25, // $11.80/µL
    supplier: 'Integrated DNA Technologies (IDT) / NEB',
    catalogNumber: '1081058 / M0646T',
    notes: 'Alt-R S.p. Cas9 NLS Recombinant Protein for RNP Delivery'
  },
  {
    name: 'Proteinase K, Recombinant (20 mg/mL)',
    keywords: ['proteinase k', 'proteinase', 'prot k'],
    category: 'Enzymes & Polymerases',
    packagePrice: 175.0,
    packageVolumeOrQuantity: 5000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 5000,
    costPerMicroliter: 175.0 / 5000, // $0.035/µL
    supplier: 'Qiagen / Thermo Fisher',
    catalogNumber: '19133 / EO0491',
    notes: 'PCR and NGS grade, DNase- and RNase-free'
  },
  {
    name: 'RNase A, DNase and Protease-Free (10 mg/mL)',
    keywords: ['rnase a', 'rnase', 'ribonuclease'],
    category: 'Enzymes & Polymerases',
    packagePrice: 92.0,
    packageVolumeOrQuantity: 1000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000,
    costPerMicroliter: 92.0 / 1000, // $0.092/µL
    supplier: 'Thermo Fisher Scientific',
    catalogNumber: 'EN0531',
    notes: 'Pure 10 mg/mL solution'
  },
  {
    name: 'DNase I (RNase-free) (2 U/µL)',
    keywords: ['dnase i', 'dnase', 'deoxyribonuclease'],
    category: 'Enzymes & Polymerases',
    packagePrice: 160.0,
    packageVolumeOrQuantity: 500,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500,
    costPerMicroliter: 160.0 / 500, // $0.32/µL
    supplier: 'Thermo Fisher / NEB',
    catalogNumber: 'AM2224',
    notes: '1,000 units with 10X Reaction Buffer'
  },
  {
    name: 'M-MLV Reverse Transcriptase (200 U/µL)',
    keywords: ['m-mlv', 'reverse transcriptase', 'rt enzyme', 'superscript', 'protoScript'],
    category: 'Enzymes & Polymerases',
    packagePrice: 220.0,
    packageVolumeOrQuantity: 500,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500,
    costPerMicroliter: 220.0 / 500, // $0.44/µL
    supplier: 'Promega / NEB',
    catalogNumber: 'M1705',
    notes: '100,000 units with 5X RT Reaction Buffer'
  },
  {
    name: 'NEB Gibson Assembly 2X Master Mix',
    keywords: ['gibson assembly', 'gibson 2x', 'isothermal master mix'],
    category: 'Master Mixes',
    packagePrice: 420.0,
    packageVolumeOrQuantity: 500, // 50 rxns x 10 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500,
    costPerMicroliter: 420.0 / 500, // $0.84/µL ($8.40/rxn)
    supplier: 'New England Biolabs (NEB)',
    catalogNumber: 'E2611L',
    notes: '50 reactions (10 µL 2X mix per 20 µL assembly)'
  },

  // ==========================================
  // 2. NUCLEOTIDES, PRIMERS & SYNTHETICS
  // ==========================================
  {
    name: 'dNTP Mix (10 mM each / 40 mM total)',
    keywords: ['dntp', 'dntps', '10 mm dntp', 'deoxynucleotide'],
    category: 'Nucleotides & Primers',
    packagePrice: 155.0,
    packageVolumeOrQuantity: 1000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000,
    costPerMicroliter: 155.0 / 1000, // $0.155/µL
    supplier: 'Thermo Fisher / NEB',
    catalogNumber: 'R0192 / N0447L',
    notes: 'Equimolar 10 mM dATP, dCTP, dGTP, dTTP'
  },
  {
    name: 'Forward / Sense PCR Primer (10 µM)',
    keywords: ['forward primer', 'fwd primer', 'primer f', 'primer 1', 'sense primer'],
    category: 'Nucleotides & Primers',
    packagePrice: 12.0,
    packageVolumeOrQuantity: 200, // 25 nmol standard desalting dissolved to 10 µM (250 µL)
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 200,
    costPerMicroliter: 12.0 / 200, // $0.06/µL
    supplier: 'IDT / Sigma / Eurofins',
    catalogNumber: 'Custom Oligo 25 nmol',
    notes: 'Standard desalted 20–25nt oligo normalized to 10 µM'
  },
  {
    name: 'Reverse / Antisense PCR Primer (10 µM)',
    keywords: ['reverse primer', 'rev primer', 'primer r', 'primer 2', 'antisense primer'],
    category: 'Nucleotides & Primers',
    packagePrice: 12.0,
    packageVolumeOrQuantity: 200,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 200,
    costPerMicroliter: 12.0 / 200, // $0.06/µL
    supplier: 'IDT / Sigma / Eurofins',
    catalogNumber: 'Custom Oligo 25 nmol',
    notes: 'Standard desalted 20–25nt oligo normalized to 10 µM'
  },
  {
    name: 'Synthetic sgRNA (Target Specific, 100 µM)',
    keywords: ['sgrna', 'guide rna', 'crrna', 'tracrrna', 'crispr guide'],
    category: 'Nucleotides & Primers',
    packagePrice: 95.0,
    packageVolumeOrQuantity: 20, // ~2 nmol dissolved to 100 µM = 20 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 20,
    costPerMicroliter: 95.0 / 20, // $4.75/µL
    supplier: 'Synthego / IDT',
    catalogNumber: 'Alt-R sgRNA 2 nmol',
    notes: 'Chemically modified 100nt synthetic single guide RNA'
  },
  {
    name: 'ATP Solution (100 mM)',
    keywords: ['atp', '100 mm atp', 'adenosine triphosphate'],
    category: 'Nucleotides & Primers',
    packagePrice: 85.0,
    packageVolumeOrQuantity: 1000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000,
    costPerMicroliter: 85.0 / 1000, // $0.085/µL
    supplier: 'Thermo Fisher / NEB',
    catalogNumber: 'R0441 / P0756S',
    notes: '1 mL of 100 mM sterile ATP'
  },

  // ==========================================
  // 3. BUFFERS, SALTS & SOLVENTS
  // ==========================================
  {
    name: '10X PCR Reaction Buffer with MgCl2',
    keywords: ['10x pcr buffer', '10x standard taq buffer', '10x buffer', 'pcr buffer'],
    category: 'Buffers & Salts',
    packagePrice: 28.0,
    packageVolumeOrQuantity: 5000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 5000,
    costPerMicroliter: 28.0 / 5000, // $0.0056/µL
    supplier: 'NEB / Thermo Fisher',
    catalogNumber: 'B9004S',
    notes: '5 x 1 mL vials with 15 mM MgCl2'
  },
  {
    name: 'Magnesium Chloride (MgCl2), 25 mM / 50 mM',
    keywords: ['mgcl2', 'magnesium chloride', '25 mm mgcl2', '50 mm mgcl2'],
    category: 'Buffers & Salts',
    packagePrice: 22.0,
    packageVolumeOrQuantity: 5000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 5000,
    costPerMicroliter: 22.0 / 5000, // $0.0044/µL
    supplier: 'Thermo Fisher Scientific',
    catalogNumber: 'R0971',
    notes: '4 x 1.25 mL vials PCR grade'
  },
  {
    name: 'Nuclease-Free Water / ddH2O',
    keywords: ['water', 'nuclease-free water', 'ddh2o', 'di water', 'sterile water', 'molecular grade water'],
    category: 'Water & Solvents',
    packagePrice: 32.0,
    packageVolumeOrQuantity: 1000000, // 1000 mL = 1,000,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000000,
    costPerMicroliter: 32.0 / 1000000, // $0.000032/µL (negligible)
    supplier: 'Ambion / Cytiva / In-House',
    catalogNumber: 'AM9932',
    notes: '1,000 mL deionized nuclease-free water'
  },
  {
    name: 'Tris-HCl Buffer (1 M, pH 7.5–8.0)',
    keywords: ['tris-hcl', 'tris buffer', '1m tris', 'tromethamine'],
    category: 'Buffers & Salts',
    packagePrice: 38.0,
    packageVolumeOrQuantity: 1000000, // 1 L = 1,000,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000000,
    costPerMicroliter: 38.0 / 1000000, // $0.000038/µL
    supplier: 'Sigma-Aldrich / In-House',
    catalogNumber: 'T2694-1L',
    notes: '1 Liter sterile stock solution'
  },
  {
    name: 'Sodium Chloride (NaCl), 5 M',
    keywords: ['nacl', 'sodium chloride', '5m nacl'],
    category: 'Buffers & Salts',
    packagePrice: 28.0,
    packageVolumeOrQuantity: 1000000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000000,
    costPerMicroliter: 28.0 / 1000000, // $0.000028/µL
    supplier: 'Sigma-Aldrich / In-House',
    catalogNumber: 'S5150-1L',
    notes: '1 Liter sterile filtered 5 M stock'
  },
  {
    name: 'EDTA Solution (0.5 M, pH 8.0)',
    keywords: ['edta', '0.5m edta', 'ethylenediaminetetraacetic'],
    category: 'Buffers & Salts',
    packagePrice: 34.0,
    packageVolumeOrQuantity: 500000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500000,
    costPerMicroliter: 34.0 / 500000, // $0.000068/µL
    supplier: 'Sigma-Aldrich / In-House',
    catalogNumber: '03690-500ML',
    notes: '500 mL 0.5 M EDTA pH 8.0'
  },
  {
    name: 'DTT (Dithiothreitol), 1 M',
    keywords: ['dtt', 'dithiothreitol', 'cleland', '1m dtt'],
    category: 'Detergents & Additives',
    packagePrice: 48.0,
    packageVolumeOrQuantity: 10000, // 10 mL = 10,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 10000,
    costPerMicroliter: 48.0 / 10000, // $0.0048/µL
    supplier: 'Thermo Fisher / Sigma',
    catalogNumber: 'R0861',
    notes: '10 mL of 1 M aqueous DTT at -20°C'
  },
  {
    name: 'Dimethyl Sulfoxide (DMSO), 100% PCR Grade',
    keywords: ['dmso', 'dimethyl sulfoxide'],
    category: 'Detergents & Additives',
    packagePrice: 36.0,
    packageVolumeOrQuantity: 50000, // 50 mL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 50000,
    costPerMicroliter: 36.0 / 50000, // $0.00072/µL
    supplier: 'Sigma-Aldrich',
    catalogNumber: 'D8418-50ML',
    notes: '50 mL sterile filtered PCR grade'
  },
  {
    name: 'BSA (Bovine Serum Albumin, 20 mg/mL)',
    keywords: ['bsa', 'bovine serum albumin', '20 mg/ml bsa'],
    category: 'Detergents & Additives',
    packagePrice: 65.0,
    packageVolumeOrQuantity: 12000, // 12 mL = 12,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 12000,
    costPerMicroliter: 65.0 / 12000, // $0.0054/µL
    supplier: 'New England Biolabs (NEB)',
    catalogNumber: 'B9000S',
    notes: '12 mL Molecular Biology Grade BSA'
  },
  {
    name: '10X PBS (Phosphate-Buffered Saline)',
    keywords: ['pbs', '10x pbs', 'phosphate buffered saline'],
    category: 'Buffers & Salts',
    packagePrice: 35.0,
    packageVolumeOrQuantity: 1000000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000000,
    costPerMicroliter: 35.0 / 1000000, // $0.000035/µL
    supplier: 'Gibco / Thermo Fisher',
    catalogNumber: '70011044',
    notes: '1 Liter 10X liquid concentrate'
  },

  // ==========================================
  // 4. TRANSFECTION & CELL CULTURE
  // ==========================================
  {
    name: 'PEI MAX 40K Transfection Grade (1 mg/mL)',
    keywords: ['pei', 'pei max', 'polyethylenimine', 'transfection reagent pei'],
    category: 'Transfection & Cells',
    packagePrice: 110.0,
    packageVolumeOrQuantity: 100000, // 100 mL = 100,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 100000,
    costPerMicroliter: 110.0 / 100000, // $0.0011/µL ($1.10/mL)
    supplier: 'Polysciences Inc.',
    catalogNumber: '24765-1',
    notes: '100 mL sterile solution, 1 mg/mL in water pH 7.1'
  },
  {
    name: 'Lipofectamine 3000 Transfection Reagent',
    keywords: ['lipofectamine', 'lipo 3000', 'lipofectamine 3000', 'transfection lipid'],
    category: 'Transfection & Cells',
    packagePrice: 520.0,
    packageVolumeOrQuantity: 1500, // 1.5 mL = 1,500 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1500,
    costPerMicroliter: 520.0 / 1500, // $0.3467/µL
    supplier: 'Thermo Fisher / Invitrogen',
    catalogNumber: 'L3000015',
    notes: '1.5 mL kit with P3000 reagent'
  },

  // ==========================================
  // 5. DYES, STAINS & LADDERS
  // ==========================================
  {
    name: 'GelRed Nucleic Acid Gel Stain (10,000X in Water)',
    keywords: ['gelred', 'gel stain', 'sybr safe', 'ethidium alternative'],
    category: 'Dyes & Ladders',
    packagePrice: 145.0,
    packageVolumeOrQuantity: 500, // 500 µL 10,000X = 5 Liters of agarose gel
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500,
    costPerMicroliter: 145.0 / 500, // $0.29/µL
    supplier: 'Biotium Inc.',
    catalogNumber: '41003',
    notes: '500 µL of 10,000X safe fluorescent stain in water'
  },
  {
    name: 'GeneRuler 1 kb Plus DNA Ladder (0.1 µg/µL)',
    keywords: ['dna ladder', '1 kb ladder', '1kb plus', 'generuler', 'molecular ladder'],
    category: 'Dyes & Ladders',
    packagePrice: 135.0,
    packageVolumeOrQuantity: 500, // 500 µL = 100 applications (5 µL/lane)
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500,
    costPerMicroliter: 135.0 / 500, // $0.27/µL ($1.35/lane)
    supplier: 'Thermo Fisher Scientific',
    catalogNumber: 'SM1331',
    notes: '500 µL ready-to-load with 6X TriTrack dye'
  },
  {
    name: '6X DNA Loading Dye with Gel Loading Buffer',
    keywords: ['loading dye', '6x dye', 'loading buffer', 'tritrack'],
    category: 'Dyes & Ladders',
    packagePrice: 32.0,
    packageVolumeOrQuantity: 5000, // 5 x 1 mL = 5,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 5000,
    costPerMicroliter: 32.0 / 5000, // $0.0064/µL
    supplier: 'Thermo Fisher / NEB',
    catalogNumber: 'R0611 / B7024S',
    notes: '5 x 1 mL 6X Bromophenol Blue / Xylene Cyanol'
  },

  // ==========================================
  // 6. ANTIBIOTICS & SELECTION
  // ==========================================
  {
    name: 'Ampicillin Sodium Salt (100 mg/mL)',
    keywords: ['ampicillin', 'amp', 'ampicillin stock'],
    category: 'Antibiotics & Selection',
    packagePrice: 28.0,
    packageVolumeOrQuantity: 10000, // 10 mL = 10,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 10000,
    costPerMicroliter: 28.0 / 10000, // $0.0028/µL
    supplier: 'Sigma-Aldrich',
    catalogNumber: 'A9518-25G',
    notes: 'Prepared stock solution (1000X for 100 µg/mL final)'
  },
  {
    name: 'Kanamycin Sulfate (50 mg/mL)',
    keywords: ['kanamycin', 'kan', 'kanamycin stock'],
    category: 'Antibiotics & Selection',
    packagePrice: 32.0,
    packageVolumeOrQuantity: 10000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 10000,
    costPerMicroliter: 32.0 / 10000, // $0.0032/µL
    supplier: 'Sigma-Aldrich',
    catalogNumber: 'K1377-25G',
    notes: 'Prepared stock solution (1000X for 50 µg/mL final)'
  },
  {
    name: 'Puromycin Dihydrochloride (10 mg/mL)',
    keywords: ['puromycin', 'puro', 'puromycin selection'],
    category: 'Antibiotics & Selection',
    packagePrice: 125.0,
    packageVolumeOrQuantity: 10000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 10000,
    costPerMicroliter: 125.0 / 10000, // $0.0125/µL
    supplier: 'InvivoGen / Gibco',
    catalogNumber: 'ant-pr-1',
    notes: '10 x 1 mL vials sterile mammalian selection'
  },

  // ==========================================
  // 7. BEADS, PURIFICATION & NGS MODULES
  // ==========================================
  {
    name: 'SPRIselect / AMPure XP Magnetic Cleanup Beads',
    keywords: ['spri', 'spriselect', 'ampure', 'ampure xp', 'magnetic beads', 'beads', 'cleanup beads', 'bead cleanup'],
    category: 'Buffers & Salts',
    packagePrice: 1450.0,
    packageVolumeOrQuantity: 60000, // 60 mL = 60,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 60000,
    costPerMicroliter: 1450.0 / 60000, // $0.02417/µL ($1.21 for 50 µL cleanup)
    supplier: 'Beckman Coulter',
    catalogNumber: 'B23318 / A63881',
    notes: '60 mL paramagnetic bead suspension for size selection & cleanup'
  },
  {
    name: 'Ethanol, 100% Molecular Biology Grade (200 Proof)',
    keywords: ['ethanol 100%', '100% ethanol', 'etoh 100%', 'absolute ethanol', '200 proof ethanol'],
    category: 'Water & Solvents',
    packagePrice: 65.0,
    packageVolumeOrQuantity: 1000000, // 1 Liter = 1,000,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000000,
    costPerMicroliter: 65.0 / 1000000, // $0.000065/µL
    supplier: 'Sigma-Aldrich / Decon Labs',
    catalogNumber: 'E7023-1L',
    notes: '1 Liter undenatured ACS/USP molecular grade 200 proof ethanol'
  },
  {
    name: 'Freshly Prepared 80% Ethanol Wash Solution',
    keywords: ['80% ethanol', '80% etoh', '70% ethanol', '70% etoh', 'ethanol wash', 'etoh wash', 'ethanol'],
    category: 'Water & Solvents',
    packagePrice: 55.0,
    packageVolumeOrQuantity: 1000000, // 1 Liter = 1,000,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 1000000,
    costPerMicroliter: 55.0 / 1000000, // $0.000055/µL
    supplier: 'Prepared In-House (100% EtOH + ddH2O)',
    catalogNumber: 'LAB-ETOH-80',
    notes: 'Freshly diluted with nuclease-free water for bead pellet washes'
  },
  {
    name: 'Qubit 1X dsDNA High Sensitivity (HS) Assay Kit',
    keywords: ['qubit', 'qubit hs', 'qubit dsdna', 'qubit assay', 'fluorometer dye'],
    category: 'Dyes & Ladders',
    packagePrice: 385.0,
    packageVolumeOrQuantity: 500, // 500 assays
    packageUnit: 'reactions',
    effectiveVolumeMicroliters: 500 * 200, // 200 µL per assay
    costPerMicroliter: 385.0 / (500 * 200), // $0.00385/µL ($0.77/assay)
    supplier: 'Thermo Fisher / Invitrogen',
    catalogNumber: 'Q33231',
    notes: '500 assays ready-to-use with standards for 10 pg/µL to 100 ng/µL'
  },
  {
    name: '10 mM Tris-HCl pH 8.5 / Elution Buffer (EB)',
    keywords: ['elution buffer', 'eb buffer', '10 mm tris', 'tris-hcl ph 8.5', 'qiagen eb'],
    category: 'Buffers & Salts',
    packagePrice: 35.0,
    packageVolumeOrQuantity: 250000, // 250 mL = 250,000 µL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 250000,
    costPerMicroliter: 35.0 / 250000, // $0.00014/µL
    supplier: 'Qiagen / Ambion',
    catalogNumber: '19086',
    notes: '250 mL sterile 10 mM Tris-Cl, pH 8.5 nuclease-free'
  },
  {
    name: 'Low-EDTA TE Buffer (1X, 10 mM Tris, 0.1 mM EDTA, pH 8.0)',
    keywords: ['te buffer', 'low edta te', 'low-edta', '1x te'],
    category: 'Buffers & Salts',
    packagePrice: 42.0,
    packageVolumeOrQuantity: 500000, // 500 mL
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500000,
    costPerMicroliter: 42.0 / 500000, // $0.000084/µL
    supplier: 'Thermo Fisher / Invitrogen',
    catalogNumber: '12090015',
    notes: '500 mL sterile low-EDTA buffer for NGS library & DNA storage'
  },
  {
    name: 'Isopropanol (2-Propanol) 100% Molecular Grade',
    keywords: ['isopropanol', '2-propanol', 'ipa'],
    category: 'Water & Solvents',
    packagePrice: 45.0,
    packageVolumeOrQuantity: 500000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 500000,
    costPerMicroliter: 45.0 / 500000, // $0.00009/µL
    supplier: 'Sigma-Aldrich',
    catalogNumber: 'I9516-500ML',
    notes: '500 mL molecular grade for nucleic acid precipitation'
  }
];

// ==========================================
// STANDARD LAB CONSUMABLES & PLASTICWARE
// ==========================================
export interface DefaultConsumableItem {
  name: string;
  category: 'PLASTICWARE' | 'COLUMNS_FILTERS' | 'TIPS' | 'TUBES_PLATES' | 'PPE_GENERAL';
  unitCost: number;
  unit: string;
  defaultMultiplier: (numReactions: number, sampleCount: number) => number;
  supplier: string;
  catalogNumber: string;
  description: string;
}

export const DEFAULT_LAB_CONSUMABLES: DefaultConsumableItem[] = [
  {
    name: 'Covaris microTUBE AFA Fiber Pre-slit Snap-Cap (130 µL)',
    category: 'TUBES_PLATES',
    unitCost: 8.90,
    unit: 'tube',
    defaultMultiplier: (_, sampleCount) => sampleCount,
    supplier: 'Covaris LLC',
    catalogNumber: '520045',
    description: 'AFA fiber microTUBE for precise acoustic DNA shearing on Covaris ME220/S220'
  },
  {
    name: 'Qubit 0.5 mL Thin-Wall Clear Assay Tubes',
    category: 'TUBES_PLATES',
    unitCost: 0.19,
    unit: 'tube',
    defaultMultiplier: (_, sampleCount) => sampleCount + 2, // samples + 2 standards
    supplier: 'Invitrogen',
    catalogNumber: 'Q32856',
    description: 'Thin-wall optical clear 0.5 mL tubes for fluorometer quantification'
  },
  {
    name: '0.2 mL PCR 8-Strip Tubes with Optical Flat Caps',
    category: 'TUBES_PLATES',
    unitCost: 0.85,
    unit: 'strip',
    defaultMultiplier: (numRxns) => Math.max(1, Math.ceil(numRxns / 8)),
    supplier: 'Axygen / Eppendorf',
    catalogNumber: 'PCR-0208-CP-C',
    description: 'Ultra-thin wall 8-strip tubes for thermocycling and master mix aliquoting'
  },
  {
    name: '96-Well Semi-Skirted PCR Plate (0.2 mL)',
    category: 'TUBES_PLATES',
    unitCost: 3.20,
    unit: 'plate',
    defaultMultiplier: (numRxns) => Math.max(1, Math.ceil(numRxns / 96)),
    supplier: 'Bio-Rad / Eppendorf',
    catalogNumber: 'HSP9601',
    description: 'Thin-wall virgin polypropylene optical PCR plate'
  },
  {
    name: 'Optical Adhesive PCR Sealing Sheet',
    category: 'TUBES_PLATES',
    unitCost: 1.85,
    unit: 'sheet',
    defaultMultiplier: (numRxns) => Math.max(1, Math.ceil(numRxns / 96)),
    supplier: 'Applied Biosystems',
    catalogNumber: '4311971',
    description: 'Real-time qPCR optical adhesive film'
  },
  {
    name: 'Aerosol Barrier Filter Pipette Tips (200 µL / 20 µL / 10 µL)',
    category: 'TIPS',
    unitCost: 0.082, // ~$7.87 per rack of 96
    unit: 'tip',
    defaultMultiplier: (numRxns, sampleCount) => Math.round((numRxns * 4) + (sampleCount * 3) + 16),
    supplier: 'Rainin / Thermo Fisher',
    catalogNumber: 'GP-L200F / GP-L10F',
    description: 'Sterile RNase/DNase/endotoxin free filter barrier tips'
  },
  {
    name: '1.5 mL Amber / Clear DNA Microcentrifuge Tubes',
    category: 'TUBES_PLATES',
    unitCost: 0.045, // ~$22.50 per 500
    unit: 'tube',
    defaultMultiplier: (numRxns, sampleCount) => Math.max(4, Math.round(sampleCount + 6)),
    supplier: 'Eppendorf',
    catalogNumber: '0030120086',
    description: 'Low-retention safe-lock polypropylene tubes'
  },
  {
    name: '25 mL Multichannel Reagent Reservoirs (Sterile)',
    category: 'PLASTICWARE',
    unitCost: 0.65,
    unit: 'reservoir',
    defaultMultiplier: () => 2,
    supplier: 'Integra / VistaLab',
    catalogNumber: '4312',
    description: 'V-bottom reagent reservoirs for 8-channel and 12-channel pipette dispensing'
  },
  {
    name: 'Silica Membrane Spin Column with 2 mL Receiver',
    category: 'COLUMNS_FILTERS',
    unitCost: 0.85,
    unit: 'column',
    defaultMultiplier: (_, sampleCount) => sampleCount,
    supplier: 'Epoch Life Science / Qiagen',
    catalogNumber: '1940-250',
    description: 'DNA/RNA binding mini-prep spin column'
  },
  {
    name: 'Powder-Free Nitrile Cleanroom Gloves',
    category: 'PPE_GENERAL',
    unitCost: 0.18,
    unit: 'pair',
    defaultMultiplier: () => 2, // 2 pairs per typical run
    supplier: 'Kimberly-Clark / Ansell',
    catalogNumber: '55082',
    description: 'Textured purple nitrile bench gloves'
  }
];

// ==========================================
// SMART MATCHING ENGINE
// ==========================================
export function matchReagentPriceFromCatalog(reagentName: string): CatalogReagentPrice {
  const lower = (reagentName || '').toLowerCase().trim();

  // 1. Direct Keyword Match
  for (const item of REAGENT_PRICING_CATALOG) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      return item;
    }
  }

  // 2. Category Heuristics & Fallbacks if no exact catalog match
  if (lower.includes('water') || lower.includes('h2o') || lower.includes('nuclease-free') || lower.includes('elution buffer') || lower.includes('eb buffer') || lower.includes('te buffer')) {
    return {
      name: reagentName,
      keywords: [],
      category: 'Water & Solvents',
      packagePrice: 25.0,
      packageVolumeOrQuantity: 1000000,
      packageUnit: 'µL',
      effectiveVolumeMicroliters: 1000000,
      costPerMicroliter: 0.000025,
      supplier: 'In-House / Standard Lab Supply',
      catalogNumber: 'LAB-WATER',
      notes: 'Autoclaved / sterile nuclease-free water or elution buffer'
    };
  }

  if (lower.includes('ethanol') || lower.includes('etoh') || lower.includes('alcohol') || lower.includes('isopropanol') || lower.includes('ipa')) {
    return {
      name: reagentName,
      keywords: [],
      category: 'Water & Solvents',
      packagePrice: 55.0,
      packageVolumeOrQuantity: 1000000,
      packageUnit: 'µL',
      effectiveVolumeMicroliters: 1000000,
      costPerMicroliter: 0.000055,
      supplier: 'In-House Stock Solution',
      catalogNumber: 'SOLV-ALCOHOL',
      notes: 'Molecular biology grade alcohol/solvent wash'
    };
  }

  if (lower.includes('bead') || lower.includes('spri') || lower.includes('ampure') || lower.includes('magnetic') || lower.includes('cleanup')) {
    return {
      name: reagentName,
      keywords: [],
      category: 'Buffers & Salts',
      packagePrice: 1450.0,
      packageVolumeOrQuantity: 60000,
      packageUnit: 'µL',
      effectiveVolumeMicroliters: 60000,
      costPerMicroliter: 0.02417,
      supplier: 'Beckman / Cytiva',
      catalogNumber: 'BEAD-CLEANUP',
      notes: 'Paramagnetic nucleic acid purification beads'
    };
  }

  if (lower.includes('master mix') || lower.includes('2x') || lower.includes('5x mix') || lower.includes('reaction mix')) {
    return {
      name: reagentName,
      keywords: [],
      category: 'Master Mixes',
      packagePrice: 280.0,
      packageVolumeOrQuantity: 10000,
      packageUnit: 'µL',
      effectiveVolumeMicroliters: 10000,
      costPerMicroliter: 0.028, // ~$0.70 / 25 µL rxn
      supplier: 'Commercial Biotech Vendor',
      catalogNumber: 'MM-GENERIC',
      notes: 'Commercial 2X/5X Master Mix estimated average'
    };
  }

  if (lower.includes('polymerase') || lower.includes('enzyme') || lower.includes('ligase') || lower.includes('nuclease') || lower.includes('transcriptase')) {
    return {
      name: reagentName,
      keywords: [],
      category: 'Enzymes & Polymerases',
      packagePrice: 220.0,
      packageVolumeOrQuantity: 500,
      packageUnit: 'µL',
      effectiveVolumeMicroliters: 500,
      costPerMicroliter: 0.44, // ~$0.44/µL
      supplier: 'Enzyme Specialist (NEB / Thermo)',
      catalogNumber: 'ENZ-GENERIC',
      notes: 'Recombinant purified enzyme standard'
    };
  }

  if (lower.includes('primer') || lower.includes('oligo') || lower.includes('probe')) {
    return {
      name: reagentName,
      keywords: [],
      category: 'Nucleotides & Primers',
      packagePrice: 12.0,
      packageVolumeOrQuantity: 200,
      packageUnit: 'µL',
      effectiveVolumeMicroliters: 200,
      costPerMicroliter: 0.06,
      supplier: 'Oligo Synthesizer (IDT / Sigma)',
      catalogNumber: 'OLIGO-10UM',
      notes: '10 µM custom oligonucleotide primer'
    };
  }

  if (lower.includes('buffer') || lower.includes('salt') || lower.includes('tris') || lower.includes('nacl') || lower.includes('kcl') || lower.includes('mgcl2')) {
    return {
      name: reagentName,
      keywords: [],
      category: 'Buffers & Salts',
      packagePrice: 30.0,
      packageVolumeOrQuantity: 500000,
      packageUnit: 'µL',
      effectiveVolumeMicroliters: 500000,
      costPerMicroliter: 0.00006,
      supplier: 'General Chemical Supply',
      catalogNumber: 'BUF-GENERIC',
      notes: 'Stock buffer solution'
    };
  }

  // Default generic reagent fallback
  return {
    name: reagentName,
    keywords: [],
    category: 'Buffers & Salts',
    packagePrice: 50.0,
    packageVolumeOrQuantity: 10000,
    packageUnit: 'µL',
    effectiveVolumeMicroliters: 10000,
    costPerMicroliter: 0.005,
    supplier: 'Standard Laboratory Stock',
    catalogNumber: 'GENERIC-REAGENT',
    notes: 'Generic biological reagent'
  };
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$'
};
