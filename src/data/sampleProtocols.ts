import { SopDocument } from '../types';
import { BIOLOGY_PROTOCOLS } from './biologyProtocols';
import { COMPANY_KIT_SOPS } from './companyKits';

export const INITIAL_GENERIC_SOPS: SopDocument[] = [
  {
    id: 'sop-pcr-001',
    documentId: 'SOP-MB-2026-001',
    version: '2.1',
    effectiveDate: '2026-01-15',
    title: 'Standard Taq DNA Polymerase PCR Reaction Setup & Thermal Cycling',
    category: 'Molecular Biology',
    author: 'Dr. E. Vance, Lead Molecular Biologist',
    reviewer: 'Dr. A. Sharma, QA Director',
    scope: 'This Standard Operating Procedure defines the protocol for preparing a 50 µL Taq DNA Polymerase PCR reaction for amplifying genomic or plasmid DNA fragments up to 5 kb.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Ethidium Bromide / Gel Stains', description: 'Mutagenic intercalating dye used in post-PCR gel electrophoresis.' },
      { type: 'TOXIC', label: 'DNase / RNase Contaminants', description: 'Loss of sample integrity due to nuclease activity.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true, notes: 'Change frequently when working with enzymes' },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Goggles', required: true },
      { item: 'UV Face Shield', required: true, notes: 'When visualizing agarose gels under UV transilluminator' }
    ],
    equipmentRequired: [
      'Precision Micropipettes (0.5–10 µL, 2–20 µL, 20–200 µL)',
      'PCR Thermocycler with Heated Lid (105°C)',
      'Mini Benchtop Centrifuge / Vortexer',
      '0.2 mL Thin-Wall PCR Tubes or 96-Well PCR Plate',
      'Ice Bucket or Cold Aluminum Block (4°C)'
    ],
    reagentsRequired: [
      'Nuclease-Free Water (ddH2O)',
      '10X Standard Taq Reaction Buffer (15 mM MgCl2 included)',
      '10 mM dNTP Mix (2.5 mM each dATP, dCTP, dGTP, dTTP)',
      '10 µM Forward Primer',
      '10 µM Reverse Primer',
      'Template DNA (10–100 ng genomic or 0.1–1 ng plasmid)',
      'Taq DNA Polymerase (5 U/µL)'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Workstation Decontamination',
        instruction: 'Wipe down pipettes, racks, and laminar flow hood surfaces with 70% Ethanol followed by 10% Bleach. Expose hood interior to UV light for 15 minutes before setup.',
        timingMinutes: 15,
        criticalCheckpoint: 'Ensure hood UV light is OFF before starting bench work.'
      },
      {
        stepNumber: 2,
        title: 'Thawing & Reagent Preparation',
        instruction: 'Thaw 10X Taq Buffer, 10 mM dNTPs, and 10 µM Primers on ice. Vortex thoroughly and spin down briefly. Keep Taq Polymerase enzyme at -20°C in benchtop cooler until immediate addition.',
        timingMinutes: 10,
        tempCelsius: 4
      },
      {
        stepNumber: 3,
        title: 'Master Mix Preparation',
        instruction: 'Calculate required volume for N reactions + 10% overflow. Combine Nuclease-Free Water, 10X Taq Buffer, dNTPs, Forward Primer, Reverse Primer, and Taq Polymerase in a 1.5 mL microcentrifuge tube on ice.',
        timingMinutes: 10,
        criticalCheckpoint: 'Add Taq Polymerase enzyme LAST to prevent premature non-specific amplification.'
      },
      {
        stepNumber: 4,
        title: 'Aliquot Master Mix & Add Template DNA',
        instruction: 'Dispense 48 µL of Master Mix into each 0.2 mL PCR tube. Add 2 µL of Template DNA (or Nuclease-Free Water for No-Template Negative Control). Cap securely, vortex gently, and spin down briefly.',
        timingMinutes: 10
      },
      {
        stepNumber: 5,
        title: 'Thermal Cycling Protocol Execution',
        instruction: 'Transfer PCR tubes into pre-programed thermocycler. Initiate the following thermal profile: 95°C for 30 sec (Initial Denaturation), followed by 30 cycles of [95°C 30 sec, 55°C 30 sec, 68°C 60 sec/kb], final extension 68°C 5 min, hold at 4°C.',
        timingMinutes: 90,
        tempCelsius: 95,
        safetyWarning: 'Heated lid reaches 105°C. Avoid direct contact.'
      }
    ],
    qualityControl: [
      'Include a No Template Control (NTC) with every PCR run to check for reagent contamination.',
      'Include a Positive Control DNA sample with known amplicon yield.',
      'Check amplicon size on 1.0–1.5% Agarose Gel with 1 kb DNA Ladder.'
    ],
    troubleshooting: [
      { issue: 'No PCR product visible on gel', cause: 'Annealing temperature too high or degraded primers/template', solution: 'Perform gradient PCR (50°C–60°C); test fresh template DNA.' },
      { issue: 'Multiple non-specific bands / Primer dimers', cause: 'Excessive primer/enzyme or low annealing temperature', solution: 'Increase annealing temp by 2–4°C; reduce primer concentration to 0.2 µM.' },
      { issue: 'Band present in Negative Control (NTC)', cause: 'Reagent contamination', solution: 'Replace water, dNTPs, and primers with fresh unopened stocks.' }
    ],
    references: [
      { citation: 'Sambrook, J., & Russell, D. W. (2001). Molecular Cloning: A Laboratory Manual (3rd ed.). Cold Spring Harbor Laboratory Press.', doiOrUrl: 'https://cshprotocols.cshlp.org' },
      { citation: 'New England Biolabs (NEB) Taq DNA Polymerase Protocol (M0273).', doiOrUrl: 'https://www.neb.com/protocols/2012/08/29/taq-dna-polymerase-protocol-m0273' }
    ],
    reactionSheet: {
      id: 'rxn-pcr-001',
      title: 'Taq PCR Master Mix (50 µL Reaction Volume)',
      assayType: 'End-Point PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 35.75, pipettingOrder: 1, storageTemp: '20°C', notes: 'Add first' },
        { id: 'c2', name: '10X Standard Taq Reaction Buffer', stockConc: 10, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 5.0, pipettingOrder: 2, storageTemp: '-20°C', notes: 'Contains 15 mM MgCl2' },
        { id: 'c3', name: '10 mM dNTP Mix', stockConc: 10, stockUnit: 'mM', finalConc: 0.2, finalUnit: 'mM', volPerRxnMicroliters: 1.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: '10 µM Forward Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: '10 µM Reverse Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 5, storageTemp: '-20°C' },
        { id: 'c6', name: 'Taq DNA Polymerase (5 U/µL)', stockConc: 5, stockUnit: 'U/µL', finalConc: 0.025, finalUnit: 'U/µL', volPerRxnMicroliters: 0.25, pipettingOrder: 6, storageTemp: '-20°C', notes: 'Keep cold, add last to master mix' },
        { id: 'c7', name: 'Template DNA (approx. 25 ng/µL)', stockConc: 25, stockUnit: 'ng/µL', finalConc: 1, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 7, storageTemp: '-20°C', notes: 'Add directly to individual reaction tubes' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Initial Denaturation', tempCelsius: 95, durationSeconds: 30, cycles: 1 },
        { stepNumber: 2, phase: 'Denaturation', tempCelsius: 95, durationSeconds: 30, cycles: 30 },
        { stepNumber: 3, phase: 'Annealing', tempCelsius: 55, durationSeconds: 30, cycles: 30 },
        { stepNumber: 4, phase: 'Extension', tempCelsius: 68, durationSeconds: 60, cycles: 30, notes: '1 min per kb amplicon' },
        { stepNumber: 5, phase: 'Final Extension', tempCelsius: 68, durationSeconds: 300, cycles: 1 },
        { stepNumber: 6, phase: 'Hold', tempCelsius: 4, durationSeconds: 0, cycles: 1, notes: 'Infinite hold' }
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
          'A6': 'sample',
          'A7': 'sample',
          'A8': 'sample'
        }
      }
    },
    revisionHistory: [
      { version: '1.0', date: '2024-03-10', changes: 'Initial release', author: 'Dr. E. Vance' },
      { version: '2.0', date: '2025-06-20', changes: 'Updated Taq polymerase concentration and thermocycler heated lid warning', author: 'Dr. E. Vance' },
      { version: '2.1', date: '2026-01-15', changes: 'Added 10% master mix overflow calculations', author: 'Dr. E. Vance' }
    ]
  },

  {
    id: 'sop-crispr-002',
    documentId: 'SOP-CRISPR-2026-008',
    version: '1.2',
    effectiveDate: '2026-02-01',
    title: 'Electroporation Transfection of CRISPR-Cas9 Ribonucleoprotein (RNP) in Mammalian Cells',
    category: 'Genome Editing',
    author: 'Dr. S. K. Patel, Gene Therapy Lead',
    reviewer: 'Dr. M. Chen, Biosafety Officer',
    scope: 'Protocol for assembling recombinant Cas9 protein and synthetic gRNA into active RNP complexes for electroporation delivery into HEK293T or Jurkat cell lines.',
    biosafetyLevel: 'BSL-2',
    hazards: [
      { type: 'BIOHAZARD', label: 'Human Primary / Immortalized Cells', description: 'Requires BSL-2 biosafety cabinet and tissue culture disposal protocols.' },
      { type: 'SHARPS', label: 'High Voltage Electroporation', description: 'Electroporation cuvettes emit high voltage discharge.' }
    ],
    ppeRequirements: [
      { item: 'Double Nitrile Gloves', required: true },
      { item: 'Fluid-Resistant Lab Coat', required: true },
      { item: 'Face Shield / Goggles', required: true },
      { item: 'Biosafety Cabinet (Class II)', required: true }
    ],
    equipmentRequired: [
      'Class II Type A2 Biosafety Cabinet',
      'Electroporation System (e.g. Lonza Nucleofector or Neon Transfection System)',
      'CO2 Cell Culture Incubator (37°C, 5% CO2)',
      'Phase Contrast Microscope with Fluorescence',
      'Eppendorf ThermoMixer (37°C)'
    ],
    reagentsRequired: [
      'Recombinant SpCas9 Protein (61 µM / 10 mg/mL)',
      'Synthetic Single Guide RNA (sgRNA, 100 µM)',
      'Electroporation Buffer & Supplement Solution',
      'Dulbecco\'s Modified Eagle Medium (DMEM) + 10% FBS',
      'Phosphate Buffered Saline (PBS, pH 7.4)'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'sgRNA & Cas9 RNP Assembly',
        instruction: 'Mix 1.2 µL SpCas9 protein (61 µM) with 1.5 µL sgRNA (100 µM) in 2.3 µL Cas9 buffer (Molar ratio 1:2 Cas9:sgRNA). Incubate at 25°C for 15 minutes to form RNP complex.',
        timingMinutes: 15,
        tempCelsius: 25,
        criticalCheckpoint: 'RNP ratio must be 1:1.5 to 1:2 to ensure complete stoichiometry.'
      },
      {
        stepNumber: 2,
        title: 'Cell Harvesting & Wash',
        instruction: 'Trypsinize healthy HEK293T cells at 80% confluence. Pellet 1 x 10^6 cells per reaction at 200 x g for 5 minutes. Wash once with calcium/magnesium-free PBS.',
        timingMinutes: 15,
        tempCelsius: 20
      },
      {
        stepNumber: 3,
        title: 'Electroporation Resuspension',
        instruction: 'Resuspend 1 x 10^6 cell pellet in 20 µL pre-mixed Electroporation Buffer. Add assembled 5 µL RNP complex to cell suspension. Transfer immediately to electroporation tip/cuvette.',
        timingMinutes: 5
      },
      {
        stepNumber: 4,
        title: 'Pulse Execution & Outgrowth',
        instruction: 'Place cuvette into electroporation module. Apply Program Code PX-100 (1100 V, 20 ms pulse length, 2 pulses). Immediately add 500 µL warm antibiotic-free DMEM + 10% FBS and transfer cells into a 24-well culture plate.',
        timingMinutes: 10,
        tempCelsius: 37,
        safetyWarning: 'Biological samples handled under BSL-2 hood.'
      }
    ],
    qualityControl: [
      'Evaluate editing efficiency 48 hours post-transfection via T7 Endonuclease I (T7E1) Assay or NGS Sequencing.',
      'Check post-electroporation viability (>80%) via Trypan Blue exclusion at 24 hours.'
    ],
    troubleshooting: [
      { issue: 'High cell mortality post-electroporation (>50% dead)', cause: 'Excessive voltage pulse or RNP buffer toxicity', solution: 'Reduce pulse voltage by 50V; ensure cells are in log-phase growth.' },
      { issue: 'Low cleavage efficiency (<10%)', cause: 'Degraded sgRNA or incomplete RNP assembly', solution: 'Re-synthesize sgRNA; extend 25°C RNP incubation time to 20 mins.' }
    ],
    references: [
      { citation: 'Ran, F. A., et al. (2013). Genome engineering using the CRISPR-Cas9 system. Nature Protocols, 8(11), 2281-2308.', doiOrUrl: 'https://doi.org/10.1038/nprot.2013.143' },
      { citation: 'Gundry, C. N., et al. (2016). Highly efficient CRISPR editing in mammalian cells using Cas9 ribonucleoproteins. Cell Reports.', doiOrUrl: 'https://doi.org/10.1016/j.celrep.2016.09.092' }
    ],
    reactionSheet: {
      id: 'rxn-crispr-002',
      title: 'CRISPR-Cas9 RNP Electroporation Assembly',
      assayType: 'RNP Electroporation',
      reactionVolumeMicroliters: 25,
      defaultNumReactions: 4,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Cas9 Reaction Buffer (1X)', stockConc: 10, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 2.3, pipettingOrder: 1, storageTemp: '-20°C' },
        { id: 'c2', name: 'Recombinant SpCas9 (61 µM)', stockConc: 61, stockUnit: 'µM', finalConc: 3, finalUnit: 'µM', volPerRxnMicroliters: 1.2, pipettingOrder: 2, storageTemp: '-80°C', notes: 'Target 75 pmol Cas9 per rxn' },
        { id: 'c3', name: 'Synthetic sgRNA (100 µM)', stockConc: 100, stockUnit: 'µM', finalConc: 6, finalUnit: 'µM', volPerRxnMicroliters: 1.5, pipettingOrder: 3, storageTemp: '-80°C', notes: 'Target 150 pmol sgRNA (1:2 ratio)' },
        { id: 'c4', name: 'Electroporation Resuspension Buffer', stockConc: 1, stockUnit: 'X', finalConc: 0.8, finalUnit: 'X', volPerRxnMicroliters: 15.0, pipettingOrder: 4, storageTemp: '4°C' },
        { id: 'c5', name: 'HEK293 Cell Suspension (1x10^6 cells)', stockConc: 50, stockUnit: 'x10^6/mL', finalConc: 40, finalUnit: 'x10^6/mL', volPerRxnMicroliters: 5.0, pipettingOrder: 5, storageTemp: '37°C' }
      ],
      notes: 'Incubate Cas9 + sgRNA + Buffer for 15 minutes at room temp BEFORE mixing with cell suspension.'
    },
    revisionHistory: [
      { version: '1.0', date: '2025-01-10', changes: 'Initial validation', author: 'Dr. S. K. Patel' },
      { version: '1.2', date: '2026-02-01', changes: 'Adjusted Cas9 to sgRNA molar ratio to 1:2 for improved cleavage', author: 'Dr. S. K. Patel' }
    ]
  }
];

export const SAMPLE_SOPS: SopDocument[] = [...COMPANY_KIT_SOPS, ...BIOLOGY_PROTOCOLS, ...INITIAL_GENERIC_SOPS];
