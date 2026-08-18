import { SopDocument } from '../types';

export const COMPANY_KIT_SOPS: SopDocument[] = [
  // --- NEW ENGLAND BIOLABS (NEB) KITS ---
  {
    id: 'neb-q5-m0492',
    documentId: 'SOP-NEB-M0492',
    version: '3.0',
    effectiveDate: '2026-02-01',
    title: 'NEB Q5 High-Fidelity 2X Master Mix High-Yield PCR Protocol',
    category: 'High-Fidelity PCR & Cloning',
    author: 'New England Biolabs (NEB) Technical Application Support / QA Team',
    reviewer: 'Dr. M. Reichenbach, Lead Enzymology Specialist',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'M0492S / M0492L',
      officialDocUrl: 'https://www.neb.com/en/products/m0492-q5-high-fidelity-2x-master-mix',
      storageConditions: '-20°C (Avoid excessive freeze-thaw cycles)',
      kitIncludes: ['Q5 High-Fidelity 2X Master Mix', 'Nuclease-Free Water', 'Q5 High GC Enhancer (5X)']
    },
    scope: 'This Standard Operating Procedure details the setup and execution of ultra-high-fidelity PCR amplification using NEB Q5 High-Fidelity 2X Master Mix (3x higher fidelity than Taq and 2x higher than Phusion). Validated for GC-rich and complex genomic DNA targets up to 20 kb.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'DNA Intercalating Gel Dyes', description: 'Handle SYBR Safe or Ethidium Bromide with dedicated chemical gloves.' },
      { type: 'CHEMICAL', label: 'Fluorometric Master Mix', description: 'Enzyme buffer solution containing inert stabilizing reagents.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Powder-Free Gloves', required: true, notes: 'Change immediately if reagent spills occur.' },
      { item: 'Standard Lab Coat', required: true, notes: 'Buttoned fully during master mix preparation.' },
      { item: 'Safety Glasses (ANSI Z87.1)', required: true }
    ],
    equipmentRequired: [
      'Precision Micropipettes (0.5–10 µL, 2–20 µL, 20–200 µL)',
      'PCR Thermocycler with Heated Lid (≥105°C)',
      'Benchtop Microcentrifuge & Vortexer',
      '0.2 mL Thin-Wall PCR Tubes or 96-Well PCR Plate',
      'Cold Aluminum Block / Ice Bucket (4°C)'
    ],
    reagentsRequired: [
      'NEB Q5 High-Fidelity 2X Master Mix (Cat #M0492)',
      '10 µM Forward Primer',
      '10 µM Reverse Primer',
      'Template DNA (10 ng genomic or 1 ng plasmid)',
      'Nuclease-Free Water',
      'NEB Q5 High GC Enhancer (Optional for >65% GC content)'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Reagent Thawing & Workstation Prep',
        instruction: 'Thaw Q5 2X Master Mix, 10 µM Primers, and Template DNA on ice. Gently invert Q5 Master Mix 5–6 times to mix thoroughly. Briefly spin down reagents in microcentrifuge.',
        timingMinutes: 5,
        tempCelsius: 4,
        criticalCheckpoint: 'Keep Q5 Master Mix on ice at all times during reaction assembly.'
      },
      {
        stepNumber: 2,
        title: 'Master Mix Reaction Assembly',
        instruction: 'In a 0.2 mL PCR tube on ice, combine 25 µL Q5 2X Master Mix, 2.5 µL Forward Primer (0.5 µM final), 2.5 µL Reverse Primer (0.5 µM final), 1–2 µL Template DNA, and Nuclease-Free Water to a final volume of 50 µL.',
        timingMinutes: 10,
        tempCelsius: 4
      },
      {
        stepNumber: 3,
        title: 'Centrifugation & Thermocycler Loading',
        instruction: 'Mix reaction gently by pipetting up and down 4–5 times. Cap PCR tubes tightly and spin down briefly (1,000 x g for 5 seconds) to collect all liquid at the bottom of the tube.',
        timingMinutes: 2
      },
      {
        stepNumber: 4,
        title: 'NEB Q5 Thermal Cycling Program',
        instruction: 'Initiate thermocycler program: Initial Denaturation at 98°C for 30 sec; 30 cycles of [98°C for 10 sec, Annealing @ NEB Tm Calculator temp for 20 sec, 72°C for 30 sec/kb]; Final Extension at 72°C for 2 min; Hold at 4°C.',
        timingMinutes: 60,
        tempCelsius: 98,
        criticalCheckpoint: 'Calculate primer Tm using NEB Tm Calculator (http://tmcalculator.neb.com). Q5 annealing temps are typically 2–5°C higher than Taq.'
      }
    ],
    qualityControl: [
      'Always run a No-Template Control (NTC) containing water instead of DNA to verify zero aerosol/primer contamination.',
      'Verify target amplicon length on a 1.0% Agarose Gel loaded with NEB 1 kb Plus DNA Ladder.',
      'Ensure single discrete band yield with >90% purity prior to downstream purification or assembly.'
    ],
    troubleshooting: [
      { issue: 'No PCR product visible on gel', cause: 'Annealing temperature calculated incorrectly or incorrect primer Tm', solution: 'Recalculate annealing temperature using NEB Tm Calculator specifically for Q5.' },
      { issue: 'Non-specific amplification or smear', cause: 'Excessive template DNA or over-cycling', solution: 'Reduce template DNA input to 1–10 ng genomic; decrease cycle count from 35 to 28 cycles.' },
      { issue: 'GC-rich target fails to amplify', cause: 'High GC content (>65%) preventing denaturation', solution: 'Add 10 µL of 5X Q5 High GC Enhancer per 50 µL reaction.' }
    ],
    references: [
      { citation: 'New England Biolabs. (2024). Q5 High-Fidelity 2X Master Mix Protocol (M0492). NEB Technical Documentation.', doiOrUrl: 'https://www.neb.com/en/products/m0492-q5-high-fidelity-2x-master-mix' }
    ],
    reactionSheet: {
      id: 'rxn-neb-q5',
      title: 'NEB Q5 High-Fidelity Master Mix (50 µL Reaction)',
      assayType: 'High-Fidelity PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 18.0, pipettingOrder: 1, storageTemp: '20°C', notes: 'Add first' },
        { id: 'c2', name: 'NEB Q5 High-Fidelity 2X Master Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C', notes: 'Invert gently before pipetting' },
        { id: 'c3', name: 'Forward Primer (10 µM stock)', stockConc: 10, stockUnit: 'µM', finalConc: 0.5, finalUnit: 'µM', volPerRxnMicroliters: 2.5, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Reverse Primer (10 µM stock)', stockConc: 10, stockUnit: 'µM', finalConc: 0.5, finalUnit: 'µM', volPerRxnMicroliters: 2.5, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Template DNA (10 ng/µL)', stockConc: 10, stockUnit: 'ng/µL', finalConc: 0.4, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C', notes: 'Add into individual tubes last' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Initial Denaturation', tempCelsius: 98, durationSeconds: 30, cycles: 1 },
        { stepNumber: 2, phase: 'Denaturation', tempCelsius: 98, durationSeconds: 10, cycles: 30 },
        { stepNumber: 3, phase: 'Annealing (NEB Tm)', tempCelsius: 62, durationSeconds: 20, cycles: 30 },
        { stepNumber: 4, phase: 'Extension (30s/kb)', tempCelsius: 72, durationSeconds: 30, cycles: 30 },
        { stepNumber: 5, phase: 'Final Extension', tempCelsius: 72, durationSeconds: 120, cycles: 1 },
        { stepNumber: 6, phase: 'Hold', tempCelsius: 4, durationSeconds: 3600 }
      ]
    },
    revisionHistory: [
      { version: '3.0', date: '2026-02-01', changes: 'Updated to latest NEB Q5 Master Mix protocol specification.', author: 'NEB Technical Operations' }
    ]
  },
  {
    id: 'neb-nebuilder-e2621',
    documentId: 'SOP-NEB-E2621',
    version: '2.2',
    effectiveDate: '2026-01-15',
    title: 'NEB NEBuilder HiFi DNA Assembly Master Mix Protocol',
    category: 'Seamless DNA Assembly & Cloning',
    author: 'New England Biolabs (NEB) Synthetic Biology Group',
    reviewer: 'Dr. E. Vance, Lead Genome Engineering Scientist',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'E2621S / E2621L',
      officialDocUrl: 'https://www.neb.com/en/products/e2621-nebuilder-hifi-dna-assembly-master-mix',
      storageConditions: '-20°C',
      kitIncludes: ['NEBuilder HiFi DNA Assembly Master Mix (2X)', 'pUC19 Control DNA', 'Control Primers']
    },
    scope: 'This SOP details isothermal seamless assembly of 1–6 DNA fragments (0.1–20 kb) into linearized expression vectors using NEB NEBuilder HiFi DNA Assembly Master Mix. Offers higher efficiency and fidelity than Gibson Assembly.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'NEBuilder 2X Master Mix', description: 'Exonuclease, polymerase, and ligase reaction buffer.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true }
    ],
    equipmentRequired: [
      'Water Bath or Thermocycler (50°C Constant)',
      'Precision Micropipettes',
      'Ice Block'
    ],
    reagentsRequired: [
      'NEBuilder HiFi DNA Assembly Master Mix (Cat #E2621)',
      'Linearized Vector DNA (50 ng)',
      'Purified Insert DNA with 20–30 bp overlaps',
      'Nuclease-Free Water',
      'NEB 10-beta Competent E. coli (High Efficiency)'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Molar Ratio & Mass Calculation',
        instruction: 'Calculate fragment molar ratios: 1:2 vector-to-insert ratio for 1–2 fragments (50 ng vector + 2-fold molar excess insert). For 4–6 fragments, use 1:1 molar ratio (50 ng vector + 0.05 pmol per insert).',
        timingMinutes: 5
      },
      {
        stepNumber: 2,
        title: 'Assembly Reaction Assembly',
        instruction: 'Combine 10 µL NEBuilder 2X Master Mix, calculated vector and insert volumes (totaling 0.05–0.2 pmol DNA), and add Water to 20 µL final volume.',
        timingMinutes: 10,
        tempCelsius: 4
      },
      {
        stepNumber: 3,
        title: 'Isothermal Incubation at 50°C',
        instruction: 'Incubate assembly reaction in thermocycler at 50°C for 15 min (2–3 fragments) or 60 min (4–6 fragments). Store at -20°C or transform immediately.',
        timingMinutes: 15,
        tempCelsius: 50,
        criticalCheckpoint: 'Do not exceed 60 min incubation at 50°C.'
      },
      {
        stepNumber: 4,
        title: 'Transformation into NEB 10-beta E. coli',
        instruction: 'Transform 2 µL assembled DNA into 50 µL NEB 10-beta competent cells. Heat-shock @ 42°C for 30 sec. Outgrow in SOC medium @ 37°C for 60 min, then plate on selective agar.',
        timingMinutes: 90
      }
    ],
    qualityControl: [
      'Perform control assembly using included pUC19 control insert to ensure >95% cloning efficiency (>1,000 CFU/ng).'
    ],
    troubleshooting: [
      { issue: 'Low colony count or background vector colonies', cause: 'Incomplete vector digestion or overlapping sequence mismatch', solution: 'Gel-purify linearized vector; double-check 20–30 bp homology sequence overlaps using NEBuilder Assembly Tool.' }
    ],
    references: [
      { citation: 'New England Biolabs. (2025). NEBuilder HiFi DNA Assembly Technical Manual (E2621). NEB Documentation.', doiOrUrl: 'https://www.neb.com/en/products/e2621-nebuilder-hifi-dna-assembly-master-mix' }
    ],
    reactionSheet: {
      id: 'rxn-nebuilder-e2621',
      title: 'NEBuilder HiFi DNA Assembly Reaction (20 µL)',
      assayType: 'Seamless Isothermal Assembly',
      reactionVolumeMicroliters: 20,
      defaultNumReactions: 4,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 5.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'NEBuilder HiFi 2X Master Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 10.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Linearized Vector (50 ng/µL)', stockConc: 50, stockUnit: 'ng/µL', finalConc: 5, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Purified Insert 1 (25 ng/µL)', stockConc: 25, stockUnit: 'ng/µL', finalConc: 3.75, finalUnit: 'ng/µL', volPerRxnMicroliters: 3.0, pipettingOrder: 4, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [
      { version: '2.2', date: '2026-01-15', changes: 'Updated for multi-fragment (>4 pieces) assembly guidelines.', author: 'NEB SynthBio QA' }
    ]
  },
  {
    id: 'neb-taq-m0270',
    documentId: 'SOP-NEB-M0270',
    version: '4.0',
    effectiveDate: '2026-02-10',
    title: 'NEB Taq 2X Master Mix Standard & Colony PCR SOP',
    category: 'End-Point PCR & Screening',
    author: 'New England Biolabs (NEB) Polymerase Production Team',
    reviewer: 'Dr. A. Patel, Recombinant Enzyme Director',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'M0270S / M0270L',
      officialDocUrl: 'https://www.neb.com/en/products/m0270-taq-2x-master-mix',
      storageConditions: '-20°C',
      kitIncludes: ['Taq 2X Master Mix', 'Nuclease-Free Water']
    },
    scope: 'Standard analytical amplification, routine genotyping, and high-throughput colony screening using NEB Taq 2X Master Mix (optimized mix of Taq DNA Polymerase, dNTPs, and reaction buffer).',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Taq Buffer Solution', description: 'Standard enzymatic reagents.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true }
    ],
    equipmentRequired: [
      'PCR Thermocycler',
      'Microcentrifuge',
      'Pipettes'
    ],
    reagentsRequired: [
      'NEB Taq 2X Master Mix (Cat #M0270)',
      '10 µM Forward Primer',
      '10 µM Reverse Primer',
      'Template DNA / Colony Pick',
      'Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Master Mix Reaction Assembly',
        instruction: 'Assemble 25 µL reaction: 12.5 µL Taq 2X Master Mix, 0.5 µL Forward Primer (0.2 µM final), 0.5 µL Reverse Primer (0.2 µM final), Template DNA, and Water to 25 µL.',
        timingMinutes: 5
      },
      {
        stepNumber: 2,
        title: 'Thermal Cycling Program',
        instruction: 'Run thermocycler: 95°C 30 sec (5 min for bacterial colony lysis); 30 cycles [95°C 30s, 55°C 30s, 68°C 1 min/kb]; Final Extension 68°C 5 min.',
        timingMinutes: 60,
        tempCelsius: 68
      }
    ],
    qualityControl: [
      'Confirm 3\'-A overhangs for direct TA cloning into pGEM-T or pCR2.1 vectors.'
    ],
    troubleshooting: [
      { issue: 'Smearing on gel', cause: 'Excessive enzyme or template concentration', solution: 'Dilute template 1:100; ensure exact 1X master mix dilution.' }
    ],
    references: [
      { citation: 'New England Biolabs. (2025). Taq 2X Master Mix Protocol (M0270). NEB Technical Documentation.', doiOrUrl: 'https://www.neb.com/en/products/m0270-taq-2x-master-mix' }
    ],
    reactionSheet: {
      id: 'rxn-neb-taq-m0270',
      title: 'NEB Taq 2X Master Mix Reaction (25 µL)',
      assayType: 'Standard Analytical PCR',
      reactionVolumeMicroliters: 25,
      defaultNumReactions: 12,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 10.5, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'NEB Taq 2X Master Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 12.5, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: '10 µM Forward Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 0.5, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: '10 µM Reverse Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 0.5, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Template DNA (10 ng/µL)', stockConc: 10, stockUnit: 'ng/µL', finalConc: 0.4, finalUnit: 'ng/µL', volPerRxnMicroliters: 1.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [
      { version: '4.0', date: '2026-02-10', changes: 'Standardized for 96-well colony screening protocols.', author: 'NEB Production Operations' }
    ]
  },
  {
    id: 'neb-monarch-t1010',
    documentId: 'SOP-NEB-T1010',
    version: '3.2',
    effectiveDate: '2026-01-28',
    title: 'NEB Monarch Plasmid Miniprep Kit Standard SOP',
    category: 'Plasmid Isolation & Purification',
    author: 'New England Biolabs (NEB) Nucleic Acid Purification Group',
    reviewer: 'Dr. L. Zhang, Downstream Process Lead',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'T1010S / T1010L',
      officialDocUrl: 'https://www.neb.com/en/products/t1010-monarch-plasmid-miniprep-kit',
      storageConditions: '15–25°C (Room Temperature)',
      kitIncludes: ['Plasmid Resuspension Buffer (B1)', 'Plasmid Lysis Buffer (B2)', 'Plasmid Neutralization Buffer (B3)', 'Plasmid Wash Buffer 1 & 2', 'Monarch Plasmid Miniprep Columns', 'Monarch DNA Elution Buffer']
    },
    scope: 'Fast, high-yield silica column isolation of up to 20 µg high-purity plasmid DNA from 1.5–5 mL overnight E. coli cultures. Formulated for transfection-grade DNA with low salt carryover.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'Lysis & Neutralization Buffers', description: 'Contains sodium dodecyl sulfate (SDS) and guanidine hydrochloride. Causes eye and skin irritation.' },
      { type: 'FLAMMABLE', label: 'Plasmid Wash Buffer 2', description: 'Contains 80% Ethanol post-reconstitution.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Glasses', required: true }
    ],
    equipmentRequired: [
      'Microcentrifuge capable of ≥16,000 x g',
      'Vortexer & Tabletop Tube Rack',
      'Spectrophotometer (NanoDrop) or Fluorometer'
    ],
    reagentsRequired: [
      'NEB Monarch Plasmid Miniprep Kit (Cat #T1010)',
      'Overnight E. coli Culture in LB/Ampicillin',
      'Isopropanol / Ethanol (for buffer prep)'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Bacterial Cell Harvesting',
        instruction: 'Pellet 1.5–5 mL overnight E. coli culture at 16,000 x g for 1 min. Discard supernatant thoroughly.',
        timingMinutes: 3
      },
      {
        stepNumber: 2,
        title: 'Cell Resuspension, Lysis & Neutralization',
        instruction: 'Resuspend pellet completely in 200 µL Buffer B1 (RNase A added). Add 200 µL Buffer B2 (Lysis), gently invert 5–6 times until clear and viscous (do not vortex!). Add 400 µL Buffer B3 (Neutralization), invert immediately 4–6 times until flocculent precipitate forms.',
        timingMinutes: 5,
        criticalCheckpoint: 'Do not allow lysis step (Buffer B2) to exceed 2 minutes to prevent irreversible plasmid denaturation.'
      },
      {
        stepNumber: 3,
        title: 'Clarification & Column Binding',
        instruction: 'Centrifuge lysate at 16,000 x g for 5 min. Transfer clear supernatant (~700 µL) to Monarch Plasmid Miniprep Column. Centrifuge 1 min @ 16,000 x g. Discard flow-through.',
        timingMinutes: 6
      },
      {
        stepNumber: 4,
        title: 'Washing & High-Purity Elution',
        instruction: 'Wash column with 200 µL Buffer Wash 1 (centrifuge 1 min), then 400 µL Buffer Wash 2 (centrifuge 1 min). Spin column empty for 1 min to dry membrane. Transfer column to 1.5 mL tube, add 30 µL DNA Elution Buffer, wait 1 min, centrifuge 1 min.',
        timingMinutes: 6
      }
    ],
    qualityControl: [
      'Spectrophotometric analysis: A260/A280 ratio = 1.8–2.0; A260/A230 = 2.0–2.2.',
      'Digest 500 ng plasmid with restriction enzyme to verify complete cleavage.'
    ],
    troubleshooting: [
      { issue: 'Low plasmid yield', cause: 'Incomplete cell resuspension or culture age >18 hrs', solution: 'Ensure full resuspension of bacterial pellet in B1 before adding lysis buffer; harvest log-phase cultures.' }
    ],
    references: [
      { citation: 'New England Biolabs. (2025). Monarch Plasmid Miniprep Kit Manual (T1010). NEB Life Sciences.', doiOrUrl: 'https://www.neb.com/en/products/t1010-monarch-plasmid-miniprep-kit' }
    ],
    revisionHistory: [
      { version: '3.2', date: '2026-01-28', changes: 'Updated elution volume guidelines for ultra-concentrated downstream cloning.', author: 'NEB Downstream Team' }
    ]
  },
  {
    id: 'neb-onetaq-m0482',
    documentId: 'SOP-NEB-M0482',
    version: '2.1',
    effectiveDate: '2026-02-08',
    title: 'NEB OneTaq 2X Master Mix with Standard Buffer SOP',
    category: 'End-Point PCR & Screening',
    author: 'New England Biolabs (NEB) Technical Support',
    reviewer: 'Dr. K. Vance, Senior Enzymology Analyst',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'M0482S / M0482L',
      officialDocUrl: 'https://www.neb.com/en/products/m0482-onetaq-2x-master-mix-with-standard-buffer',
      storageConditions: '-20°C',
      kitIncludes: ['OneTaq 2X Master Mix with Standard Buffer', 'Nuclease-Free Water']
    },
    scope: 'Optimized blend of Taq and Deep Vent DNA polymerases for robust yield and high tolerance to difficult GC/AT rich templates.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Master Mix Buffer', description: 'Standard PCR buffer solution.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true }
    ],
    equipmentRequired: ['PCR Thermocycler', 'Microcentrifuge'],
    reagentsRequired: [
      'NEB OneTaq 2X Master Mix (Cat #M0482)',
      '10 µM Forward Primer',
      '10 µM Reverse Primer',
      'Template DNA',
      'Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Reaction Assembly',
        instruction: 'Assemble 50 µL reaction on ice: 25 µL OneTaq 2X Master Mix, 1 µL Forward Primer (0.2 µM), 1 µL Reverse Primer (0.2 µM), 1–2 µL Template DNA, Water to 50 µL.',
        timingMinutes: 5
      },
      {
        stepNumber: 2,
        title: 'Thermal Cycling',
        instruction: 'Run thermocycler: 94°C 30s; 30 cycles [94°C 30s, 55°C 30s, 68°C 1 min/kb]; Final Extension 68°C 5 min.',
        timingMinutes: 60,
        tempCelsius: 68
      }
    ],
    qualityControl: ['Verify single clear amplicon band on 1% Agarose gel.'],
    troubleshooting: [{ issue: 'Faint bands', cause: 'Insufficient template input', solution: 'Increase template input up to 100 ng genomic DNA.' }],
    references: [{ citation: 'NEB. (2025). OneTaq 2X Master Mix Manual (M0482).', doiOrUrl: 'https://www.neb.com' }],
    reactionSheet: {
      id: 'rxn-onetaq',
      title: 'NEB OneTaq 2X Master Mix (50 µL)',
      assayType: 'Standard & Complex Template PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 21.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'NEB OneTaq 2X Master Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Forward Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Reverse Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Template DNA (10 ng/µL)', stockConc: 10, stockUnit: 'ng/µL', finalConc: 0.4, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [{ version: '2.1', date: '2026-02-08', changes: 'Standardized for complex genomic templates.', author: 'NEB Operations' }]
  },
  {
    id: 'neb-phusion-m0531',
    documentId: 'SOP-NEB-M0531',
    version: '3.1',
    effectiveDate: '2026-01-22',
    title: 'NEB Phusion High-Fidelity PCR Master Mix Protocol',
    category: 'High-Fidelity PCR & Cloning',
    author: 'New England Biolabs (NEB) High-Fidelity Polymerase Group',
    reviewer: 'Dr. M. Reichenbach',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'M0531S / M0531L',
      officialDocUrl: 'https://www.neb.com/en/products/m0531-phusion-high-fidelity-pcr-master-mix-with-hf-buffer',
      storageConditions: '-20°C',
      kitIncludes: ['Phusion High-Fidelity PCR Master Mix with HF Buffer', 'DMSO', 'Nuclease-Free Water']
    },
    scope: 'Pyrococcus-like proofreading polymerase fused to Sso7d double-stranded DNA-binding domain for rapid extension (15–30s/kb) and extreme accuracy.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'DMSO', description: 'Skin penetrant organic solvent. Wear nitrile gloves.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['PCR Thermocycler', 'Microcentrifuge'],
    reagentsRequired: ['NEB Phusion Master Mix (Cat #M0531)', '10 µM Primers', 'Template DNA', 'Water'],
    steps: [
      { stepNumber: 1, title: 'Reaction Assembly', instruction: 'Combine 25 µL Phusion Master Mix, 2.5 µL Forward Primer (0.5 µM), 2.5 µL Reverse Primer (0.5 µM), Template DNA, Water to 50 µL on ice.', timingMinutes: 5 },
      { stepNumber: 2, title: 'Cycling', instruction: '98°C 30s; 30 cycles [98°C 10s, 60°C 15s, 72°C 15s/kb]; 72°C 5 min.', timingMinutes: 45, tempCelsius: 98 }
    ],
    qualityControl: ['Verify fidelity and extension speed on high molecular weight templates.'],
    troubleshooting: [{ issue: 'No amplification', cause: 'Annealing temperature too low', solution: 'Phusion requires higher annealing temperatures (use NEB Tm calculator).' }],
    references: [{ citation: 'NEB. (2025). Phusion High-Fidelity Master Mix Manual.', doiOrUrl: 'https://www.neb.com' }],
    reactionSheet: {
      id: 'rxn-phusion-m0531',
      title: 'NEB Phusion High-Fidelity Master Mix (50 µL)',
      assayType: 'High-Fidelity Fast PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 18.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'Phusion High-Fidelity Master Mix (2X)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: '10 µM Forward Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.5, finalUnit: 'µM', volPerRxnMicroliters: 2.5, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: '10 µM Reverse Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.5, finalUnit: 'µM', volPerRxnMicroliters: 2.5, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Template DNA (10 ng/µL)', stockConc: 10, stockUnit: 'ng/µL', finalConc: 0.4, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [{ version: '3.1', date: '2026-01-22', changes: 'Updated for fast 15s/kb extension protocols.', author: 'NEB Polymerase QA' }]
  },

  // --- THERMO FISHER SCIENTIFIC KITS ---
  {
    id: 'thermo-superscript-iv-12594025',
    documentId: 'SOP-TF-12594025',
    version: '2.4',
    effectiveDate: '2026-01-20',
    title: 'Thermo Fisher SuperScript IV One-Step RT-PCR Master Mix Protocol',
    category: 'Reverse Transcription & qPCR',
    author: 'Thermo Fisher Scientific Molecular Biology Division',
    reviewer: 'Dr. C. Lin, Senior Assay Validation Manager',
    companyKitInfo: {
      vendor: 'Thermo Fisher',
      catalogNumber: '12594025 / 12594010',
      officialDocUrl: 'https://www.thermofisher.com/order/catalog/product/12594025',
      storageConditions: '-20°C (Protect from light)',
      kitIncludes: ['SuperScript IV RT Mix', '2X Platinum SuperFi RT-PCR Master Mix', 'Nuclease-Free Water']
    },
    scope: 'Provides detailed instructions for single-tube reverse transcription and high-fidelity PCR amplification of viral or cellular RNA targets using Thermo Scientific SuperScript IV One-Step RT-PCR System.',
    biosafetyLevel: 'BSL-2',
    hazards: [
      { type: 'BIOHAZARD', label: 'Viral/Cellular RNA Extracts', description: 'Potentially infectious RNA preparations. Handle inside certified Class II Biosafety Cabinet.' },
      { type: 'CHEMICAL', label: 'RNase Inhibitors & Master Mix', description: 'Standard enzymatic reagents.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true, notes: 'Change frequently; treat all surfaces with RNaseZap.' },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Glasses', required: true }
    ],
    equipmentRequired: [
      'Class II Type A2 Biosafety Cabinet (BSL-2 Hood)',
      'Dedicated RNase-Free Micropipettes & Filter Barrier Tips',
      'Real-Time or End-Point PCR Thermocycler',
      'Vortexer & Benchtop Microcentrifuge'
    ],
    reagentsRequired: [
      'Thermo SuperScript IV One-Step RT-PCR Kit (Cat #12594025)',
      '10 µM Forward Target Primer',
      '10 µM Reverse Target Primer',
      'Target RNA Template (1 pg – 1 µg total RNA)',
      'Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Biosafety Hood Setup & RNase Decontamination',
        instruction: 'Decontaminate hood surfaces, pipettes, and tube racks with RNaseZap and 70% Ethanol. Allow 15 min UV exposure.',
        timingMinutes: 15
      },
      {
        stepNumber: 2,
        title: 'One-Step RT-PCR Master Mix Preparation',
        instruction: 'Assemble 50 µL reaction on ice: 25 µL 2X Platinum SuperFi RT-PCR Master Mix, 0.5 µL SuperScript IV RT Mix, 2.5 µL 10 µM Forward Primer, 2.5 µL 10 µM Reverse Primer, RNA Template, and Water.',
        timingMinutes: 10,
        tempCelsius: 4
      },
      {
        stepNumber: 3,
        title: 'Reverse Transcription & Amplification Cycling',
        instruction: 'Execute protocol: Reverse Transcription @ 55°C for 10 min; RT Inactivation / Denaturation @ 98°C for 2 min; 35 cycles of [98°C 10 sec, 60°C 10 sec, 72°C 15 sec/kb]; Final Extension @ 72°C 5 min.',
        timingMinutes: 75,
        tempCelsius: 55,
        criticalCheckpoint: 'SuperScript IV RT enzyme operates optimally at 50–55°C for complex structured RNA.'
      }
    ],
    qualityControl: [
      'Include a No-RT Control (minus reverse transcriptase) to check for genomic DNA contamination.',
      'Check RNA template purity: A260/A280 ratio between 1.9 and 2.1.'
    ],
    troubleshooting: [
      { issue: 'No amplicon or faint signal', cause: 'Degraded RNA template or severe secondary structure', solution: 'Increase RT reaction temperature to 55°C; check RNA integrity on TapeStation or agarose gel.' }
    ],
    references: [
      { citation: 'Thermo Fisher Scientific. (2025). SuperScript IV One-Step RT-PCR System User Guide (MAN0017726).', doiOrUrl: 'https://www.thermofisher.com' }
    ],
    reactionSheet: {
      id: 'rxn-superscript-iv',
      title: 'SuperScript IV One-Step RT-PCR Master Mix (50 µL)',
      assayType: 'One-Step RT-PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 17.5, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: '2X Platinum SuperFi RT-PCR Master Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'SuperScript IV RT Mix', stockConc: 100, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 0.5, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: '10 µM Forward Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.5, finalUnit: 'µM', volPerRxnMicroliters: 2.5, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: '10 µM Reverse Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.5, finalUnit: 'µM', volPerRxnMicroliters: 2.5, pipettingOrder: 5, storageTemp: '-20°C' },
        { id: 'c6', name: 'Target RNA Template', stockConc: 1, stockUnit: 'µg/µL', finalConc: 0.04, finalUnit: 'µg/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 6, storageTemp: '-80°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Reverse Transcription', tempCelsius: 55, durationSeconds: 600, cycles: 1 },
        { stepNumber: 2, phase: 'Initial Denaturation', tempCelsius: 98, durationSeconds: 120, cycles: 1 },
        { stepNumber: 3, phase: 'Denaturation', tempCelsius: 98, durationSeconds: 10, cycles: 35 },
        { stepNumber: 4, phase: 'Annealing', tempCelsius: 60, durationSeconds: 10, cycles: 35 },
        { stepNumber: 5, phase: 'Extension', tempCelsius: 72, durationSeconds: 15, cycles: 35 },
        { stepNumber: 6, phase: 'Final Extension', tempCelsius: 72, durationSeconds: 300, cycles: 1 }
      ]
    },
    revisionHistory: [
      { version: '2.4', date: '2026-01-20', changes: 'Standardized buffer kinetics for high throughput RT-PCR.', author: 'Thermo Fisher QA' }
    ]
  },
  {
    id: 'thermo-dreamtaq-k1081',
    documentId: 'SOP-TF-K1081',
    version: '3.0',
    effectiveDate: '2026-02-04',
    title: 'Thermo Scientific DreamTaq Green PCR Master Mix SOP',
    category: 'End-Point PCR & Screening',
    author: 'Thermo Fisher Scientific Molecular Biology',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Thermo Fisher',
      catalogNumber: 'K1081 / K1082',
      officialDocUrl: 'https://www.thermofisher.com/order/catalog/product/K1081',
      storageConditions: '-20°C',
      kitIncludes: ['DreamTaq Green PCR Master Mix (2X)', 'Nuclease-Free Water']
    },
    scope: 'Direct gel loading analytical PCR using enhanced Taq polymerase with high yields up to 6 kb.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Green Loading Dyes', description: 'Density tracking dyes included.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['PCR Thermocycler', 'Microcentrifuge'],
    reagentsRequired: ['DreamTaq Green Master Mix 2X (Cat #K1081)', '10 µM Primers', 'Template DNA', 'Water'],
    steps: [
      { stepNumber: 1, title: 'Reaction Mix', instruction: 'Combine 25 µL 2X Master Mix, 1 µL Forward Primer (0.2 µM), 1 µL Reverse Primer (0.2 µM), 2 µL Template, Water to 50 µL.', timingMinutes: 5 },
      { stepNumber: 2, title: 'Cycling', instruction: '95°C 3 min; 30 cycles [95°C 30s, 58°C 30s, 72°C 1 min/kb]; 72°C 5 min.', timingMinutes: 60, tempCelsius: 72 }
    ],
    qualityControl: ['Load products directly onto agarose gel without adding 6X buffer.'],
    troubleshooting: [{ issue: 'Non-specific band', cause: 'Low annealing temp', solution: 'Increase annealing temperature by 2–4°C.' }],
    references: [{ citation: 'Thermo Fisher. (2025). DreamTaq Green PCR Master Mix Manual.', doiOrUrl: 'https://www.thermofisher.com' }],
    reactionSheet: {
      id: 'rxn-dreamtaq',
      title: 'DreamTaq Green Master Mix (50 µL)',
      assayType: 'Direct Gel Loading PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 21.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'DreamTaq Green PCR Master Mix (2X)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: '10 µM Forward Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: '10 µM Reverse Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Template DNA', stockConc: 10, stockUnit: 'ng/µL', finalConc: 0.4, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [{ version: '3.0', date: '2026-02-04', changes: 'Updated for high-sensitivity gel electrophoresis.', author: 'Thermo Fisher QA' }]
  },

  // --- QIAGEN KITS ---
  {
    id: 'qiagen-rneasy-74104',
    documentId: 'SOP-QIA-74104',
    version: '4.1',
    effectiveDate: '2026-01-10',
    title: 'QIAGEN RNeasy Mini Kit Total RNA Isolation Protocol',
    category: 'RNA Extraction & Purification',
    author: 'QIAGEN Technical Application Department',
    reviewer: 'Dr. H. Weber, Lead Genomics Specialist',
    companyKitInfo: {
      vendor: 'QIAGEN',
      catalogNumber: '74104 / 74106',
      officialDocUrl: 'https://www.qiagen.com/us/products/discovery-and-translational-research/dna-rna-purification/rna-purification/total-rna/rneasy-mini-kit',
      storageConditions: '15–25°C (Room Temp)',
      kitIncludes: ['RNeasy Mini Spin Columns', 'Buffer RLT', 'Buffer RW1', 'Buffer RPE', 'RNase-Free Water']
    },
    scope: 'Describes silica-membrane spin column purification of up to 100 µg total RNA from animal cells, tissues, or yeast using QIAGEN RNeasy Mini Kit.',
    biosafetyLevel: 'BSL-2',
    hazards: [
      { type: 'TOXIC', label: 'Buffer RLT (Guanidine Thiocyanate)', description: 'Harmful if swallowed or inhaled. Causes severe eye/skin burns. DO NOT mix with bleach!' },
      { type: 'FLAMMABLE', label: '100% Ethanol & Buffer RPE', description: 'Flammable liquid. Keep away from direct flame.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true, notes: 'Must change if exposed to Buffer RLT' },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Glasses', required: true },
      { item: 'Fume Hood / Chemical Safety Hood', required: true, notes: 'Perform cell lysis with Buffer RLT in fume hood' }
    ],
    equipmentRequired: [
      'Microcentrifuge capable of 14,000 x g',
      'Vortexer & QIAshredder Spin Columns',
      'Fume Hood',
      'RNase-Free Microcentrifuge Tubes (1.5 mL)'
    ],
    reagentsRequired: [
      'QIAGEN RNeasy Mini Kit (Cat #74104)',
      '100% Ethanol (ACS Grade)',
      'β-Mercaptoethanol (β-ME, 10 µL per 1 mL Buffer RLT)',
      'RNaseZap Decontamination Wipes'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Lysis & Homogenization',
        instruction: 'Disrupt cell pellet (<1x10^7 cells) in 350 µL Buffer RLT containing 10 µL/mL β-ME. Homogenize by passing through a QIAshredder spin column at 14,000 x g for 2 min.',
        timingMinutes: 10,
        safetyWarning: 'Buffer RLT contains guanidine thiocyanate. Never add bleach directly to waste containing Buffer RLT.'
      },
      {
        stepNumber: 2,
        title: 'Ethanol Addition & Column Binding',
        instruction: 'Add 1 volume (350 µL) of 70% Ethanol to homogenate. Pipette to mix. Transfer 700 µL to RNeasy Mini Spin Column in 2 mL collection tube. Centrifuge at ≥8,000 x g for 15 sec. Discard flow-through.',
        timingMinutes: 5
      },
      {
        stepNumber: 3,
        title: 'Column Washing Steps',
        instruction: 'Add 700 µL Buffer RW1 to column, centrifuge 15 sec @ 8,000 x g. Add 500 µL Buffer RPE (with ethanol added), centrifuge 15 sec. Add second 500 µL Buffer RPE, centrifuge 2 min @ 8,000 x g to dry column membrane.',
        timingMinutes: 10
      },
      {
        stepNumber: 4,
        title: 'Elution of Purified Total RNA',
        instruction: 'Place RNeasy column into fresh 1.5 mL RNase-free tube. Add 30–50 µL RNase-Free Water directly to membrane. Centrifuge at 8,000 x g for 1 min. Quantify on Nanodrop and store at -80°C.',
        timingMinutes: 5
      }
    ],
    qualityControl: [
      'Verify spectrophotometric purity: A260/A280 = 1.9–2.1; A260/A230 = 2.0–2.2.',
      'Check RNA Integrity Number (RIN ≥ 8.0) on Agilent Bioanalyzer or TapeStation prior to RNA-Seq.'
    ],
    troubleshooting: [
      { issue: 'Low RNA yield', cause: 'Incomplete homogenization or clogged spin column', solution: 'Pass cell lysate through QIAshredder column; do not exceed 1x10^7 cells per column.' }
    ],
    references: [
      { citation: 'QIAGEN. (2024). RNeasy Mini Handbook (4th ed.). QIAGEN Life Sciences.', doiOrUrl: 'https://www.qiagen.com' }
    ],
    revisionHistory: [
      { version: '4.1', date: '2026-01-10', changes: 'Updated safety instructions regarding guanidine thiocyanate waste compliance.', author: 'QIAGEN Safety & Compliance' }
    ]
  },
  {
    id: 'qiagen-qiaquick-28104',
    documentId: 'SOP-QIA-28104',
    version: '3.3',
    effectiveDate: '2026-02-05',
    title: 'QIAGEN QIAquick PCR Purification Spin Column Protocol',
    category: 'DNA Cleanup & Gel Extraction',
    author: 'QIAGEN Technical Application Support',
    reviewer: 'Dr. H. Weber',
    companyKitInfo: {
      vendor: 'QIAGEN',
      catalogNumber: '28104 / 28106',
      officialDocUrl: 'https://www.qiagen.com/us/products/discovery-and-translational-research/dna-rna-purification/dna-purification/pcr-clean-up/qiaquick-pcr-purification-kit',
      storageConditions: '15–25°C',
      kitIncludes: ['QIAquick Spin Columns', 'Buffer PB', 'Buffer PE', 'Buffer EB']
    },
    scope: 'Silica column removal of primers, nucleotides, enzymes, and salts from enzymatic PCR reactions (100 bp to 10 kb).',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'TOXIC', label: 'Buffer PB', description: 'Contains guanidine hydrochloride. Do not mix with bleaching agents.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Microcentrifuge', 'Pipettes'],
    reagentsRequired: ['QIAquick PCR Purification Kit (Cat #28104)', '100% Ethanol (added to PE buffer)'],
    steps: [
      { stepNumber: 1, title: 'Binding', instruction: 'Add 5 volumes of Buffer PB to 1 volume PCR reaction (e.g., 250 µL PB to 50 µL PCR). Mix, transfer to QIAquick column, centrifuge 1 min @ 17,900 x g.', timingMinutes: 3 },
      { stepNumber: 2, title: 'Washing & Dry Spin', instruction: 'Add 750 µL Buffer PE, centrifuge 1 min. Discard flow-through, centrifuge column empty for 1 min.', timingMinutes: 3 },
      { stepNumber: 3, title: 'Elution', instruction: 'Transfer column to 1.5 mL tube. Add 30–50 µL Buffer EB (10 mM Tris-HCl, pH 8.5) or water, let stand 1 min, centrifuge 1 min.', timingMinutes: 3 }
    ],
    qualityControl: ['A260/A280 ratio = 1.8–1.9; >80% DNA recovery.'],
    troubleshooting: [{ issue: 'Low recovery', cause: 'pH of reaction too high', solution: 'Ensure Buffer PB turns yellow (pH ≤ 7.5); add 3M Sodium Acetate pH 5.0 if needed.' }],
    references: [{ citation: 'QIAGEN. (2025). QIAquick Spin Handbook.', doiOrUrl: 'https://www.qiagen.com' }],
    revisionHistory: [{ version: '3.3', date: '2026-02-05', changes: 'Updated pH indicator guidelines for Buffer PB.', author: 'QIAGEN QA' }]
  },

  // --- TAKARA BIO KITS ---
  {
    id: 'takara-infusion-638910',
    documentId: 'SOP-TAK-638910',
    version: '2.0',
    effectiveDate: '2026-02-05',
    title: 'Takara In-Fusion HD Cloning Plus Seamless Vector Assembly SOP',
    category: 'Seamless DNA Assembly & Cloning',
    author: 'Takara Bio USA Technical Services',
    reviewer: 'Dr. J. Tanaka, Principal Cloning Engineer',
    companyKitInfo: {
      vendor: 'Takara',
      catalogNumber: '638910 / 638911',
      officialDocUrl: 'https://www.takarabio.com/products/cloning/in-fusion-cloning',
      storageConditions: '-20°C',
      kitIncludes: ['5X In-Fusion HD Enzyme Premix', 'Cloning-Grade Vector', 'Stellar Competent Cells']
    },
    scope: 'Describes 15-minute directional, seamless assembly of 1–5 PCR inserts into any linearized vector using Takara In-Fusion HD Cloning Technology without restriction enzymes or ligation.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'BIOHAZARD', label: 'E. coli Competent Cells', description: 'K-12 non-pathogenic laboratory E. coli strains.' },
      { type: 'CHEMICAL', label: 'In-Fusion HD Master Mix', description: 'Enzyme stabilization buffer.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true }
    ],
    equipmentRequired: [
      'Water Bath or Heat Block (50°C & 42°C)',
      'Shaking Incubator (37°C)',
      'Precision Pipettes & Sterile Tips'
    ],
    reagentsRequired: [
      'Takara 5X In-Fusion HD Enzyme Premix',
      'Linearized Destination Vector (50–100 ng)',
      'Purified PCR Insert with 15 bp Vector Overlaps',
      'Takara Stellar Competent E. coli Cells',
      'SOC Medium'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Insert & Vector Ratio Calculation',
        instruction: 'Calculate optimal insert-to-vector molar ratio (2:1 for single insert; 1:1 for multiple inserts). Combine 50–100 ng linearized vector with calculated insert volume.',
        timingMinutes: 5
      },
      {
        stepNumber: 2,
        title: 'In-Fusion Assembly Reaction',
        instruction: 'In a 0.2 mL PCR tube, combine: 2 µL 5X In-Fusion HD Premix, Linearized Vector + Insert(s), and Deionized Water to 10 µL final volume. Incubate at 50°C for exactly 15 min.',
        timingMinutes: 15,
        tempCelsius: 50,
        criticalCheckpoint: 'Incubate at exactly 50°C for 15 min. Transfer to ice immediately following incubation.'
      },
      {
        stepNumber: 3,
        title: 'Transformation into Stellar E. coli',
        instruction: 'Thaw Stellar Competent Cells on ice. Add 2.5 µL of assembly reaction to 50 µL cells. Incubate on ice 30 min, heat-shock at 42°C for 45 sec, return to ice 2 min. Add 450 µL SOC and shake at 37°C for 1 hr. Plate on selective LB agar.',
        timingMinutes: 100,
        tempCelsius: 42
      }
    ],
    qualityControl: [
      'Perform colony PCR or Sanger sequencing across junction boundaries to confirm seamless 100% in-frame assembly.'
    ],
    troubleshooting: [
      { issue: 'Zero or low transformant colony count', cause: 'Insufficient vector linearization or incorrect 15 bp overlap extensions', solution: 'Verify 15 bp overlap sequence design using Takara online In-Fusion primer tool; gel-purify linearized vector.' }
    ],
    references: [
      { citation: 'Takara Bio. (2025). In-Fusion HD Cloning Plus User Manual (PT5162-1). Takara Bio USA.', doiOrUrl: 'https://www.takarabio.com' }
    ],
    reactionSheet: {
      id: 'rxn-infusion-hd',
      title: 'Takara In-Fusion HD Reaction (10 µL Total Volume)',
      assayType: 'Seamless Cloning Assembly',
      reactionVolumeMicroliters: 10,
      defaultNumReactions: 4,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Deionized Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 4.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: '5X In-Fusion HD Enzyme Premix', stockConc: 5, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 2.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Linearized Vector (50 ng/µL)', stockConc: 50, stockUnit: 'ng/µL', finalConc: 10, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Purified PCR Insert (2:1 molar ratio)', stockConc: 25, stockUnit: 'ng/µL', finalConc: 5, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 4, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [
      { version: '2.0', date: '2026-02-05', changes: 'Updated protocol for Stellar competent cell heat shock optimization.', author: 'Takara Bio Technical Operations' }
    ]
  },
  {
    id: 'takara-primestar-r045a',
    documentId: 'SOP-TAK-R045A',
    version: '3.1',
    effectiveDate: '2026-01-25',
    title: 'Takara PrimeSTAR Max DNA Polymerase Fast PCR SOP',
    category: 'High-Fidelity PCR & Cloning',
    author: 'Takara Bio Life Sciences Division',
    reviewer: 'Dr. J. Tanaka',
    companyKitInfo: {
      vendor: 'Takara',
      catalogNumber: 'R045A / R045B',
      officialDocUrl: 'https://www.takarabio.com/products/pcr/high-fidelity-pcr/primestar-max-dna-polymerase',
      storageConditions: '-20°C',
      kitIncludes: ['PrimeSTAR Max Premix (2X)']
    },
    scope: 'Ultra-fast extension (5s/kb) and extreme fidelity PCR using antibody-mediated hot-start PrimeSTAR Max Premix.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Premix Solution', description: 'Enzymatic reagents.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Fast PCR Thermocycler'],
    reagentsRequired: ['PrimeSTAR Max Premix 2X (Cat #R045A)', '10 µM Primers', 'Template DNA'],
    steps: [
      { stepNumber: 1, title: 'Reaction Prep', instruction: 'Combine 25 µL PrimeSTAR Max Premix (2X), 1.5 µL Forward Primer (0.3 µM), 1.5 µL Reverse Primer (0.3 µM), Template DNA, Water to 50 µL on ice.', timingMinutes: 5 },
      { stepNumber: 2, title: 'Fast Cycling', instruction: '98°C 1 min; 30 cycles [98°C 10s, 55°C 5s, 72°C 5s/kb]; 72°C 1 min.', timingMinutes: 25, tempCelsius: 72 }
    ],
    qualityControl: ['Verify extension speed of 5s/kb on gel.'],
    troubleshooting: [{ issue: 'Faint bands', cause: 'Over-extension', solution: 'Strictly adhere to 5s/kb extension time to prevent 3\'->5\' exonuclease degradation.' }],
    references: [{ citation: 'Takara Bio. (2025). PrimeSTAR Max User Manual.', doiOrUrl: 'https://www.takarabio.com' }],
    reactionSheet: {
      id: 'rxn-primestar-max',
      title: 'Takara PrimeSTAR Max Premix (50 µL)',
      assayType: 'Ultra-Fast High-Fidelity PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 20.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'PrimeSTAR Max Premix (2X)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Forward Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.3, finalUnit: 'µM', volPerRxnMicroliters: 1.5, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Reverse Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.3, finalUnit: 'µM', volPerRxnMicroliters: 1.5, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Template DNA (10 ng/µL)', stockConc: 10, stockUnit: 'ng/µL', finalConc: 0.4, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [{ version: '3.1', date: '2026-01-25', changes: 'Optimized for fast thermocycler ramp rates.', author: 'Takara QA' }]
  },

  // --- PROMEGA KITS ---
  {
    id: 'promega-gotaq-m7822',
    documentId: 'SOP-PMG-M7822',
    version: '3.1',
    effectiveDate: '2026-01-18',
    title: 'Promega GoTaq G2 Green Master Mix Standard PCR Protocol',
    category: 'End-Point PCR & Screening',
    author: 'Promega Corporation Technical Services',
    reviewer: 'Dr. R. Miller, Lead Assay Application Specialist',
    companyKitInfo: {
      vendor: 'Promega',
      catalogNumber: 'M7822 / M7823',
      officialDocUrl: 'https://www.promega.com/products/pcr/endpoint-pcr/gotaq-g2-green-master-mix',
      storageConditions: '-20°C or 4°C (Stable up to 4 months at 4°C)',
      kitIncludes: ['GoTaq G2 Green Master Mix (2X)', 'Nuclease-Free Water']
    },
    scope: 'Routine analytical PCR and high-throughput colony screening using Promega GoTaq G2 Green Master Mix containing two gel-loading dyes for direct gel loading post-amplification.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'GoTaq Green Buffer Dyes', description: 'Inert blue and yellow density tracking dyes.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true }
    ],
    equipmentRequired: [
      'PCR Thermocycler',
      'Pipettes & Filter Tips',
      'Microcentrifuge'
    ],
    reagentsRequired: [
      'Promega GoTaq G2 Green Master Mix (Cat #M7822)',
      '10 µM Forward Primer',
      '10 µM Reverse Primer',
      'Template DNA or E. coli Colony Suspension',
      'Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Master Mix Preparation',
        instruction: 'Thaw GoTaq G2 Green Master Mix on ice. Vortex to mix. Combine 25 µL GoTaq 2X Master Mix, 1.0 µL Forward Primer (0.2 µM final), 1.0 µL Reverse Primer (0.2 µM final), 2 µL Template DNA, and Water to 50 µL.',
        timingMinutes: 10
      },
      {
        stepNumber: 2,
        title: 'Thermal Cycling & Direct Gel Loading',
        instruction: 'Run thermocycler: 95°C 2 min; 30 cycles [95°C 30s, 55°C 30s, 72°C 1 min/kb]; 72°C 5 min. Load reaction products directly onto agarose gel without adding 6X loading dye.',
        timingMinutes: 90
      }
    ],
    qualityControl: [
      'Confirm direct gel loading dye bands (blue dye migrates ~3–5 kb; yellow dye migrates ~50 bp in 1% agarose).'
    ],
    troubleshooting: [
      { issue: 'Faint PCR bands', cause: 'Sub-optimal annealing temperature', solution: 'Run annealing temperature gradient from 50°C to 60°C.' }
    ],
    references: [
      { citation: 'Promega Corporation. (2025). GoTaq G2 Green Master Mix Product Information (MM782).', doiOrUrl: 'https://www.promega.com' }
    ],
    reactionSheet: {
      id: 'rxn-gotaq-g2',
      title: 'Promega GoTaq G2 Green PCR Master Mix (50 µL)',
      assayType: 'Analytical PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 21.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'GoTaq G2 Green Master Mix (2X)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Forward Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Reverse Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM', volPerRxnMicroliters: 1.0, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Template DNA (10 ng/µL)', stockConc: 10, stockUnit: 'ng/µL', finalConc: 0.4, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [
      { version: '3.1', date: '2026-01-18', changes: 'Updated for high-throughput colony PCR workflow.', author: 'Promega Technical Operations' }
    ]
  },

  // --- KAPA BIOSYSTEMS / ROCHE KITS ---
  {
    id: 'kapa-hifi-kk2601',
    documentId: 'SOP-KAPA-KK2601',
    version: '2.5',
    effectiveDate: '2026-02-02',
    title: 'KAPA HiFi HotStart ReadyMix High-Fidelity PCR Protocol',
    category: 'High-Fidelity PCR & Library Prep',
    author: 'Roche Sequencing & KAPA Biosystems',
    reviewer: 'Dr. S. O\'Connor, Senior NGS Assay Specialist',
    companyKitInfo: {
      vendor: 'KAPA Biosystems',
      catalogNumber: 'KK2601 / KK2602',
      officialDocUrl: 'https://sequencing.roche.com/us/en/products-solutions/by-category/library-preparation/pcr-amplification/kapa-hifi-hotstart.html',
      storageConditions: '-20°C',
      kitIncludes: ['KAPA HiFi HotStart ReadyMix (2X)', 'Nuclease-Free Water']
    },
    scope: 'High-fidelity amplification of difficult, GC- or AT-rich genomic templates and Next-Generation Sequencing (NGS) library amplification using engineered KAPA HiFi HotStart DNA Polymerase.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Enzyme Buffer Solution', description: 'Standard PCR master mix reagents.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true }
    ],
    equipmentRequired: [
      'Precision Micropipettes',
      'PCR Thermocycler with Heated Lid',
      'Microcentrifuge'
    ],
    reagentsRequired: [
      'KAPA HiFi HotStart ReadyMix 2X (Cat #KK2601)',
      '10 µM Forward Primer',
      '10 µM Reverse Primer',
      'Template DNA (10 ng genomic or NGS library construct)',
      'Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Master Mix Assembly',
        instruction: 'Assemble 50 µL reaction on ice: 25 µL KAPA HiFi ReadyMix (2X), 1.5 µL Forward Primer (0.3 µM final), 1.5 µL Reverse Primer (0.3 µM final), Template DNA, and Water to 50 µL.',
        timingMinutes: 10
      },
      {
        stepNumber: 2,
        title: 'KAPA Fast Cycling Profile Execution',
        instruction: 'Program thermocycler: Initial Denaturation 95°C 3 min; 25–30 cycles [98°C 20 sec, 60–65°C 15 sec, 72°C 30 sec/kb]; Final Extension 72°C 1 min; Hold 4°C.',
        timingMinutes: 45
      }
    ],
    qualityControl: [
      'Verify zero bias in GC-rich (up to 80% GC) and AT-rich regions on Agilent TapeStation HSD1000.'
    ],
    troubleshooting: [
      { issue: 'Over-amplification or high-molecular-weight smear in NGS library', cause: 'Excessive PCR cycles', solution: 'Reduce PCR cycles by 2–4 cycles; perform qPCR cycle optimization.' }
    ],
    references: [
      { citation: 'Roche Sequencing. (2025). KAPA HiFi HotStart ReadyMix Technical Data Sheet (KR0368-v11.0). Roche Diagnostics.', doiOrUrl: 'https://sequencing.roche.com' }
    ],
    reactionSheet: {
      id: 'rxn-kapa-hifi',
      title: 'KAPA HiFi HotStart ReadyMix Reaction (50 µL)',
      assayType: 'NGS & High-Fidelity PCR',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 20.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'KAPA HiFi HotStart ReadyMix (2X)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Forward Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.3, finalUnit: 'µM', volPerRxnMicroliters: 1.5, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Reverse Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.3, finalUnit: 'µM', volPerRxnMicroliters: 1.5, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'NGS Library / Template DNA', stockConc: 5, stockUnit: 'ng/µL', finalConc: 0.2, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ]
    },
    revisionHistory: [
      { version: '2.5', date: '2026-02-02', changes: 'Optimized for low-input NGS library prep workflows.', author: 'Roche KAPA Applications' }
    ]
  },

  // --- NGS LIBRARY PREPARATION KITS ---
  {
    id: 'nebnext-ultra-ii-dna-e7645',
    documentId: 'SOP-NEB-E7645',
    version: '4.0',
    effectiveDate: '2026-02-12',
    title: 'NEBNext Ultra II DNA Library Prep Kit for Illumina SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'New England Biolabs (NEB) Next Generation Sequencing Group',
    reviewer: 'Dr. A. Sharma, Lead Genomics Applications Scientist',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'E7645S / E7645L / E7103S',
      officialDocUrl: 'https://www.neb.com/en/products/e7645-nebnext-ultra-ii-dna-library-prep-kit-for-illumina',
      storageConditions: '-20°C',
      kitIncludes: ['NEBNext Ultra II End Prep Enzyme Mix', 'NEBNext Ultra II End Prep Reaction Buffer', 'NEBNext Ultra II Ligation Master Mix', 'NEBNext Ligation Enhancer', 'NEBNext Q5 Hot Start HiFi PCR Master Mix']
    },
    scope: 'High-yield, low-input (500 pg to 1 µg DNA) library construction for Illumina sequencing. Integrates streamlined enzymatic End Repair, A-Tailing, Adaptor Ligation, and high-fidelity Q5 PCR amplification.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'AMPure XP Beads / Polyethylene Glycol', description: 'Handle magnetic bead suspension in ethanol wash carefully.' },
      { type: 'FLAMMABLE', label: '80% Fresh Ethanol', description: 'Flammable liquid for magnetic bead cleanup.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true, notes: 'Nuclease-free certified gloves.' },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Glasses', required: true }
    ],
    equipmentRequired: [
      'Thermal Cycler with Heated Lid (≥105°C)',
      'Magnetic Separation Rack (for 0.2 mL tubes or 96-well plate)',
      'Fluorometer (Qubit 4.0 or Flex) & Microfluidic Analyzer (TapeStation 4200 / Bioanalyzer 2100)',
      'Vortexer & Microcentrifuge',
      'Nuclease-Free 0.2 mL PCR Strip Tubes'
    ],
    reagentsRequired: [
      'NEBNext Ultra II DNA Library Prep Kit (Cat #E7645)',
      'NEBNext Multiplex Oligos for Illumina (Adaptors & Index Primers)',
      'Agencourt AMPure XP Beads',
      'Freshly prepared 80% Ethanol',
      '0.1X TE Buffer or Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'End Repair & A-Tailing Reaction',
        instruction: 'In a 0.2 mL PCR tube, combine 50 µL sheared input DNA (500 pg–1 µg), 7 µL NEBNext Ultra II End Prep Reaction Buffer, and 3 µL NEBNext Ultra II End Prep Enzyme Mix (60 µL total). Mix by pipetting 10 times and spin briefly. Incubate in thermocycler: 20°C for 30 min, 65°C for 30 min (heated lid set to 75°C). Hold at 4°C.',
        timingMinutes: 60,
        tempCelsius: 65,
        criticalCheckpoint: 'Ensure thermocycler lid temperature is set to 75°C during the 65°C A-tailing step to prevent evaporation.'
      },
      {
        stepNumber: 2,
        title: 'Adaptor Ligation',
        instruction: 'Add directly to 60 µL End Prep reaction: 30 µL NEBNext Ultra II Ligation Master Mix, 1 µL NEBNext Ligation Enhancer, and 2.5 µL diluted NEBNext Adaptor for Illumina (dilute adaptor 1:10 for <50 ng DNA input). Mix thoroughly and incubate at 20°C for 15 min with heated lid off.',
        timingMinutes: 15,
        tempCelsius: 20
      },
      {
        stepNumber: 3,
        title: 'USER Enzyme Cleavage & Size Selection Cleanup',
        instruction: 'Add 3 µL USER Enzyme to ligation product, incubate at 37°C for 15 min. Perform AMPure XP bead cleanup (0.8X ratio: add 70 µL beads). Incubate 5 min, place on magnet for 5 min, discard supernatant. Wash twice with 200 µL 80% Ethanol. Air dry 2 min, elute in 17 µL 0.1X TE.',
        timingMinutes: 30,
        tempCelsius: 37
      },
      {
        stepNumber: 4,
        title: 'PCR Library Amplification with NEBNext Q5',
        instruction: 'Combine 15 µL purified adaptor-ligated DNA, 25 µL NEBNext Q5 Hot Start HiFi PCR Master Mix (2X), 5 µL Index Primer i7, and 5 µL Index Primer i5 (50 µL total). Thermocycle: 98°C 30s; 3–12 cycles [98°C 10s, 65°C 75s]; 65°C 5 min. Clean with 0.9X AMPure beads and quantify on Qubit/TapeStation.',
        timingMinutes: 45,
        tempCelsius: 98
      }
    ],
    qualityControl: [
      'Evaluate library size distribution on Agilent TapeStation High Sensitivity D1000 ScreenTape (expect peak ~300–400 bp).',
      'Verify complete adaptor dimer removal (<120 bp peak) prior to sequencing.'
    ],
    troubleshooting: [
      { issue: 'Adaptor dimer peak at ~120 bp', cause: 'Adaptor concentration too high or incomplete bead washing', solution: 'Dilute adaptors according to input DNA manual table; perform double 0.8X bead cleanup.' },
      { issue: 'Low library yield', cause: 'Insufficient PCR cycles or degraded input DNA', solution: 'Check input DNA integrity on DIN assay; increase PCR cycles by 2 cycles for low input (<5 ng).' }
    ],
    references: [
      { citation: 'New England Biolabs. (2025). NEBNext Ultra II DNA Library Prep Kit Manual (E7645). NEB Documentation.', doiOrUrl: 'https://www.neb.com' }
    ],
    reactionSheet: {
      id: 'rxn-nebnext-ultra-ii',
      title: 'NEBNext Ultra II DNA Library Assembly & PCR (50 µL Reaction)',
      assayType: 'NGS Library Preparation',
      reactionVolumeMicroliters: 50,
      defaultNumReactions: 12,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Purified Adaptor-Ligated DNA', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 15.0, pipettingOrder: 1, storageTemp: '4°C' },
        { id: 'c2', name: 'NEBNext Q5 Hot Start HiFi 2X Master Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 25.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Universal i7 Index Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 1, finalUnit: 'µM', volPerRxnMicroliters: 5.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Unique i5 Index Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 1, finalUnit: 'µM', volPerRxnMicroliters: 5.0, pipettingOrder: 4, storageTemp: '-20°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Initial Denaturation', tempCelsius: 98, durationSeconds: 30, cycles: 1 },
        { stepNumber: 2, phase: 'Denaturation', tempCelsius: 98, durationSeconds: 10, cycles: 6 },
        { stepNumber: 3, phase: 'Annealing & Extension', tempCelsius: 65, durationSeconds: 75, cycles: 6 },
        { stepNumber: 4, phase: 'Final Extension', tempCelsius: 65, durationSeconds: 300, cycles: 1 },
        { stepNumber: 5, phase: 'Hold', tempCelsius: 4, durationSeconds: 3600 }
      ]
    },
    revisionHistory: [
      { version: '4.0', date: '2026-02-12', changes: 'Updated for low-input 500 pg enzymatic fragmentation workflow.', author: 'NEB NGS Technical Operations' }
    ]
  },
  {
    id: 'nebnext-ultra-ii-rna-e7760',
    documentId: 'SOP-NEB-E7760',
    version: '3.2',
    effectiveDate: '2026-01-28',
    title: 'NEBNext Ultra II Directional RNA Library Prep Kit for Illumina SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'New England Biolabs (NEB) RNA & NGS Division',
    reviewer: 'Dr. L. Zhang, Lead Transcriptomics Specialist',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'E7760S / E7760L',
      officialDocUrl: 'https://www.neb.com/en/products/e7760-nebnext-ultra-ii-directional-rna-library-prep-kit-for-illumina',
      storageConditions: '-20°C / -80°C (RNA reagents)',
      kitIncludes: ['NEBNext First Strand Synthesis Enzyme Mix', 'NEBNext Second Strand Synthesis Enzyme Mix', 'NEBNext Ultra II End Prep Enzyme Mix', 'NEBNext Ultra II Ligation Master Mix', 'NEBNext Q5 Hot Start HiFi PCR Master Mix']
    },
    scope: 'Strand-specific dUTP method RNA library prep from 10 ng – 1 µg total RNA following Poly(A) mRNA isolation or rRNA depletion. Preserves strand orientation for accurate gene quantification.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'BIOHAZARD', label: 'Purified Total RNA Extract', description: 'Treat RNA reagents with strict RNase-free protocol.' },
      { type: 'FLAMMABLE', label: '80% Ethanol', description: 'Bead washing agent.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true, notes: 'Change frequently; treat work surfaces with RNaseZap.' },
      { item: 'Lab Coat', required: true }
    ],
    equipmentRequired: [
      'Thermal Cycler with Programmable Ramp Rates',
      'Magnetic Separation Stand',
      'Bioanalyzer 2100 / TapeStation 4200'
    ],
    reagentsRequired: [
      'NEBNext Ultra II Directional RNA Kit (Cat #E7760)',
      'NEBNext Poly(A) mRNA Magnetic Isolation Module (Cat #E7490)',
      'AMPure XP Beads',
      '80% Ethanol',
      'Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'RNA Fragmentation & First Strand cDNA Synthesis',
        instruction: 'Combine 5 µL poly(A) mRNA or rRNA-depleted RNA with 4 µL First Strand Synthesis Reaction Buffer and 1 µL Random Primers. Frag @ 94°C for 15 min (or 8 min for degraded RNA). Cool to 4°C. Add 10 µL First Strand Synthesis Enzyme Mix. Incubate: 25°C 10 min, 42°C 15 min, 70°C 15 min.',
        timingMinutes: 60,
        tempCelsius: 42
      },
      {
        stepNumber: 2,
        title: 'Second Strand cDNA Synthesis (dUTP Marking)',
        instruction: 'Add 8 µL Second Strand Synthesis Reaction Buffer (with dUTP), 4 µL Second Strand Synthesis Enzyme Mix, and 48 µL Nuclease-Free Water to 20 µL First Strand product (80 µL total). Incubate at 16°C for 1 hr in thermocycler.',
        timingMinutes: 60,
        tempCelsius: 16
      },
      {
        stepNumber: 3,
        title: 'Bead Purification & End Repair / Adaptor Ligation',
        instruction: 'Clean second strand cDNA with 1.8X AMPure XP beads. Elute in 50 µL 0.1X TE. Add 7 µL Ultra II End Prep Reaction Buffer and 3 µL End Prep Enzyme Mix. Incubate 20°C 30 min, 65°C 30 min. Ligate NEBNext Adaptors at 20°C for 15 min.',
        timingMinutes: 90,
        tempCelsius: 65
      },
      {
        stepNumber: 4,
        title: 'USER Digest & Strand-Specific PCR Amplification',
        instruction: 'Add 3 µL USER Enzyme to digest dUTP second strand (ensuring >99% strand specificity). Clean with 0.8X beads. Amplify with NEBNext Q5 Master Mix + Dual Index Primers (8–12 cycles). Verify average library size ~300 bp on TapeStation.',
        timingMinutes: 60,
        tempCelsius: 98
      }
    ],
    qualityControl: [
      'Verify library concentration via Qubit dsDNA HS Assay and check cDNA peak fragment size (250–400 bp).',
      'Confirm >98% directional mapping rate during demultiplexing.'
    ],
    troubleshooting: [
      { issue: 'Loss of strand orientation', cause: 'Omission of USER enzyme digest or thermal degradation of dUTP', solution: 'Ensure USER enzyme step is incubated at 37°C for full 15 min before PCR.' }
    ],
    references: [
      { citation: 'New England Biolabs. (2025). NEBNext Ultra II Directional RNA Library Prep Instruction Manual (E7760). NEB.', doiOrUrl: 'https://www.neb.com' }
    ],
    revisionHistory: [
      { version: '3.2', date: '2026-01-28', changes: 'Optimized high-temperature fragmentation for FFPE and low RIN RNA.', author: 'NEB RNA Team' }
    ]
  },
  {
    id: 'illumina-dna-prep-20060059',
    documentId: 'SOP-ILMN-20060059',
    version: '5.1',
    effectiveDate: '2026-02-10',
    title: 'Illumina DNA Prep (Nextera DNA Flex) Library Construction Protocol',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Illumina Genomic Solutions Applications Team',
    reviewer: 'Dr. M. Vance, Lead Sequencing Specialist',
    companyKitInfo: {
      vendor: 'Illumina',
      catalogNumber: '20060059 / 20018704',
      officialDocUrl: 'https://www.illumina.com/products/by-type/sequencing-kits/library-prep-kits/dna-prep.html',
      storageConditions: '2°C to 8°C (Beads) / -20°C (Enzymes)',
      kitIncludes: ['eBLT (Enrichment Bead-Linked Transposome)', 'TB1 (Tagmentation Buffer 1)', 'TSB (Tagment Stop Buffer)', 'EPM (Enhanced PCR Mix)', 'TWB (Wash Buffer)']
    },
    scope: 'On-bead transposome tagmentation for rapid DNA library preparation from 1–500 ng genomic DNA or blood/saliva samples. Eliminates separate DNA shearing and normalization steps.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Tagmentation Stop Buffer (TSB)', description: 'Contains SDS surfactant. May cause mild eye or skin irritation.' },
      { type: 'TOXIC', label: 'Bead-Linked Transposomes (eBLT)', description: 'Magnetic bead suspension.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Glasses', required: true }
    ],
    equipmentRequired: [
      'Microplate Thermal Cycler with Heated Lid',
      'Magnetic Stand for 96-well microplates',
      'Microplate Shaker / Vortexer (1800 RPM capacity)',
      'Fluorometer (Qubit 4) & TapeStation 4200'
    ],
    reagentsRequired: [
      'Illumina DNA Prep Kit (Cat #20060059)',
      'Illumina DNA Prep Indexes (IDT for Illumina Unique Dual Indexes)',
      'Fresh 80% Ethanol',
      'Nuclease-Free Water'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'On-Bead Tagmentation Reaction Assembly',
        instruction: 'Thaw eBLT and TB1 at room temperature and vortex eBLT vigorously for 10 sec. Combine 11 µL eBLT and 11 µL TB1 per reaction. Add 30 µL DNA sample (100–500 ng gDNA) to 22 µL eBLT/TB1 mix (52 µL total). Pipette mix 10 times. Incubate in thermocycler at 55°C for 15 min with heated lid on.',
        timingMinutes: 20,
        tempCelsius: 55,
        criticalCheckpoint: 'Vortex eBLT thoroughly to ensure complete bead resuspension before pipetting.'
      },
      {
        stepNumber: 2,
        title: 'Tagmentation Stop & Bead Washing',
        instruction: 'Add 10 µL TSB to tagmentation product, mix, and incubate at 37°C for 15 min. Place on magnetic stand for 3 min until clear. Discard supernatant. Wash beads twice with 45 µL TWB (Tagmentation Wash Buffer), leaving TWB on beads during second wash until PCR prep.',
        timingMinutes: 25,
        tempCelsius: 37
      },
      {
        stepNumber: 3,
        title: 'On-Bead PCR Amplification',
        instruction: 'Remove TWB completely from beads on magnet. Add 22 µL Nuclease-Free Water, 22 µL EPM (Enhanced PCR Mix), and 10 µL Index Primers (UDP i7/i5). Thermocycle: 68°C 3 min; 98°C 3 min; 5 cycles [98°C 20s, 60°C 30s, 72°C 30s]; 72°C 5 min.',
        timingMinutes: 30,
        tempCelsius: 98
      },
      {
        stepNumber: 4,
        title: 'Double-Sided Bead Cleanup & Quantification',
        instruction: 'Magnetize PCR product and transfer 45 µL supernatant to new tube. Perform double-sided size selection using Purification Beads (0.6X / 0.2X ratio) to isolate 300–600 bp fragments. Elute in 20 µL RSB buffer. Quantify on Qubit.',
        timingMinutes: 30
      }
    ],
    qualityControl: [
      'Expect tight fragment size distribution centered at 450–600 bp on TapeStation D1000 ScreenTape.',
      'Check library concentration (>5 nM normalized concentration achieved automatically for inputs ≥100 ng).'
    ],
    troubleshooting: [
      { issue: 'Low library yield (<2 nM)', cause: 'Inadequate eBLT bead resuspension or DNA input <1 ng', solution: 'Vortex eBLT 30s prior to use; increase PCR cycles from 5 to 8 for input <10 ng.' }
    ],
    references: [
      { citation: 'Illumina. (2025). Illumina DNA Prep Reference Guide (Document #1000000025416 v09). Illumina Inc.', doiOrUrl: 'https://www.illumina.com' }
    ],
    reactionSheet: {
      id: 'rxn-illumina-dna-prep',
      title: 'Illumina DNA Prep On-Bead PCR Master Mix (54 µL)',
      assayType: 'NGS On-Bead Tagmentation',
      reactionVolumeMicroliters: 54,
      defaultNumReactions: 16,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 22.0, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'Enhanced PCR Mix (EPM)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 22.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'IDT for Illumina UDP Index Pair', stockConc: 10, stockUnit: 'µM', finalConc: 1.8, finalUnit: 'µM', volPerRxnMicroliters: 10.0, pipettingOrder: 3, storageTemp: '-20°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Initial Extension', tempCelsius: 68, durationSeconds: 180, cycles: 1 },
        { stepNumber: 2, phase: 'Initial Denaturation', tempCelsius: 98, durationSeconds: 180, cycles: 1 },
        { stepNumber: 3, phase: 'Denaturation', tempCelsius: 98, durationSeconds: 20, cycles: 5 },
        { stepNumber: 4, phase: 'Annealing', tempCelsius: 60, durationSeconds: 30, cycles: 5 },
        { stepNumber: 5, phase: 'Extension', tempCelsius: 72, durationSeconds: 30, cycles: 5 },
        { stepNumber: 6, phase: 'Final Extension', tempCelsius: 72, durationSeconds: 300, cycles: 1 }
      ]
    },
    revisionHistory: [
      { version: '5.1', date: '2026-02-10', changes: 'Updated for IDT for Illumina 10 bp Unique Dual Index workflow.', author: 'Illumina Sequencing QA' }
    ]
  },
  {
    id: 'illumina-stranded-mrna-20020594',
    documentId: 'SOP-ILMN-20020594',
    version: '3.0',
    effectiveDate: '2026-01-15',
    title: 'Illumina Stranded mRNA Prep Protocol for NextSeq/NovaSeq',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Illumina Technical Support / RNA Operations',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Illumina',
      catalogNumber: '20020594 / 20020595',
      officialDocUrl: 'https://www.illumina.com/products/by-type/sequencing-kits/library-prep-kits/stranded-rna-prep.html',
      storageConditions: '-20°C / 4°C',
      kitIncludes: ['Oligo(dT) Magnetic Beads (OBM)', 'RNA Fragmentation Array (RFA)', 'Reverse Transcriptase (FSM)', 'Anchor Adaptors (RNA)', 'Enhanced PCR Mix (EPM)']
    },
    scope: 'Poly(A) mRNA capture and strand-specific cDNA library construction from 25–1,000 ng intact total RNA (RIN ≥ 7.0).',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'RNA Elution & Fragmentation Buffers', description: 'Standard enzymatic RNA buffers.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['96-Well Thermocycler', 'Magnetic Plate Stand', 'Qubit / TapeStation'],
    reagentsRequired: ['Illumina Stranded mRNA Prep (Cat #20020594)', 'Illumina RNA UD Indexes', 'Fresh 80% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'Poly(A) Selection & RNA Fragmentation', instruction: 'Bind total RNA (100 ng) to OBM beads in 50 µL volume. Wash beads on magnet. Elute and fragment mRNA in RFA buffer @ 94°C for 8 min.', timingMinutes: 45, tempCelsius: 94 },
      { stepNumber: 2, title: 'First & Second Strand cDNA Synthesis', instruction: 'Synthesize 1st strand with FSM at 42°C 15 min. Synthesize 2nd strand with SSM (dUTP) at 16°C 1 hr.', timingMinutes: 75, tempCelsius: 42 },
      { stepNumber: 3, title: 'A-Tailing & Ligation', instruction: 'Add A-Tailing Mix (ATL) @ 37°C 30 min. Ligate RNA Anchor Adaptors @ 20°C 15 min.', timingMinutes: 45, tempCelsius: 37 },
      { stepNumber: 4, title: 'PCR Amplification & Final Cleanup', instruction: 'Amplify ligated library with EPM and Dual Indexes (10–12 cycles). Clean with Purification Beads (0.8X). Measure size distribution ~350 bp.', timingMinutes: 45, tempCelsius: 98 }
    ],
    qualityControl: ['Confirm >99% strandedness mapping rate in RNA-Seq alignment.'],
    troubleshooting: [{ issue: 'High 3\'-5\' bias', cause: 'Degraded RNA starting material', solution: 'Use Illumina Stranded Total RNA Prep with Ribo-Zero Plus for RIN < 6.0.' }],
    references: [{ citation: 'Illumina. (2025). Illumina Stranded mRNA Prep Guide (#1000000124518).', doiOrUrl: 'https://www.illumina.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-01-15', changes: 'Standardized for NovaSeq X Series compatibility.', author: 'Illumina QA' }]
  },
  {
    id: 'kapa-hyperprep-kk8504',
    documentId: 'SOP-KAPA-KK8504',
    version: '3.1',
    effectiveDate: '2026-02-01',
    title: 'KAPA HyperPrep Kit DNA Library Construction SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Roche Sequencing Solutions / KAPA Biosystems',
    reviewer: 'Dr. S. O\'Connor',
    companyKitInfo: {
      vendor: 'KAPA Biosystems',
      catalogNumber: 'KK8504 / 07962363001',
      officialDocUrl: 'https://sequencing.roche.com/us/en/products-solutions/by-category/library-preparation/dna-library-preparation/kapa-hyperprep-kit.html',
      storageConditions: '-20°C',
      kitIncludes: ['End Repair & A-Tailing Buffer', 'End Repair & A-Tailing Enzyme Mix', 'Ligation Buffer', 'DNA Ligase', 'KAPA HiFi HotStart ReadyMix']
    },
    scope: 'Single-tube enzymatic End Repair, A-tailing, and adaptor ligation for 1 ng – 1 µg sheared DNA inputs.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Ligation Buffer', description: 'Contains PEG 6000 ligation crowding agent.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermocycler', 'Magnetic Separation Rack', 'Qubit 4 Fluorometer'],
    reagentsRequired: ['KAPA HyperPrep Kit (Cat #KK8504)', 'KAPA Adapter Kits for Illumina', 'KAPA Pure Beads', '80% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'Combined End Repair & A-Tailing', instruction: 'Combine 50 µL sheared DNA, 7 µL ER&AT Buffer, and 3 µL ER&AT Enzyme Mix. Incubate: 20°C 30 min, 65°C 30 min in thermocycler.', timingMinutes: 60, tempCelsius: 65 },
      { stepNumber: 2, title: 'Adaptor Ligation', instruction: 'Add directly to ER&AT reaction: 30 µL Ligation Buffer, 10 µL DNA Ligase, and 5 µL KAPA Adapter. Incubate @ 20°C for 15 min.', timingMinutes: 15, tempCelsius: 20 },
      { stepNumber: 3, title: 'Post-Ligation Cleanup & PCR', instruction: 'Clean with 0.8X KAPA Pure Beads. Amplify with KAPA HiFi HotStart ReadyMix (4–10 cycles). Clean with 1.0X beads and quantify.', timingMinutes: 45, tempCelsius: 98 }
    ],
    qualityControl: ['A260/A280 = 1.8; Qubit library concentration >10 nM.'],
    troubleshooting: [{ issue: 'Adaptor dimers', cause: 'Adaptor concentration too high for low input', solution: 'Adjust adapter-to-insert ratio according to KAPA input matrix.' }],
    references: [{ citation: 'Roche Sequencing. (2025). KAPA HyperPrep Technical Data Sheet (KR0961).', doiOrUrl: 'https://sequencing.roche.com' }],
    revisionHistory: [{ version: '3.1', date: '2026-02-01', changes: 'Updated for KAPA Pure Beads automation protocols.', author: 'Roche Applications' }]
  },
  {
    id: 'qiagen-qiaseq-fx-180473',
    documentId: 'SOP-QIA-180473',
    version: '2.3',
    effectiveDate: '2026-01-20',
    title: 'QIAGEN QIAseq FX DNA Library Kit Enzymatic Fragmentation SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'QIAGEN Genomics Applications',
    reviewer: 'Dr. H. Weber',
    companyKitInfo: {
      vendor: 'QIAGEN',
      catalogNumber: '180473 / 180475',
      officialDocUrl: 'https://www.qiagen.com/us/products/discovery-and-translational-research/next-generation-sequencing/dna-sequencing/whole-genome-sequencing/qiaseq-fx-dna-library-kit',
      storageConditions: '-20°C',
      kitIncludes: ['FX Enzymatic Fragmentation Buffer', 'FX Enzyme Mix', 'FX End Repair / A-Tailing Master Mix', 'DNA Ligase Master Mix', 'HiFi PCR Master Mix']
    },
    scope: 'All-in-one enzymatic DNA fragmentation and library preparation from 20 pg to 1 µg gDNA without mechanical sonication.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'FX Enzymatic Mix', description: 'Endonuclease and nicking enzyme blend.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Ice Block', 'Thermocycler with Precise Temperature Ramp', 'Magnetic Rack'],
    reagentsRequired: ['QIAseq FX DNA Kit (Cat #180473)', 'QIAseq Unique Dual Index Y-Adapters', 'QIAseq Beads'],
    steps: [
      { stepNumber: 1, title: 'Enzymatic Fragmentation Assembly', instruction: 'Mix 10 µL DNA (100 ng) with 2.5 µL FX Buffer and 2.5 µL FX Enzyme Mix on ice. Incubate in pre-chilled thermocycler: 4°C 1 min, 32°C 15 min (for 350 bp insert), 65°C 30 min (inactivation).', timingMinutes: 48, tempCelsius: 32, criticalCheckpoint: 'Pre-chill thermocycler to 4°C before placing tubes.' },
      { stepNumber: 2, title: 'Adaptor Ligation & PCR', instruction: 'Add 20 µL Ligase Master Mix and 5 µL Adapter. Incubate @ 20°C for 15 min. Clean with 0.8X QIAseq Beads. Perform 6 PCR cycles with HiFi Master Mix.', timingMinutes: 45, tempCelsius: 20 }
    ],
    qualityControl: ['Verify insert size peak at 350 bp on Agilent Bioanalyzer.'],
    troubleshooting: [{ issue: 'Under/over fragmentation', cause: 'Incorrect fragmentation time at 32°C', solution: 'Adjust 32°C incubation time between 10–22 min based on target fragment size chart.' }],
    references: [{ citation: 'QIAGEN. (2025). QIAseq FX DNA Library Handbook.', doiOrUrl: 'https://www.qiagen.com' }],
    revisionHistory: [{ version: '2.3', date: '2026-01-20', changes: 'Refined 32°C fragmentation timing curve.', author: 'QIAGEN QA' }]
  },
  {
    id: 'pacbio-smrtbell-prep-3',
    documentId: 'SOP-PACBIO-102182700',
    version: '3.0',
    effectiveDate: '2026-02-08',
    title: 'PacBio SMRTbell Prep Kit 3.0 Long-Read HiFi Library SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Pacific Biosciences Applications Engineering',
    reviewer: 'Dr. R. Vance, Lead Long-Read Sequencing Specialist',
    companyKitInfo: {
      vendor: 'PacBio',
      catalogNumber: '102-182-700',
      officialDocUrl: 'https://www.pacb.com/products-and-services/consumables/pacbio-site-prep-kits/smrtbell-prep-kit-3-0/',
      storageConditions: '-20°C',
      kitIncludes: ['DNA Damage Repair Mix v3', 'End Repair / A-Tailing Mix v3', 'Overhang Adapter Mix v3', 'SMRTbell Cleanup Beads']
    },
    scope: 'Constructs closed single-stranded hairpin SMRTbell libraries for PacBio Revio and Sequel IIe long-read HiFi sequencing from high-molecular-weight (HMW) genomic DNA (>15 kb).',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'DDR Enzyme Mix', description: 'Enzymatic repair reagents.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Femto Pulse / Megaruptor 3', 'Thermocycler', 'Magnetic Separation Stand', 'Qubit 4 Fluorometer'],
    reagentsRequired: ['PacBio SMRTbell Prep Kit 3.0 (Cat #102-182-700)', 'SMRTbell Cleanup Beads', 'Nuclease-Free Water'],
    steps: [
      { stepNumber: 1, title: 'DNA Damage Repair & End Polish', instruction: 'Combine 500 ng sheared HMW DNA (15–20 kb), 7 µL DDR Buffer, 3 µL DDR Enzyme, 3 µL End Repair/A-Tailing Mix. Incubate: 37°C 30 min, 65°C 30 min.', timingMinutes: 60, tempCelsius: 37 },
      { stepNumber: 2, title: 'Hairpin Adaptor Ligation', instruction: 'Add 30 µL Ligation Master Mix and 5 µL SMRTbell Hairpin Adapter v3. Incubate @ 20°C for 60 min. Inactivate ligase at 65°C 10 min.', timingMinutes: 70, tempCelsius: 20 },
      { stepNumber: 3, title: 'Nuclease Digestion of Unligated DNA', instruction: 'Add 2 µL Nuclease Mix (Exonuclease III & VII) to digest unligated linear DNA at 37°C for 1 hr. Clean with 0.8X SMRTbell Cleanup Beads and elute in Elution Buffer.', timingMinutes: 75, tempCelsius: 37 }
    ],
    qualityControl: ['Verify average HiFi library length >15 kb on Femto Pulse System with zero unligated linear DNA remnants.'],
    troubleshooting: [{ issue: 'Low HiFi read length', cause: 'Sheared HMW DNA degraded during pipetting', solution: 'Use wide-bore pipette tips for all fluid transfer steps involving HMW DNA.' }],
    references: [{ citation: 'Pacific Biosciences. (2025). Procedure & Checklist - Preparing HiFi Libraries using SMRTbell Prep Kit 3.0 (PN 102-182-700). PacBio.', doiOrUrl: 'https://www.pacb.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-02-08', changes: 'Updated for Revio system 25M SMRT Cell density.', author: 'PacBio Operations' }]
  },
  {
    id: 'ont-sqk-lsk114',
    documentId: 'SOP-ONT-SQK114',
    version: '4.0',
    effectiveDate: '2026-02-11',
    title: 'Oxford Nanopore Ligation Sequencing Kit V14 (SQK-LSK114) SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Oxford Nanopore Technologies Technical Applications',
    reviewer: 'Dr. J. Miller, Nanopore Field Applications Lead',
    companyKitInfo: {
      vendor: 'Oxford Nanopore',
      catalogNumber: 'SQK-LSK114',
      officialDocUrl: 'https://store.nanoporetech.com/ligation-sequencing-kit-v14.html',
      storageConditions: '-20°C / 4°C (Loading Beads)',
      kitIncludes: ['Ligation Adapter (LA)', 'Ligation Buffer (LNB)', 'Long Fragment Buffer (LFB)', 'Short Fragment Buffer (SFB)', 'Sequencing Auxiliary V14 (SB, LIB)']
    },
    scope: 'Native DNA library preparation for Oxford Nanopore MinION, GridION, and PromethION sequencing using Kit 14 chemistry (99% raw read accuracy).',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'TOXIC', label: 'AMPure XP / LFB Buffer', description: 'Bead washing solutions.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['MinION / PromethION Sequencer', 'Thermocycler', 'Magnetic Rack', 'Qubit 4 Fluorometer'],
    reagentsRequired: ['ONT SQK-LSK114 Kit', 'NEBNext Ultra II End Repair/A-Tailing Module (E7546)', 'NEB Blunt/TA Ligase (M0367)', 'Fresh 80% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'DNA End-Prep & A-Tailing', instruction: 'Combine 1 µg gDNA in 47 µL water with 7 µL NEBNext End Prep Buffer and 3 µL End Prep Enzyme Mix. Incubate: 20°C 20 min, 65°C 20 min. Clean with 1.0X AMPure beads, elute in 60 µL water.', timingMinutes: 50, tempCelsius: 65 },
      { stepNumber: 2, title: 'Nanopore Adaptor Ligation', instruction: 'Mix 60 µL End-prepped DNA with 25 µL Ligation Buffer (LNB), 10 µL NEB Blunt/TA Ligase, and 5 µL Ligation Adapter (LA). Incubate @ room temperature for 20 min.', timingMinutes: 20 },
      { stepNumber: 3, title: 'LFB/SFB Wash & Flow Cell Loading Prep', instruction: 'Add 0.4X AMPure beads. Wash bead pellet twice with 250 µL Long Fragment Buffer (LFB for >3 kb) or Short Fragment Buffer (SFB). Elute in 25 µL Elution Buffer (EB). Mix with SB and LIB for flow cell loading.', timingMinutes: 30 }
    ],
    qualityControl: ['Quantify library recovery on Qubit (>350 ng recommended for MinION loading).'],
    troubleshooting: [{ issue: 'Pore blocking during run', cause: 'Unbound adaptors or short fragments clogging nanopores', solution: 'Use LFB wash buffer instead of SFB; perform Short Read Eliminator (SRE) cleanup prior to end-repair.' }],
    references: [{ citation: 'Oxford Nanopore Technologies. (2025). Ligation Sequencing Kit V14 Protocol (SQK-LSK114). ONT Community.', doiOrUrl: 'https://community.nanoporetech.com' }],
    revisionHistory: [{ version: '4.0', date: '2026-02-11', changes: 'Updated for V14 chemistry and R10.4.1 flow cells.', author: 'ONT Applications' }]
  },
  {
    id: 'thermo-colibri-a38637024',
    documentId: 'SOP-TF-A38637024',
    version: '2.0',
    effectiveDate: '2026-01-30',
    title: 'Thermo Scientific Colibri PS DNA Library Prep Kit Protocol',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Thermo Fisher Scientific Next Generation Sequencing',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Thermo Fisher',
      catalogNumber: 'A38637024 / A38637096',
      officialDocUrl: 'https://www.thermofisher.com/order/catalog/product/A38637024',
      storageConditions: '-20°C (Visual dye tracking)',
      kitIncludes: ['Colibri End Conversion Master Mix', 'Colibri Ligation Master Mix', 'Colibri Platinum SuperFi PCR Master Mix']
    },
    scope: 'Color-coded visual tracking library preparation for Illumina platforms from 1 ng to 1 µg input DNA.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Color-Coded Master Mixes', description: 'Includes inert tracking dyes.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermocycler', 'Magnetic Rack', 'Qubit Fluorometer'],
    reagentsRequired: ['Colibri PS DNA Kit (Cat #A38637024)', 'Colibri Unique Dual Indexes', 'Ampure XP Beads'],
    steps: [
      { stepNumber: 1, title: 'End Conversion', instruction: 'Mix 50 µL sheared DNA with 20 µL Colibri End Conversion Master Mix (mix turns blue). Incubate: 20°C 30 min, 65°C 30 min.', timingMinutes: 60, tempCelsius: 65 },
      { stepNumber: 2, title: 'Adaptor Ligation & PCR', instruction: 'Add 30 µL Ligation Mix (turns yellow) and 10 µL Index. Incubate 20°C 15 min. Clean with beads, amplify with Platinum SuperFi PCR Mix (turns green).', timingMinutes: 50, tempCelsius: 20 }
    ],
    qualityControl: ['Visual color change confirms proper reagent mixing at each protocol stage.'],
    troubleshooting: [{ issue: 'Incomplete color transition', cause: 'Omission of reagent component', solution: 'Ensure full volume added until liquid turns uniform blue/yellow/green.' }],
    references: [{ citation: 'Thermo Fisher. (2025). Colibri PS DNA Library Prep Kit User Guide (MAN0018311).', doiOrUrl: 'https://www.thermofisher.com' }],
    revisionHistory: [{ version: '2.0', date: '2026-01-30', changes: 'Updated for automated liquid handling workstations.', author: 'Thermo Fisher QA' }]
  },

  // --- SINGLE CELL, CRISPR, DIAGNOSTICS & PURIFICATION KITS ---
  {
    id: '10x-chromium-single-cell-3prime-v31-1000268',
    documentId: 'SOP-10X-1000268',
    version: '4.1',
    effectiveDate: '2026-02-14',
    title: '10x Genomics Chromium Next GEM Single Cell 3\' Reagent Kit v3.1 Protocol',
    category: 'NGS & Single Cell Sequencing',
    author: '10x Genomics Field Applications Group',
    reviewer: 'Dr. K. Vance, Lead Single-Cell Specialist',
    companyKitInfo: {
      vendor: '10x Genomics',
      catalogNumber: '1000268 / 1000269',
      officialDocUrl: 'https://www.10xgenomics.com/products/single-cell-gene-expression',
      storageConditions: '-20°C / -80°C (Master Mixes & Microfluidic Chips)',
      kitIncludes: ['Chromium Next GEM Single Cell 3\' Gel Beads v3.1', 'Chromium Next GEM Chip G / K', 'Partitioning Oil', 'Master Mix & RT Reagent Mix', 'Amp Mix & Dual Index Kit TT Set A']
    },
    scope: 'Single-cell encapsulation, RT barcode labeling, cDNA amplification, and 3\' gene expression library construction for up to 10,000 cells per channel on Chromium Controller / X.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Partitioning Oil & Surfactants', description: 'Fluorinated hydrocarbon emulsion oil. Avoid eye contact.' },
      { type: 'BIOHAZARD', label: 'Single Cell Suspensions', description: 'Handle primary human/mouse cell suspensions under appropriate biological safety level.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true, notes: 'RNase-free certified.' },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Glasses', required: true }
    ],
    equipmentRequired: [
      '10x Genomics Chromium Controller or Chromium X System',
      'Microplate Thermal Cycler with Heated Lid (≥100°C)',
      '10x Magnetic Separator (Cat #120250)',
      'Automated Cell Counter (Countess III FL) & Cell Viability Stains (AO/PI)',
      'Fluorometer (Qubit 4) & TapeStation 4200 (High Sensitivity D5000 / D1000)'
    ],
    reagentsRequired: [
      'Chromium Next GEM Single Cell 3\' Reagent Kit v3.1 (Cat #1000268)',
      'Chromium Single Cell 3\' Feature Barcode Kit',
      'SPRIselect Magnetic Beads (Beckman Coulter B23318)',
      'Freshly prepared 80% Ethanol',
      'Nuclease-Free Water & 0.04% BSA in PBS'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Cell Preparation & Suspension QC',
        instruction: 'Prepare single-cell suspension in PBS + 0.04% BSA. Count cells on Countess III using AO/PI dye. Target viability >85%. Dilute suspension to target 700–1,200 cells/µL for desired recovery of 5,000–10,000 cells.',
        timingMinutes: 30,
        tempCelsius: 4,
        criticalCheckpoint: 'Cell viability must exceed 80% to prevent high background ambient RNA contamination.'
      },
      {
        stepNumber: 2,
        title: 'GEM Generation & Barcoded Reverse Transcription',
        instruction: 'Combine cell suspension, RT Master Mix, and Nuclease-Free Water (75 µL total). Load Master Mix/Cell suspension into Row 1 of Chromium Next GEM Chip G. Load Gel Beads into Row 2 and Partitioning Oil into Row 3. Run Chromium Controller (18 min). Transfer GEMs to 0.2 mL tubes and run RT program: 53°C 45 min, 85°C 5 min, Hold 4°C.',
        timingMinutes: 70,
        tempCelsius: 53
      },
      {
        stepNumber: 3,
        title: 'GEM Demulsification & cDNA Amplification',
        instruction: 'Add Recovery Agent to break GEM emulsions. Isolate barcode-labeled cDNA using SPRIselect beads. Perform 11–13 cycles of cDNA PCR amplification using Amp Mix and Primers. Clean with 0.6X SPRIselect beads and quantify cDNA yield on TapeStation HS D5000.',
        timingMinutes: 75,
        tempCelsius: 98
      },
      {
        stepNumber: 4,
        title: 'cDNA Fragmentation, End Repair, Adaptor Ligation & Indexing',
        instruction: 'Fragment 100–500 ng purified cDNA at 32°C for 5 min, followed by End Repair/A-tailing (65°C 30 min). Ligate Adaptors @ 20°C for 15 min. Amplify library with Dual Index Kit TT (10–14 cycles). Purify with double-sided 0.6X/0.8X SPRIselect beads. Final library peak ~400–500 bp.',
        timingMinutes: 90,
        tempCelsius: 32
      }
    ],
    qualityControl: [
      'Confirm average cDNA fragment size ~1,000–2,000 bp on TapeStation HS D5000 prior to fragmentation.',
      'Final sequencing library must exhibit peak ~450 bp with no residual adaptor dimers (<150 bp).'
    ],
    troubleshooting: [
      { issue: 'GEM clogging / pressure warning', cause: 'Cell clumping or debris in microfluidic channel', solution: 'Filter single-cell suspension through 30 µm Miltenyi cell strainer prior to chip loading.' },
      { issue: 'High ambient RNA / doublets', cause: 'Overloading cell density or high initial dead cell percentage', solution: 'Perform dead cell removal (MACS) or lower target cell input to 5,000 cells.' }
    ],
    references: [
      { citation: '10x Genomics. (2025). Chromium Next GEM Single Cell 3\' Reagents v3.1 User Guide (CG000204 Rev D). 10x Genomics Inc.', doiOrUrl: 'https://www.10xgenomics.com' }
    ],
    reactionSheet: {
      id: 'rxn-10x-sc-rt',
      title: '10x Genomics Single-Cell Reverse Transcription Master Mix',
      assayType: 'Single-Cell Microfluidics RT',
      reactionVolumeMicroliters: 75,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'RT Master Mix v3.1', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 18.8, pipettingOrder: 1, storageTemp: '-20°C' },
        { id: 'c2', name: 'RT Reagent B', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 8.3, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Cell Suspension in PBS/BSA', stockConc: 1000, stockUnit: 'cells/µL', finalConc: 100, finalUnit: 'cells/µL', volPerRxnMicroliters: 31.8, pipettingOrder: 3, storageTemp: '4°C' },
        { id: 'c4', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 16.1, pipettingOrder: 4, storageTemp: '20°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Reverse Transcription', tempCelsius: 53, durationSeconds: 2700, cycles: 1 },
        { stepNumber: 2, phase: 'RT Inactivation', tempCelsius: 85, durationSeconds: 300, cycles: 1 },
        { stepNumber: 3, phase: 'Hold', tempCelsius: 4, durationSeconds: 3600 }
      ]
    },
    revisionHistory: [
      { version: '4.1', date: '2026-02-14', changes: 'Updated for Dual Index TT Set A and Chromium X chip compatibility.', author: '10x Genomics QA' }
    ]
  },
  {
    id: 'zymo-directzol-rna-r2050',
    documentId: 'SOP-ZYMO-R2050',
    version: '3.0',
    effectiveDate: '2026-01-22',
    title: 'Zymo Research Direct-zol RNA Miniprep Kit SOP (No Phase Separation)',
    category: 'RNA & Epigenomics Purification',
    author: 'Zymo Research Technical Support',
    reviewer: 'Dr. E. Rossi',
    companyKitInfo: {
      vendor: 'Zymo Research',
      catalogNumber: 'R2050 / R2052',
      officialDocUrl: 'https://www.zymoresearch.com/products/direct-zol-rna-miniprep',
      storageConditions: '15°C to 25°C (DNase I at -20°C)',
      kitIncludes: ['TRI Reagent', 'Direct-zol RNA Wash Buffer', 'RNA Prep Buffer', 'DNase I & Digest Buffer', 'Zymo-Spin IIC Columns']
    },
    scope: 'Direct column purification of total RNA (including miRNA) from samples in TRIzol / TRI Reagent without chloroform phase separation or alcohol precipitation.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'TRI Reagent / Phenol-Guanidinium', description: 'Causes severe skin burns and eye damage. Toxic if swallowed or inhaled. Handle in fume hood.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Goggles', required: true, notes: 'Chemical splash protection.' }
    ],
    equipmentRequired: ['Fume Hood', 'Microcentrifuge (16,000 x g)', 'Vortexer'],
    reagentsRequired: ['Direct-zol RNA Miniprep Kit (Cat #R2050)', '100% Ethanol', 'TRI Reagent or TRIzol'],
    steps: [
      { stepNumber: 1, title: 'Sample Lysis in TRI Reagent', instruction: 'Lyse cell pellet (up to 10^7 cells) or tissue (up to 50 mg) in 600 µL TRI Reagent. Vortex vigorously for 30 sec.', timingMinutes: 10 },
      { stepNumber: 2, title: 'Ethanol Binding Addition', instruction: 'Add an equal volume (600 µL) of 100% Ethanol directly to TRI Reagent lysate. Mix thoroughly by vortexing. Do NOT perform chloroform addition or centrifugations.', timingMinutes: 5, criticalCheckpoint: 'Add 100% ethanol directly without phase separation.' },
      { stepNumber: 3, title: 'Column Binding & On-Column DNase I Digest', instruction: 'Load mixture onto Zymo-Spin IIC Column, centrifuge 30s @ 12,000 x g. Wash with 400 µL Direct-zol RNA PreWash. Add 80 µL DNase I cocktail (5 µL DNase I + 75 µL Digest Buffer) directly to column matrix. Incubate @ room temp for 15 min.', timingMinutes: 20, tempCelsius: 22 },
      { stepNumber: 4, title: 'Washes & RNA Elution', instruction: 'Wash with 400 µL RNA PreWash, then wash twice with 700 µL Direct-zol RNA Wash Buffer. Spin empty column 2 min @ max speed. Elute in 50 µL DNase/RNase-Free Water.', timingMinutes: 15 }
    ],
    qualityControl: ['A260/A280 = 1.9–2.1; A260/A230 > 2.0; RNA Integrity Number (RIN) > 8.5.'],
    troubleshooting: [{ issue: 'Low A260/A230 ratio (<1.5)', cause: 'Phenol carryover from insufficient wash', solution: 'Perform second RNA PreWash step with centrifugations @ 16,000 x g.' }],
    references: [{ citation: 'Zymo Research. (2025). Direct-zol RNA Miniprep Protocol Manual (Ver 1.4.2).', doiOrUrl: 'https://www.zymoresearch.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-01-22', changes: 'Standardized 15-minute on-column DNase I digestion.', author: 'Zymo QA' }]
  },
  {
    id: 'neb-engen-cas12a-m0653',
    documentId: 'SOP-NEB-M0653',
    version: '2.1',
    effectiveDate: '2026-02-05',
    title: 'NEB EnGen Lba Cas12a (Cpf1) Target Cleavage & sgRNA Synthesis SOP',
    category: 'CRISPR & Genome Editing',
    author: 'New England Biolabs (NEB) Genome Editing Group',
    reviewer: 'Dr. D. Patel',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'M0653T / M0653M',
      officialDocUrl: 'https://www.neb.com/en/products/m0653-engen-lba-cas12a-cpf1',
      storageConditions: '-20°C',
      kitIncludes: ['EnGen Lba Cas12a', 'NEBuffer r2.1 (10X)', 'EnGen sgRNA Synthesis Kit components']
    },
    scope: 'In vitro target DNA cleavage assay and diagnostic diagnostic nucleic acid detection using Lch1/Lba Cas12a endonuclease with TTTN PAM requirement.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'NEBuffer r2.1', description: 'Enzyme buffer salt solution.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermocycler or Heating Block (37°C)', 'Agarose Gel Electrophoresis System'],
    reagentsRequired: ['EnGen Lba Cas12a (Cat #M0653)', 'Target dsDNA fragment', 'Cas12a gRNA (crRNA with 5\' handle)'],
    steps: [
      { stepNumber: 1, title: 'Cas12a RNP Complex Formation', instruction: 'In 0.2 mL PCR tube, combine 3 µL 10X NEBuffer r2.1, 100 nM Cas12a gRNA, and 100 nM EnGen Lba Cas12a in 27 µL Nuclease-Free Water. Incubate @ 25°C for 10 min to assemble RNP ribonucleoprotein.', timingMinutes: 10, tempCelsius: 25 },
      { stepNumber: 2, title: 'Target dsDNA Cleavage', instruction: 'Add 3 µL target substrate DNA (30 nM final concentration) to 27 µL Cas12a RNP mix (30 µL total). Incubate @ 37°C for 30 min.', timingMinutes: 30, tempCelsius: 37 },
      { stepNumber: 3, title: 'Reaction Termination & Gel Analysis', instruction: 'Add 1 µL Proteinase K (20 mg/mL) and incubate @ 56°C for 10 min to release bound DNA. Resolve cleavage products on 1.5% Agarose/TAE gel with ethidium bromide.', timingMinutes: 20, tempCelsius: 56 }
    ],
    qualityControl: ['Complete 5\' staggered end cleavage verified on agarose gel (100% conversion of full length to 2 predicted bands).'],
    troubleshooting: [{ issue: 'Incomplete target cleavage', cause: 'Mismatched PAM sequence (requires 5\'-TTTN-3\') or gRNA secondary structure', solution: 'Verify target site has TTTN PAM on non-target strand; denature gRNA at 65°C for 5 min before RNP assembly.' }],
    references: [{ citation: 'New England Biolabs. (2025). EnGen Lba Cas12a (Cpf1) Cleavage Assay Protocol.', doiOrUrl: 'https://www.neb.com' }],
    revisionHistory: [{ version: '2.1', date: '2026-02-05', changes: 'Added Proteinase K denaturation step for crisp band migration.', author: 'NEB Editing Group' }]
  },
  {
    id: 'biorad-itaq-sybr-1725151',
    documentId: 'SOP-BIORAD-1725151',
    version: '3.2',
    effectiveDate: '2026-01-18',
    title: 'Bio-Rad iTaq Universal SYBR Green One-Step RT-qPCR Master Mix SOP',
    category: 'Reverse Transcription & qPCR',
    author: 'Bio-Rad Gene Expression Technical Applications',
    reviewer: 'Dr. L. Zhang',
    companyKitInfo: {
      vendor: 'Bio-Rad',
      catalogNumber: '1725151 / 1725150',
      officialDocUrl: 'https://www.bio-rad.com/en-us/product/itaq-universal-sybr-green-one-step-kit',
      storageConditions: '-20°C (Protect from light)',
      kitIncludes: ['iTaq Universal SYBR Green One-Step Reaction Mix (2X)', 'iScript Reverse Transcriptase']
    },
    scope: 'Single-tube cDNA synthesis and real-time quantitative PCR quantification from total RNA (100 pg to 100 ng) with SYBR Green I fluorescent detection.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'SYBR Green I Dye', description: 'Fluorophore light-sensitive reagent.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Real-Time PCR Detection System (Bio-Rad CFX96 / Touch)', 'Optical 96-Well Reaction Plates & Sealing Film'],
    reagentsRequired: ['iTaq One-Step Kit (Cat #1725151)', 'Gene-Specific Forward & Reverse Primers (10 µM)', 'RNA Template'],
    steps: [
      { stepNumber: 1, title: 'Reaction Master Mix Assembly', instruction: 'Thaw 2X iTaq Mix on ice. Prepare master mix per rxn: 10 µL 2X iTaq Mix, 0.5 µL iScript RT, 0.6 µL Forward Primer (300 nM), 0.6 µL Reverse Primer (300 nM), and water up to 18 µL. Dispense 18 µL to optical plate.', timingMinutes: 20 },
      { stepNumber: 2, title: 'RNA Addition & Real-Time Thermocycling', instruction: 'Add 2 µL RNA template (10 pg–100 ng). Seal plate securely and centrifuge 1 min @ 1,000 x g. Run CFX96 program: Reverse Transcription @ 50°C 10 min; Polymerase Activation @ 95°C 1 min; 40 cycles [95°C 10s, 60°C 30s with fluorescence collection]; Melt Curve 65°C to 95°C (0.5°C increments).', timingMinutes: 70, tempCelsius: 50 }
    ],
    qualityControl: ['Reaction efficiency = 90–110%; single melt curve peak confirming specific amplicon without primer-dimers.'],
    troubleshooting: [{ issue: 'Late Cq or low amplification yield', cause: 'Degraded RNA or presence of RT inhibitors (isopropanol, ethanol)', solution: 'Perform 1:10 sample dilution test or repurify RNA on Zymo Direct-zol column.' }],
    references: [{ citation: 'Bio-Rad Laboratories. (2025). iTaq Universal SYBR Green One-Step Kit Manual (10000036329).', doiOrUrl: 'https://www.bio-rad.com' }],
    reactionSheet: {
      id: 'rxn-itaq-sybr-onestep',
      title: 'Bio-Rad iTaq One-Step RT-qPCR Setup (20 µL)',
      assayType: 'One-Step RT-qPCR',
      reactionVolumeMicroliters: 20,
      defaultNumReactions: 24,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'iTaq Universal SYBR Green Mix (2X)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 10.0, pipettingOrder: 1, storageTemp: '-20°C' },
        { id: 'c2', name: 'iScript Reverse Transcriptase', stockConc: 40, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 0.5, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Forward Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.3, finalUnit: 'µM', volPerRxnMicroliters: 0.6, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Reverse Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.3, finalUnit: 'µM', volPerRxnMicroliters: 0.6, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 6.3, pipettingOrder: 5, storageTemp: '20°C' },
        { id: 'c6', name: 'Target RNA Sample', stockConc: 10, stockUnit: 'ng/µL', finalConc: 1, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 6, storageTemp: '-80°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Reverse Transcription', tempCelsius: 50, durationSeconds: 600, cycles: 1 },
        { stepNumber: 2, phase: 'Initial Denaturation', tempCelsius: 95, durationSeconds: 60, cycles: 1 },
        { stepNumber: 3, phase: 'Denaturation', tempCelsius: 95, durationSeconds: 10, cycles: 40 },
        { stepNumber: 4, phase: 'Annealing & Extension + Read', tempCelsius: 60, durationSeconds: 30, cycles: 40 },
        { stepNumber: 5, phase: 'Melt Curve Analysis', tempCelsius: 95, durationSeconds: 10, cycles: 1 }
      ]
    },
    revisionHistory: [{ version: '3.2', date: '2026-01-18', changes: 'Standardized 10-minute RT hold for high-throughput diagnostic runs.', author: 'Bio-Rad QA' }]
  },
  {
    id: 'agilent-sureselect-g9981a',
    documentId: 'SOP-AGILENT-G9981A',
    version: '3.0',
    effectiveDate: '2026-02-03',
    title: 'Agilent SureSelect XT HS2 Target Enrichment System for NGS SOP',
    category: 'NGS & Single Cell Sequencing',
    author: 'Agilent Technologies Genomics Group',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Agilent',
      catalogNumber: 'G9981A / G9982A',
      officialDocUrl: 'https://www.agilent.com/en/product/next-generation-sequencing/target-enrichment/dna-target-enrichment/sureselect-xt-hs2-target-enrichment-system',
      storageConditions: '-20°C / -80°C (RNA Baits)',
      kitIncludes: ['SureSelect XT HS2 Enzymatic Fragmentation Kit', 'SureSelect Target Enrichment Hybridization Buffer', 'Streptavidin BioMag Beads', 'SureSelect XT HS2 Index Primer Pairs']
    },
    scope: 'Hybridization capture exome and custom panel targeted enrichment with Molecular Barcodes (UMIs) for somatic mutation detection down to 1% allele frequency.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Hybridization Buffers', description: 'Contains formamide and detergents.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['96-Well Thermal Cycler', 'Magnetic Separator', 'TapeStation 4200'],
    reagentsRequired: ['Agilent SureSelect XT HS2 Kit (Cat #G9981A)', 'SureSelect RNA Bait Panel', 'AMPure XP Beads'],
    steps: [
      { stepNumber: 1, title: 'Library Preparation with UMI Ligation', instruction: 'Fragment 10–100 ng gDNA enzymatically @ 37°C for 15 min. Perform End Repair/A-Tailing (65°C 30 min). Ligate SureSelect XT HS2 UMI Adaptors @ 20°C for 15 min. Purify with AMPure beads.', timingMinutes: 65, tempCelsius: 37 },
      { stepNumber: 2, title: 'Bait Hybridization & Streptavidin Capture', instruction: 'Combine 500 ng prepared library with SureSelect RNA Baits and Hybridization Buffer. Hybridize in thermocycler @ 65°C for 16 hours. Capture biotinylated bait-target hybrids using Dynabeads MyOne Streptavidin T1 beads.', timingMinutes: 980, tempCelsius: 65 },
      { stepNumber: 3, title: 'Post-Capture PCR Amplification', instruction: 'Amplify target-captured library with Dual Index Primers (10–12 cycles). Clean with 0.8X AMPure beads. Quantify on TapeStation D1000 ScreenTape (peak ~300–450 bp).', timingMinutes: 60, tempCelsius: 98 }
    ],
    qualityControl: ['Target fold coverage >100X with >85% on-target reads.'],
    troubleshooting: [{ issue: 'High off-target rate', cause: 'Incomplete washing of Streptavidin beads or evaporation during 16-hour hybridization', solution: 'Ensure thermal cycler lid is heated to 105°C and complete all 4 strict wash buffer steps at 65°C.' }],
    references: [{ citation: 'Agilent Technologies. (2025). SureSelect XT HS2 Target Enrichment Protocol Manual (PR7000-0960).', doiOrUrl: 'https://www.agilent.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-02-03', changes: 'Updated for 1.5-hour fast hybridization option.', author: 'Agilent Genomics' }]
  },
  {
    id: 'promega-wizard-sv-a9281',
    documentId: 'SOP-PROMEGA-A9281',
    version: '4.0',
    effectiveDate: '2026-01-10',
    title: 'Promega Wizard SV Gel and PCR Clean-Up System Protocol',
    category: 'DNA Cleanup & Gel Extraction',
    author: 'Promega Technical Services',
    reviewer: 'Dr. M. Vance',
    companyKitInfo: {
      vendor: 'Promega',
      catalogNumber: 'A9281 / A9282',
      officialDocUrl: 'https://www.promega.com/products/nucleic-acid-extraction/pcr-clean-up-and-gel-extraction/wizard-sv-gel-and-pcr-clean-up-system',
      storageConditions: '15°C to 25°C',
      kitIncludes: ['Membrane Binding Solution', 'Membrane Wash Solution (concentrate)', 'Nuclease-Free Water', 'Wizard SV Minicolumns']
    },
    scope: 'Silica spin-column recovery of 100 bp to 10 kb DNA fragments from agarose gels or direct PCR amplification products with up to 95% recovery.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'TOXIC', label: 'Membrane Binding Solution', description: 'Contains guanidine isothiocyanate chaotic salt. Wear gloves.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Water Bath / Heat Block (55°C)', 'Microcentrifuge (16,000 x g)', 'UV/Blue-Light Transilluminator'],
    reagentsRequired: ['Wizard SV Kit (Cat #A9281)', '95% Ethanol (added to Wash Solution)', 'Agarose Gel Slab / PCR Reaction'],
    steps: [
      { stepNumber: 1, title: 'Gel Solubilization / PCR Binding', instruction: 'Excise DNA band from agarose gel. Add 10 µL Membrane Binding Solution per 10 mg gel slice (1:1 ratio for PCR reactions). Incubate @ 55–65°C for 7–10 min until gel is completely dissolved.', timingMinutes: 10, tempCelsius: 55 },
      { stepNumber: 2, title: 'Column Binding & Washing', instruction: 'Transfer dissolved gel mixture to SV Minicolumn in collection tube. Centrifuge @ 16,000 x g for 1 min. Discard flowthrough. Wash with 700 µL Membrane Wash Solution (containing ethanol), spin 1 min. Wash with 500 µL Wash Solution, spin 5 min at max speed to dry matrix.', timingMinutes: 10 },
      { stepNumber: 3, title: 'DNA Elution', instruction: 'Transfer column to clean 1.5 mL tube. Add 50 µL Nuclease-Free Water directly to matrix center. Incubate @ room temp for 1 min, then centrifuge @ 16,000 x g for 1 min to elute purified DNA.', timingMinutes: 5 }
    ],
    qualityControl: ['A260/A280 = 1.8–1.9; recovery yield >80% as assessed on Nanodrop or Qubit.'],
    troubleshooting: [{ issue: 'Incomplete gel dissolution', cause: 'Incubation temperature below 55°C or gel slice >300 mg', solution: 'Vortex gel slice every 2 min during 55°C incubation; cut large gel slices into smaller pieces.' }],
    references: [{ citation: 'Promega Corporation. (2025). Wizard SV Gel and PCR Clean-Up System Technical Bulletin (TB308).', doiOrUrl: 'https://www.promega.com' }],
    revisionHistory: [{ version: '4.0', date: '2026-01-10', changes: 'Standardized 5-minute dry spin to eliminate ethanol carryover.', author: 'Promega QA' }]
  },
  {
    id: 'beckman-ampure-xp-a63881',
    documentId: 'SOP-BECKMAN-A63881',
    version: '5.0',
    effectiveDate: '2026-02-12',
    title: 'Beckman Coulter AMPure XP Solid-Phase Reversible Immobilization (SPRI) SOP',
    category: 'DNA Cleanup & Gel Extraction',
    author: 'Beckman Coulter Life Sciences Genomics Application Specialist',
    reviewer: 'Dr. A. Sharma',
    companyKitInfo: {
      vendor: 'Beckman Coulter',
      catalogNumber: 'A63880 / A63881',
      officialDocUrl: 'https://www.mybeckman.com/reagents/genomics/cleanup-and-size-selection/pcr/ampure-xp',
      storageConditions: '2°C to 8°C (Do NOT freeze)',
      kitIncludes: ['AMPure XP Magnetic Bead Suspension (Paramagnetic polymer particles in PEG 8000 / NaCl)']
    },
    scope: 'High-throughput enzymatic cleanup, primer-dimer removal, and size-selective DNA purification for PCR products, NGS libraries, and restriction fragments.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'FLAMMABLE', label: '80% Fresh Ethanol Wash', description: 'Requires freshly prepared 80% Ethanol for washing steps.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['96-Well Magnetic Separation Stand', 'Microplate Vortexer / Shaker'],
    reagentsRequired: ['AMPure XP Beads (Cat #A63881)', 'Freshly prepared 80% Ethanol', '10 mM Tris-HCl pH 8.0 or Nuclease-Free Water'],
    steps: [
      { stepNumber: 1, title: 'Bead Equilibration & Addition', instruction: 'Equilibrate AMPure XP beads at room temperature for 30 min. Vortex vigorously. Add calculated ratio of beads to DNA solution (e.g. 1.8X ratio: add 90 µL beads to 50 µL PCR product for all fragments >100 bp). Mix by pipetting 10 times.', timingMinutes: 35, criticalCheckpoint: 'Equilibrate beads to room temperature before pipetting.' },
      { stepNumber: 2, title: 'Binding & Magnetic Separation', instruction: 'Incubate room temperature for 5 min to bind DNA to beads. Place tube on magnetic rack for 3–5 min until liquid is crystal clear. Discard supernatant without disturbing bead pellet.', timingMinutes: 10 },
      { stepNumber: 3, title: 'Ethanol Wash & Drying', instruction: 'With tube on magnet, add 200 µL fresh 80% Ethanol. Incubate 30 sec, aspirate ethanol. Repeat wash once. Air dry bead pellet at room temperature for 2–3 min (do NOT over-dry until beads crack).', timingMinutes: 6 },
      { stepNumber: 4, title: 'DNA Elution', instruction: 'Remove tube from magnet. Add 40 µL 10 mM Tris-HCl pH 8.0. Pipette mix 10 times to resuspend beads. Incubate 2 min. Place on magnetic rack for 2 min. Transfer clear supernatant containing purified DNA.', timingMinutes: 6 }
    ],
    qualityControl: ['Complete primer-dimer removal (<100 bp) with >90% recovery of target amplicons.'],
    troubleshooting: [{ issue: 'Low recovery yield', cause: 'Over-drying bead pellet (cracked beads) or incomplete bead resuspension in elution buffer', solution: 'Limit air drying to 2–3 min until dull matte appearance; ensure full resuspension during elution.' }],
    references: [{ citation: 'Beckman Coulter. (2025). AMPure XP Instructions for Use (B37777AF). Beckman Coulter Inc.', doiOrUrl: 'https://www.mybeckman.com' }],
    revisionHistory: [{ version: '5.0', date: '2026-02-12', changes: 'Standardized 1.8X (standard cleanup) and 0.6X–0.8X (double-sided size selection) volumetric ratio guidelines.', author: 'Beckman Applications' }]
  },
  {
    id: 'qiagen-qiaprep-spin-27106',
    documentId: 'SOP-QIAGEN-27106',
    version: '4.2',
    effectiveDate: '2026-01-25',
    title: 'QIAGEN QIAprep Spin Miniprep Kit Plasmid DNA Isolation SOP',
    category: 'Plasmid Isolation & Purification',
    author: 'QIAGEN Technical Services',
    reviewer: 'Dr. H. Weber',
    companyKitInfo: {
      vendor: 'QIAGEN',
      catalogNumber: '27104 / 27106',
      officialDocUrl: 'https://www.qiagen.com/us/products/discovery-and-translational-research/dna-rna-purification/dna-purification/plasmid-dna/qiaprep-spin-miniprep-kit',
      storageConditions: '15°C to 25°C (RNase A added to Buffer P1 at 4°C)',
      kitIncludes: ['Buffer P1 (Resuspension)', 'Buffer P2 (Lysis)', 'Buffer N3 (Neutralization)', 'Buffer PB (Binding/Wash)', 'Buffer PE (Wash)', 'Buffer EB (Elution)', 'QIAprep Spin Columns']
    },
    scope: 'Alkaline lysis spin-column isolation of up to 20 µg high-copy plasmid DNA from 1–5 mL E. coli bacterial cultures.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Buffer P2 (Alkaline Lysis)', description: 'Contains NaOH and SDS. Causes skin and eye irritation.' },
      { type: 'TOXIC', label: 'Buffer N3 / PB', description: 'Contains guanidine hydrochloride. Wear gloves and eye protection.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Microcentrifuge (17,900 x g)', 'Vortexer'],
    reagentsRequired: ['QIAprep Spin Miniprep Kit (Cat #27106)', '100% Ethanol (added to Buffer PE)', 'Overnight E. coli Culture in LB Medium'],
    steps: [
      { stepNumber: 1, title: 'Bacterial Harvest & Alkaline Lysis', instruction: 'Pellet 1.5–5 mL E. coli overnight culture @ 6,800 x g for 3 min. Resuspend pellet completely in 250 µL Buffer P1 (with RNase A). Add 250 µL Buffer P2 and mix gently by inverting tube 4–6 times until solution is clear and viscous. Do NOT vortex.', timingMinutes: 8, criticalCheckpoint: 'Invert gently 4-6 times during Buffer P2 addition; do not vortex to avoid genomic DNA shearing.' },
      { stepNumber: 2, title: 'Neutralization & Genomic DNA Precipitation', instruction: 'Add 350 µL Buffer N3 immediately. Invert tube 4–6 times until solution becomes cloudy and fluffy white precipitate forms. Centrifuge @ 17,900 x g for 10 min.', timingMinutes: 12 },
      { stepNumber: 3, title: 'Column Binding & Washes', instruction: 'Apply supernatant to QIAprep Spin Column. Spin 60s @ 17,900 x g. Wash with 500 µL Buffer PB (for endA+ strains). Wash with 750 µL Buffer PE. Spin empty column 1 min to dry membrane.', timingMinutes: 8 },
      { stepNumber: 4, title: 'Plasmid DNA Elution', instruction: 'Transfer column to 1.5 mL tube. Add 50 µL Buffer EB (10 mM Tris-HCl, pH 8.5) to matrix center. Incubate 1 min, spin 1 min to elute plasmid DNA.', timingMinutes: 5 }
    ],
    qualityControl: ['A260/A280 = 1.85–1.90; A260/A230 > 2.0; single supercoiled plasmid band on agarose gel.'],
    troubleshooting: [{ issue: 'Genomic DNA contamination', cause: 'Vaporous vortexing during alkaline lysis step', solution: 'Mix Buffer P2 and Buffer N3 solely by gentle tube inversion.' }],
    references: [{ citation: 'QIAGEN. (2025). QIAprep Miniprep Handbook (5th Edition). QIAGEN Group.', doiOrUrl: 'https://www.qiagen.com' }],
    revisionHistory: [{ version: '4.2', date: '2026-01-25', changes: 'Updated for optional lysozyme pretreatment for Gram-positive hosts.', author: 'QIAGEN QA' }]
  },

  // --- ADDITIONAL COMMERCIAL KITS ---
  {
    id: 'thermo-high-capacity-cdna-4368814',
    documentId: 'SOP-TF-4368814',
    version: '4.0',
    effectiveDate: '2026-02-10',
    title: 'Applied Biosystems High-Capacity cDNA Reverse Transcription Kit SOP',
    category: 'Reverse Transcription & qPCR',
    author: 'Thermo Fisher Scientific Applied Biosystems Division',
    reviewer: 'Dr. L. Zhang',
    companyKitInfo: {
      vendor: 'Thermo Fisher',
      catalogNumber: '4368814 / 4368813',
      officialDocUrl: 'https://www.thermofisher.com/order/catalog/product/4368814',
      storageConditions: '-20°C',
      kitIncludes: ['10X RT Buffer', '10X RT Random Primers', '25X dNTP Mix (100 mM)', 'MultiScribe Reverse Transcriptase (50 U/µL)', 'RNase Inhibitor']
    },
    scope: 'Quantitative reverse transcription of up to 2 µg total RNA into single-stranded cDNA for TaqMan and SYBR Green real-time PCR applications.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: '10X RT Random Primers', description: 'Synthetic oligonucleotide mixture.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermal Cycler', 'Microcentrifuge', 'Ice Benchtop Cooler'],
    reagentsRequired: ['High-Capacity cDNA Kit (Cat #4368814)', 'Nuclease-Free Water', 'Purified RNA Template'],
    steps: [
      { stepNumber: 1, title: '2X RT Master Mix Preparation', instruction: 'Prepare 2X RT master mix on ice: 2.0 µL 10X RT Buffer, 0.8 µL 25X dNTP Mix (100 mM), 2.0 µL 10X RT Random Primers, 1.0 µL MultiScribe RT, 1.0 µL RNase Inhibitor, and 3.2 µL Nuclease-Free Water (10 µL total per reaction).', timingMinutes: 15 },
      { stepNumber: 2, title: 'Reaction Assembly & Thermal Cycling', instruction: 'Pipette 10 µL 2X RT Master Mix into PCR tube and add 10 µL RNA sample (up to 2 µg total RNA). Centrifuge briefly. Incubate in thermocycler: 25°C 10 min, 37°C 120 min, 85°C 5 min (RT inactivation), hold at 4°C.', timingMinutes: 135, tempCelsius: 37 }
    ],
    qualityControl: ['Full length cDNA synthesis confirmed by >95% amplification efficiency on TaqMan qPCR assay.'],
    troubleshooting: [{ issue: 'Inhibition of downstream qPCR', cause: 'Excess RNA input (>2 µg per 20 µL) carrying over contaminants', solution: 'Dilute cDNA product 1:5 or 1:10 with Nuclease-Free Water prior to qPCR loading.' }],
    references: [{ citation: 'Applied Biosystems. (2025). High-Capacity cDNA Reverse Transcription Kit Protocol (MAN0010834). Thermo Fisher Scientific.', doiOrUrl: 'https://www.thermofisher.com' }],
    reactionSheet: {
      id: 'rxn-tf-cdna-rt',
      title: 'Applied Biosystems High-Capacity cDNA RT Master Mix (20 µL)',
      assayType: 'Reverse Transcription',
      reactionVolumeMicroliters: 20,
      defaultNumReactions: 16,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: '10X RT Buffer', stockConc: 10, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 2.0, pipettingOrder: 1, storageTemp: '-20°C' },
        { id: 'c2', name: '25X dNTP Mix (100 mM)', stockConc: 25, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 0.8, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: '10X RT Random Primers', stockConc: 10, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 2.0, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'MultiScribe Reverse Transcriptase (50 U/µL)', stockConc: 50, stockUnit: 'U/µL', finalConc: 2.5, finalUnit: 'U/µL', volPerRxnMicroliters: 1.0, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'RNase Inhibitor', stockConc: 20, stockUnit: 'U/µL', finalConc: 1, finalUnit: 'U/µL', volPerRxnMicroliters: 1.0, pipettingOrder: 5, storageTemp: '-20°C' },
        { id: 'c6', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 3.2, pipettingOrder: 6, storageTemp: '20°C' },
        { id: 'c7', name: 'RNA Template (up to 2 µg)', stockConc: 1, stockUnit: 'µg/µL', finalConc: 0.1, finalUnit: 'µg/µL', volPerRxnMicroliters: 10.0, pipettingOrder: 7, storageTemp: '-80°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Primer Annealing', tempCelsius: 25, durationSeconds: 600, cycles: 1 },
        { stepNumber: 2, phase: 'Reverse Transcription', tempCelsius: 37, durationSeconds: 7200, cycles: 1 },
        { stepNumber: 3, phase: 'Enzyme Inactivation', tempCelsius: 85, durationSeconds: 300, cycles: 1 },
        { stepNumber: 4, phase: 'Hold', tempCelsius: 4, durationSeconds: 3600 }
      ]
    },
    revisionHistory: [{ version: '4.0', date: '2026-02-10', changes: 'Standardized 2-hour 37°C extension program.', author: 'Thermo Fisher QA' }]
  },
  {
    id: 'takara-smartseq-v4-634888',
    documentId: 'SOP-TAKARA-634888',
    version: '3.1',
    effectiveDate: '2026-01-14',
    title: 'Takara SMART-Seq v4 Ultra Low Input RNA Kit for Sequencing SOP',
    category: 'NGS & Single Cell Sequencing',
    author: 'Takara Bio USA Technical Applications',
    reviewer: 'Dr. K. Vance',
    companyKitInfo: {
      vendor: 'Takara',
      catalogNumber: '634888 / 634890',
      officialDocUrl: 'https://www.takarabio.com/products/next-generation-sequencing/rna-seq/ultra-low-input-rna/smart-seq-v4-ultra-low-input-rna-kit',
      storageConditions: '-20°C',
      kitIncludes: ['SMART-Seq v4 Oligo', '3\' SMART-Seq CDS Primer II A', 'SMARTScribe Reverse Transcriptase', 'SeqAmp DNA Polymerase', 'Elution Buffer']
    },
    scope: 'High-sensitivity full-length cDNA synthesis from 10 pg to 10 ng total RNA or 1–1,000 intact single cells utilizing SMART (Switching Mechanism at 5\' end of RNA Template) technology.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: '10X Lysis Buffer', description: 'Cellular detergent solution.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermal Cycler', 'Agilent TapeStation 4200 (HS D5000)', 'Magnetic Rack'],
    reagentsRequired: ['SMART-Seq v4 Kit (Cat #634888)', 'AMPure XP Beads', 'Fresh 80% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'Cell Lysis & Annealing', instruction: 'Add 1–10 µL cell suspension or diluted RNA (10 pg) to 9.5 µL Lysis Buffer containing 3\' CDS Primer II A and RNase Inhibitor. Incubate @ 72°C for 3 min to denature RNA.', timingMinutes: 10, tempCelsius: 72 },
      { stepNumber: 2, title: 'SMART Reverse Transcription', instruction: 'Add 7.5 µL RT Master Mix (containing SMARTScribe RT and SMART-Seq v4 Oligo). Incubate in thermocycler: 42°C for 90 min, 70°C for 10 min.', timingMinutes: 100, tempCelsius: 42 },
      { stepNumber: 3, title: 'cDNA Amplification with SeqAmp Polymerase', instruction: 'Add 30 µL PCR Master Mix containing SeqAmp Polymerase and PCR Primer II A. Thermocycle: 95°C 1 min; 17–20 cycles [98°C 10s, 65°C 30s, 68°C 3 min]; 72°C 10 min.', timingMinutes: 80, tempCelsius: 98 },
      { stepNumber: 4, title: 'Purification & TapeStation QC', instruction: 'Purify amplicon with 1.0X AMPure XP beads. Elute in 17 µL Elution Buffer. Quantify size distribution on HS D5000 ScreenTape (expect smooth electropherogram peak ~1.5–2.0 kb).', timingMinutes: 30 }
    ],
    qualityControl: ['Electropherogram demonstrates unfragmented, broad full-length cDNA distribution spanning 500 bp to 5,000 bp.'],
    troubleshooting: [{ issue: '3\' transcript bias or low yield', cause: 'Degraded initial RNA (RIN < 7.0)', solution: 'Ensure intact cell sorting directly into cold lysis buffer; use RNase inhibitor in all pre-RT steps.' }],
    references: [{ citation: 'Takara Bio. (2025). SMART-Seq v4 Ultra Low Input RNA Kit User Manual (011525). Takara Bio USA Inc.', doiOrUrl: 'https://www.takarabio.com' }],
    revisionHistory: [{ version: '3.1', date: '2026-01-14', changes: 'Optimized SeqAmp thermocycling conditions for 10 pg RNA inputs.', author: 'Takara Applications' }]
  },
  {
    id: 'qiagen-rneasy-mini-74104',
    documentId: 'SOP-QIAGEN-74104',
    version: '5.0',
    effectiveDate: '2026-02-01',
    title: 'QIAGEN RNeasy Mini Kit Total RNA Isolation Protocol',
    category: 'RNA & Epigenomics Purification',
    author: 'QIAGEN Technical Operations',
    reviewer: 'Dr. H. Weber',
    companyKitInfo: {
      vendor: 'QIAGEN',
      catalogNumber: '74104 / 74106',
      officialDocUrl: 'https://www.qiagen.com/us/products/discovery-and-translational-research/dna-rna-purification/rna-purification/total-rna/rneasy-mini-kit',
      storageConditions: '15°C to 25°C',
      kitIncludes: ['Buffer RLT (Lysis)', 'Buffer RW1 (Wash)', 'Buffer RPE (Wash Concentrate)', 'RNase-Free Water', 'RNeasy Mini Spin Columns']
    },
    scope: 'Silica-membrane spin-column isolation of total RNA (>200 nt) from up to 1x10^7 cells or 30 mg animal tissue.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'Buffer RLT', description: 'Contains guanidine thiocyanate. Do NOT mix with bleach.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Tissue Homogenizer (BioMasher or QIAshredder)', 'Microcentrifuge (16,000 x g)'],
    reagentsRequired: ['RNeasy Mini Kit (Cat #74104)', 'beta-Mercaptoethanol (bME)', '100% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'Sample Lysis & Homogenization', instruction: 'Disrupt tissue (30 mg) or cell pellet in 350 µL Buffer RLT containing 10 µL/mL bME. Homogenize lysate by passing through QIAshredder spin column @ max speed for 2 min.', timingMinutes: 10 },
      { stepNumber: 2, title: 'Ethanol Binding Addition', instruction: 'Add 1 volume (350 µL) of 70% Ethanol to homogenized lysate. Pipette mix thoroughly. Do NOT centrifuge.', timingMinutes: 3 },
      { stepNumber: 3, title: 'Column Binding & Washes', instruction: 'Transfer 700 µL sample to RNeasy Mini Column. Spin 15s @ 10,000 x g. Wash column with 700 µL Buffer RW1. Wash twice with 500 µL Buffer RPE (with ethanol added). Spin empty column 2 min @ max speed to dry matrix.', timingMinutes: 10 },
      { stepNumber: 4, title: 'RNA Elution', instruction: 'Transfer column to clean 1.5 mL collection tube. Add 40 µL RNase-Free Water directly to column membrane. Centrifuge @ 10,000 x g for 1 min to elute total RNA.', timingMinutes: 5 }
    ],
    qualityControl: ['A260/A280 ratio = 2.0; RIN > 8.5 evaluated on Agilent Bioanalyzer 2100.'],
    troubleshooting: [{ issue: 'Column clogging during spin', cause: 'Incomplete tissue homogenization or overloading >30 mg tissue', solution: 'Pass lysate through QIAshredder column or reduce tissue input to 15 mg.' }],
    references: [{ citation: 'QIAGEN. (2025). RNeasy Mini Handbook (Fourth Edition). QIAGEN Group.', doiOrUrl: 'https://www.qiagen.com' }],
    revisionHistory: [{ version: '5.0', date: '2026-02-01', changes: 'Updated for optional on-column DNase I Digest Set compatibility.', author: 'QIAGEN QA' }]
  },
  {
    id: 'neb-em-seq-e7120',
    documentId: 'SOP-NEB-E7120',
    version: '2.0',
    effectiveDate: '2026-02-08',
    title: 'NEBNext Enzymatic Methyl-seq (EM-seq) Kit for Illumina SOP',
    category: 'NGS & Single Cell Sequencing',
    author: 'New England Biolabs (NEB) Epigenetics Group',
    reviewer: 'Dr. A. Sharma',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'E7120S / E7120L',
      officialDocUrl: 'https://www.neb.com/en/products/e7120-nebnext-enzymatic-methyl-seq-kit',
      storageConditions: '-20°C',
      kitIncludes: ['T4-BGT & UDP-Glucose', 'TET2 Reaction Buffer & Enzyme', 'APOBEC Reaction Buffer & Enzyme', 'NEBNext Ultra II End Prep & Ligation Mix', 'NEBNext Q5U Master Mix']
    },
    scope: 'Bisulfite-free enzymatic conversion of cytosines for 5mC and 5hmC methylome sequencing with minimal DNA damage and high mapping efficiency.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'APOBEC Deaminase', description: 'Recombinant enzymatic conversion mix.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermal Cycler', 'Magnetic Rack', 'TapeStation 4200'],
    reagentsRequired: ['NEBNext EM-seq Kit (Cat #E7120)', 'NEBNext Multiplex Oligos for Enzymatic Methyl-seq', 'AMPure XP Beads'],
    steps: [
      { stepNumber: 1, title: 'Library Prep & Oxidation of 5mC/5hmC', instruction: 'End repair and ligate EM-seq adaptors to 10–200 ng gDNA. Protect 5mC and 5hmC by glucosylation using T4-BGT @ 37°C for 1 hr. Oxidize 5mC/5hmC using TET2 enzyme @ 37°C for 1 hr.', timingMinutes: 130, tempCelsius: 37 },
      { stepNumber: 2, title: 'APOBEC Deamination of Unmodified Cytosines', instruction: 'Incubate TET2-treated library with APOBEC cytidine deaminase @ 37°C for 3 hours. APOBEC converts unmethylated C to U while leaving protected 5mC/5hmC intact.', timingMinutes: 180, tempCelsius: 37 },
      { stepNumber: 3, title: 'Amplification with NEBNext Q5U', instruction: 'Amplify deaminated library using NEBNext Q5U Hot Start HiFi PCR Master Mix (contains modified Q5 polymerase that reads through uracil). Thermocycle 4–8 cycles. Purify with 0.9X AMPure beads.', timingMinutes: 45, tempCelsius: 98 }
    ],
    qualityControl: ['Non-CpG cytosine conversion rate >99.5% verified using unmethylated lambda DNA control spike-in.'],
    troubleshooting: [{ issue: 'Incomplete C-to-T conversion', cause: 'Incomplete TET2 glucosylation protection or oxidation reaction stall', solution: 'Ensure full 1-hour incubation for T4-BGT and TET2 steps; do not skip control CpG spike-ins.' }],
    references: [{ citation: 'New England Biolabs. (2025). NEBNext Enzymatic Methyl-seq Kit Instruction Manual (E7120). NEB.', doiOrUrl: 'https://www.neb.com' }],
    revisionHistory: [{ version: '2.0', date: '2026-02-08', changes: 'Optimized for low input 10 ng genomic DNA applications.', author: 'NEB Epigenetics' }]
  },
  {
    id: 'neb-monarch-gdna-t3010',
    documentId: 'SOP-NEB-T3010',
    version: '3.0',
    effectiveDate: '2026-01-20',
    title: 'NEB Monarch Genomic DNA Purification Kit Protocol',
    category: 'DNA Cleanup & Gel Extraction',
    author: 'New England Biolabs (NEB) Nucleic Acid Purification Group',
    reviewer: 'Dr. D. Patel',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'T3010S / T3010L',
      officialDocUrl: 'https://www.neb.com/en/products/t3010-monarch-genomic-dna-purification-kit',
      storageConditions: '15°C to 25°C (Proteinase K & RNase A at -20°C)',
      kitIncludes: ['gDNA Tissue Lysis Buffer', 'gDNA Blood Lysis Buffer', 'gDNA Binding Buffer', 'gDNA Wash Buffer', 'gDNA Elution Buffer', 'Proteinase K & RNase A', 'Monarch gDNA Spin Columns']
    },
    scope: 'High-yield isolation of high-molecular-weight genomic DNA (>50 kb) from whole blood, cultured cells, and animal tissues.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'TOXIC', label: 'gDNA Binding Buffer', description: 'Contains chaotropic salts.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermal Mixer / Heating Block (56°C)', 'Microcentrifuge (16,000 x g)'],
    reagentsRequired: ['Monarch gDNA Kit (Cat #T3010)', '100% Ethanol', 'Sample (Blood, Tissue, or Cells)'],
    steps: [
      { stepNumber: 1, title: 'Sample Lysis & Enzymatic Digestion', instruction: 'Digest 10–20 mg tissue in 200 µL Tissue Lysis Buffer + 10 µL Proteinase K @ 56°C for 30 min with thermal shaking (1,400 RPM). Add 3 µL RNase A, incubate @ 56°C for 5 min.', timingMinutes: 40, tempCelsius: 56 },
      { stepNumber: 2, title: 'Binding & Column Purification', instruction: 'Add 400 µL gDNA Binding Buffer, mix thoroughly. Transfer lysate to Monarch gDNA Spin Column. Centrifuge 1 min @ 1,000 x g (low speed preserves high-MW DNA), then 1 min @ 12,000 x g. Wash twice with 500 µL gDNA Wash Buffer.', timingMinutes: 10 },
      { stepNumber: 3, title: 'High-MW Elution', instruction: 'Transfer column to clean 1.5 mL tube. Add 50–100 µL pre-warmed (60°C) gDNA Elution Buffer directly to membrane center. Incubate 5 min, spin 1 min @ 12,000 x g to elute intact gDNA.', timingMinutes: 8, tempCelsius: 60 }
    ],
    qualityControl: ['A260/A280 = 1.8–1.9; Peak DNA size >50 kb on Femto Pulse or 0.8% agarose gel.'],
    troubleshooting: [{ issue: 'Sheared genomic DNA (<20 kb)', cause: 'Vortexing lysate vigorously or spinning at high speeds during binding', solution: 'Mix solely by gentle inverting and spin at 1,000 x g during initial column pass.' }],
    references: [{ citation: 'New England Biolabs. (2025). Monarch Genomic DNA Purification Kit Manual (T3010). NEB.', doiOrUrl: 'https://www.neb.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-01-20', changes: 'Standardized pre-warmed elution buffer protocol for peak yield.', author: 'NEB Purification Team' }]
  },

  // --- 10X GENOMICS SPATIAL & MULTIOMICS KITS ---
  {
    id: '10x-visium-spatial-1000184',
    documentId: 'SOP-10X-1000184',
    version: '3.2',
    effectiveDate: '2026-02-12',
    title: '10x Genomics Visium Spatial Gene Expression Protocol for Fresh Frozen Tissue',
    category: 'Spatial Transcriptomics & In Situ Sequencing',
    author: '10x Genomics Spatial Applications Team',
    reviewer: 'Dr. K. Vance, Lead Spatial Genomics Specialist',
    companyKitInfo: {
      vendor: '10x Genomics',
      catalogNumber: '1000184 / 1000187',
      officialDocUrl: 'https://www.10xgenomics.com/products/spatial-gene-expression',
      storageConditions: '-20°C / -80°C (Visium Slides)',
      kitIncludes: ['Visium Spatial Gene Expression Slide (6.5 x 6.5 mm Capture Areas)', 'Tissue Optimization Slides', 'Permeabilization Enzyme', 'First Strand Master Mix', 'Second Strand Primer Mix', 'Visium Dual Index Kit TS']
    },
    scope: 'Total mRNA spatial profiling from intact fresh frozen tissue sections mounted directly onto array capture areas featuring 55 µm barcoded spatial spots.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Tissue Permeabilization Buffer', description: 'Enzyme digestion buffer with mild surfactant.' },
      { type: 'BIOHAZARD', label: 'Cryosectioned Mammalian Tissues', description: 'Handle according to tissue origin biosafety guidelines.' }
    ],
    ppeRequirements: [
      { item: 'Nitrile Gloves', required: true, notes: 'RNase-free certified.' },
      { item: 'Lab Coat', required: true },
      { item: 'Safety Glasses', required: true }
    ],
    equipmentRequired: [
      'Cryostat Microtome (Leica CM1950)',
      'Visium Slide Thermocycler Adaptor (Cat #1000188)',
      'Fluorescence Microscope (Brightfield & TRITC / FITC / DAPI)',
      'Microplate Thermal Cycler with Heated Lid (≥105°C)',
      'Magnetic Separation Stand'
    ],
    reagentsRequired: [
      'Visium Spatial Gene Expression Kit (Cat #1000184)',
      'OCT Embedding Medium',
      'Methanol (100% chilled at -20°C)',
      'H&E Staining Kit or Immunofluorescence Stains',
      'SPRIselect Reagent Beads',
      'Fresh 80% Ethanol'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Tissue Cryosectioning & Slide Placement',
        instruction: 'Cut 10 µm fresh frozen tissue cryosections in cryostat (-15°C chamber / -10°C specimen). Transfer section immediately onto chilled Visium Capture Area (within 6.5 x 6.5 mm fiducial border). Warm back of slide with finger for 5s to adhere tissue. Fix in chilled methanol (-20°C) for 30 min.',
        timingMinutes: 45,
        tempCelsius: -20,
        criticalCheckpoint: 'Avoid tissue wrinkles; ensure tissue section is strictly inside the 6.5 x 6.5 mm capture grid.'
      },
      {
        stepNumber: 2,
        title: 'H&E Staining & High-Resolution Imaging',
        instruction: 'Stain slide with Isopropanol, Hematoxylin, Bluing Buffer, and Eosin. Cover with glycerol and imaging coverslip. Image whole capture area at 20X brightfield magnification. Align fiducial frame in Loupe Browser.',
        timingMinutes: 40
      },
      {
        stepNumber: 3,
        title: 'Tissue Permeabilization & In Situ Reverse Transcription',
        instruction: 'Assemble Visium Slide Cassette. Add 70 µL Permeabilization Enzyme (incubate at 37°C for pre-determined optimum time: typically 12–18 min). Wash with 100 µL 0.1X SSC. Add 75 µL RT Master Mix and incubate in thermal cycler with Visium adaptor: 53°C for 45 min.',
        timingMinutes: 70,
        tempCelsius: 53
      },
      {
        stepNumber: 4,
        title: 'Second Strand Synthesis, cDNA Cleavage & Library Construction',
        instruction: 'Synthesize second strand cDNA on slide at 65°C for 15 min. Cleave cDNA from surface using 0.08 M KOH. Neutralize and transfer to tube. Perform cDNA PCR amplification (14–17 cycles). Clean with 0.6X SPRIselect beads and construct dual-indexed Illumina sequencing library.',
        timingMinutes: 120,
        tempCelsius: 98
      }
    ],
    qualityControl: [
      'Assess tissue RNA integrity (RIN > 7.0) before cryosectioning.',
      'Verify cDNA peak electropherogram profile on TapeStation HS D5000 (~1,000–2,500 bp).'
    ],
    troubleshooting: [
      { issue: 'Tissue detachment during permeabilization', cause: 'Insufficient slide warming during placement or excessive drying', solution: 'Adhere tissue firmly with warm finger for 5–10s; never air-dry cryosections exceeding 1 min.' },
      { issue: 'Low spatial UMIs or mRNA lateral diffusion', cause: 'Over-permeabilization or under-permeabilization', solution: 'Perform Visium Tissue Optimization time course (6, 12, 18, 24 min) prior to expression experiment.' }
    ],
    references: [
      { citation: '10x Genomics. (2025). Visium Spatial Gene Expression Reagent Kits User Guide (CG000239 Rev F). 10x Genomics Inc.', doiOrUrl: 'https://www.10xgenomics.com' }
    ],
    reactionSheet: {
      id: 'rxn-10x-visium-rt',
      title: '10x Visium On-Slide Reverse Transcription Master Mix (75 µL)',
      assayType: 'Spatial Transcriptomics RT',
      reactionVolumeMicroliters: 75,
      defaultNumReactions: 4,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Visium RT Master Mix', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 59.0, pipettingOrder: 1, storageTemp: '-20°C' },
        { id: 'c2', name: 'Visium RT Enzyme Mix', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 6.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Visium Reducing Agent B', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 2.5, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 7.5, pipettingOrder: 4, storageTemp: '20°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Reverse Transcription', tempCelsius: 53, durationSeconds: 2700, cycles: 1 },
        { stepNumber: 2, phase: 'Hold', tempCelsius: 4, durationSeconds: 3600 }
      ]
    },
    revisionHistory: [
      { version: '3.2', date: '2026-02-12', changes: 'Standardized automated imaging coordinates for Loupe Browser 7.0.', author: '10x Spatial Group' }
    ]
  },
  {
    id: '10x-chromium-multiome-1000283',
    documentId: 'SOP-10X-1000283',
    version: '2.4',
    effectiveDate: '2026-02-05',
    title: '10x Genomics Chromium Single Cell Multiome ATAC + Gene Expression SOP',
    category: 'Single-Cell Multiomics & Epigenetics',
    author: '10x Genomics Applications Engineering',
    reviewer: 'Dr. K. Vance',
    companyKitInfo: {
      vendor: '10x Genomics',
      catalogNumber: '1000283 / 1000284',
      officialDocUrl: 'https://www.10xgenomics.com/products/single-cell-multiome-atac-plus-gene-expression',
      storageConditions: '-20°C / -80°C',
      kitIncludes: ['Chromium Next GEM Multiome Gel Beads', 'ATAC Transposition Enzyme & Buffer', 'Multiome RT Reagent Mix', 'Chip J', 'Dual Index Kit TT & N']
    },
    scope: 'Simultaneous profiling of open chromatin (ATAC) and 3\' gene expression (GEX) from the exact same single nucleus across 10,000 nuclei per channel.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Lysis Buffer Surfactants (NP-40, Digitonin)', description: 'Cell membrane lysis detergents.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Chromium Controller / X', 'Thermal Cycler with 96-well block', 'Magnetic Rack', 'Countess III FL'],
    reagentsRequired: ['Multiome ATAC + GEX Kit (Cat #1000283)', 'SPRIselect Beads', 'Digitonin / IGEPAL CA-630', '80% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'Single Nuclei Isolation & Permeabilization', instruction: 'Isolate intact nuclei from fresh or frozen cell/tissue samples using chilled Lysis Buffer with 0.1% NP-40 and 0.01% Digitonin. Wash twice in chilled Nuclei Wash Buffer. Count nuclei on Countess III with DAPI/PI.', timingMinutes: 45, tempCelsius: 4, criticalCheckpoint: 'Inspect nuclei roundness under microscope; membrane blebbing indicates over-lysis.' },
      { stepNumber: 2, title: 'Bulk Transposition Reaction', instruction: 'Resuspend 10,000–20,000 isolated nuclei in 10 µL Transposition Mix (contains Tn5 transposase). Incubate in thermal cycler @ 37°C for 60 min with heated lid set to 50°C.', timingMinutes: 65, tempCelsius: 37 },
      { stepNumber: 3, title: 'GEM Generation & Simultaneous Barcoding', instruction: 'Load transposed nuclei mix, Multiome Gel Beads, and Partitioning Oil into Chip J on Chromium Controller. Generate GEMs and run simultaneous ATAC linear extension & GEX Reverse Transcription in thermocycler.', timingMinutes: 80, tempCelsius: 53 },
      { stepNumber: 4, title: 'Pre-Amplification & Parallel Library Construction', instruction: 'Break GEMs and perform Pre-Amplification PCR (7 cycles). Split pre-amp product: amplify ATAC library with SI-PCR primers (5–8 cycles) and GEX library with Dual Index Kit TT (12–14 cycles). Clean with SPRIselect beads.', timingMinutes: 110, tempCelsius: 98 }
    ],
    qualityControl: ['ATAC library shows periodic nucleosomal banding pattern (~200 bp, 400 bp, 600 bp); GEX library shows peak ~450 bp.'],
    troubleshooting: [{ issue: 'High mitochondrial read percentage in ATAC', cause: 'Incomplete removal of cytoplasm/mitochondria during nuclei isolation', solution: 'Increase centrifugation wash speed to 500 x g or optimize detergent incubation time.' }],
    references: [{ citation: '10x Genomics. (2025). Chromium Single Cell Multiome ATAC + Gene Expression User Guide (CG000338).', doiOrUrl: 'https://www.10xgenomics.com' }],
    revisionHistory: [{ version: '2.4', date: '2026-02-05', changes: 'Updated for low nuclear input protocol.', author: '10x Epigenomics' }]
  },

  // --- ILLUMINA SEQUENCING PLATFORM KITS ---
  {
    id: 'illumina-novaseq-x-reagents',
    documentId: 'SOP-ILMN-NOVAX',
    version: '3.0',
    effectiveDate: '2026-02-14',
    title: 'Illumina NovaSeq X Series 10B/25B Reagent Kit Setup & Flow Cell Loading SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Illumina Sequencing Platforms Operations Group',
    reviewer: 'Dr. M. Vance, Lead Sequencing Specialist',
    companyKitInfo: {
      vendor: 'Illumina',
      catalogNumber: '20085595 / 20085596',
      officialDocUrl: 'https://www.illumina.com/systems/sequencing-platforms/novaseq-x-plus.html',
      storageConditions: '15°C to 25°C (Lyophilized Reagents) / 4°C (Buffer Cartridge)',
      kitIncludes: ['NovaSeq X Series Flow Cell (10B or 25B)', 'Lyophilized Reagent Cartridge (XLEAP-SBS Chemistry)', 'Buffer Cartridge', 'Library Tube Strip']
    },
    scope: 'Preparation, pooling, denaturation, and automated clustering/sequencing of multiplexed DNA/RNA libraries on NovaSeq X Plus system yielding up to 26 billion paired-end reads.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Sequencing Buffer Cartridge', description: 'Contains mild preservatives and buffer salts.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }, { item: 'Safety Glasses', required: true }],
    equipmentRequired: ['Illumina NovaSeq X Plus System', 'Fluorometer (Qubit 4 / Flex)', 'TapeStation 4200 / Femto Pulse', 'Microcentrifuge'],
    reagentsRequired: ['NovaSeq X Reagent Kit', 'Pooled Equimolar NGS Libraries (2.0 nM)', '0.2 N NaOH (Fresh)', '200 mM Tris-HCl pH 7.0', 'PhiX Control v3 (Cat #FC-110-3001)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Library Pool Normalization & Denaturation',
        instruction: 'Pool indexed libraries equimolarly at 2.0 nM (based on Qubit concentration and TapeStation average base pair size). Combine 5 µL of 2 nM pool with 5 µL 0.2 N NaOH. Vortex briefly and incubate at room temp for 8 min to denature dsDNA into single strands. Neutralize with 5 µL 200 mM Tris-HCl pH 7.0 (15 µL total at 667 pM).',
        timingMinutes: 20,
        criticalCheckpoint: 'Prepare fresh 0.2 N NaOH daily; stale NaOH leads to incomplete denaturation and reduced cluster density.'
      },
      {
        stepNumber: 2,
        title: 'PhiX Spike-in & Final Dilution',
        instruction: 'Dilute denatured library pool with chilled Resuspension Buffer (RSB) to target loading concentration (150–250 pM for 10B flow cell; 200–350 pM for 25B flow cell). Spike in 1.0% denatured PhiX Control v3 for sequencing calibration.',
        timingMinutes: 15,
        tempCelsius: 4
      },
      {
        stepNumber: 3,
        title: 'Reagent Cartridge Rehydration & Instrument Loading',
        instruction: 'Remove NovaSeq X Reagent Cartridge from room temperature storage. Load buffer cartridge and reagent cartridge into NovaSeq X Plus reagent drawer. Reagent rehydration occurs automatically on-instrument. Load 60 µL prepared library into designated library wells.',
        timingMinutes: 20
      },
      {
        stepNumber: 4,
        title: 'Flow Cell Placement & Run Initiation',
        instruction: 'Unpack NovaSeq X Flow Cell. Inspect optical surface for dust. Seat flow cell in instrument stage. Clean flow cell camera bay with dry microfiber wipe. Initiate pre-run system checks, select run parameters (e.g. 2 x 150 bp PE), and start sequencing.',
        timingMinutes: 15
      }
    ],
    qualityControl: [
      'Flow cell cluster density >85% Occupancy with >80% Pass Filter (%PF).',
      'Quality score Q30 ≥ 85% across both Read 1 and Read 2.'
    ],
    troubleshooting: [
      { issue: 'Low %PF or underclustering', cause: 'Underestimation of library fragment size or degraded NaOH denaturation', solution: 'Re-quantify pool on Qubit/TapeStation and prepare fresh NaOH; adjust loading concentration by +20%.' },
      { issue: 'High index hopping', cause: 'Free unligated adaptors in library pool', solution: 'Perform 0.8X SPRI bead cleanup on pooled library before denaturation.' }
    ],
    references: [
      { citation: 'Illumina. (2025). NovaSeq X Plus Sequencing System Guide (Document #200008533 v02). Illumina Inc.', doiOrUrl: 'https://www.illumina.com' }
    ],
    revisionHistory: [
      { version: '3.0', date: '2026-02-14', changes: 'Standardized XLEAP-SBS ambient shipping reagent protocol.', author: 'Illumina Platforms QA' }
    ]
  },

  // --- THERMO FISHER / INVITROGEN MOLECULAR CLONING & DIAGNOSTICS ---
  {
    id: 'thermo-purelink-maxi-k210016',
    documentId: 'SOP-TF-K210016',
    version: '4.1',
    effectiveDate: '2026-01-28',
    title: 'Invitrogen PureLink HiPure Plasmid Filter Maxiprep Kit SOP',
    category: 'Plasmid Isolation & Purification',
    author: 'Thermo Fisher Scientific Downstream Purification Division',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Thermo Fisher',
      catalogNumber: 'K210016 / K210017',
      officialDocUrl: 'https://www.thermofisher.com/order/catalog/product/K210016',
      storageConditions: '15°C to 25°C (RNase A added to Resuspension Buffer at 4°C)',
      kitIncludes: ['Resuspension Buffer (R3) with RNase A', 'Lysis Buffer (L7)', 'Precipitation Buffer (N3)', 'Equilibration Buffer (EQ1)', 'Wash Buffer (W8)', 'Elution Buffer (E4)', 'HiPure Filter Maxi Columns']
    },
    scope: 'Gravity-flow anion-exchange chromatography isolation of up to 1,000 µg transfection-grade (endotoxin-free) plasmid DNA from 100–500 mL overnight E. coli cultures.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Lysis Buffer (L7)', description: 'Contains 0.2 N NaOH and 1% SDS. Causes skin irritation.' },
      { type: 'FLAMMABLE', label: 'Isopropanol & 70% Ethanol', description: 'Flammable solvents for DNA precipitation.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }, { item: 'Safety Glasses', required: true }],
    equipmentRequired: ['High-Speed Centrifuge (Beckman Coulter Avanti J-E / JA-14 rotor)', 'PureLink Maxi Column Stand', 'Oak Ridge Centrifuge Tubes (50 mL)'],
    reagentsRequired: ['PureLink HiPure Filter Maxiprep Kit (Cat #K210016)', '100% Isopropanol', '70% Ethanol', 'TE Buffer pH 8.0'],
    steps: [
      { stepNumber: 1, title: 'Bacterial Harvest & Alkaline Lysis', instruction: 'Harvest 100–250 mL bacterial culture @ 4,000 x g for 10 min. Resuspend pellet in 10 mL Buffer R3 (with RNase A). Add 10 mL Buffer L7, mix by inverting 5 times, incubate @ room temp for 5 min. Add 10 mL Buffer N3, invert immediately until homogenous lysate forms.', timingMinutes: 20 },
      { stepNumber: 2, title: 'Simultaneous Clarification & Column Binding', instruction: 'Equilibrate HiPure Filter Maxi Column with 30 mL Buffer EQ1. Pour lysate directly into column filter. Allow lysate to clarify through filter and bind to anion-exchange resin by gravity flow. Discard inner filter sleeve once liquid passes.', timingMinutes: 35 },
      { stepNumber: 3, title: 'Column Washing & Elution', instruction: 'Wash column with 50 mL Buffer W8 by gravity flow. Place column over clean 50 mL Oak Ridge tube. Add 15 mL Buffer E4 to elute high-purity plasmid DNA.', timingMinutes: 25 },
      { stepNumber: 4, title: 'Isopropanol Precipitation & Pellet Wash', instruction: 'Add 10.5 mL (0.7 volumes) isopropanol to eluate. Centrifuge @ 12,000 x g for 30 min at 4°C. Discard supernatant. Wash DNA pellet with 5 mL 70% Ethanol, centrifuge @ 12,000 x g for 5 min. Air-dry pellet 5 min, resuspend in 500–1,000 µL TE Buffer.', timingMinutes: 45, tempCelsius: 4 }
    ],
    qualityControl: ['A260/A280 = 1.80–1.90; Endotoxin level <0.1 EU/µg (validated for mammalian cell transfection).'],
    troubleshooting: [{ issue: 'Clear translucent pellet hard to spot', cause: 'Low culture yield or over-drying', solution: 'Align tube hinge facing outward during centrifugation so pellet location is predictable.' }],
    references: [{ citation: 'Thermo Fisher Scientific. (2025). PureLink HiPure Plasmid Filter Purification Kits User Guide (MAN0000484).', doiOrUrl: 'https://www.thermofisher.com' }],
    revisionHistory: [{ version: '4.1', date: '2026-01-28', changes: 'Standardized 4°C isopropanol spin parameters for maximum recovery.', author: 'Thermo Fisher Downstream QA' }]
  },
  {
    id: 'thermo-taqpath-multiplex-a48003',
    documentId: 'SOP-TF-A48003',
    version: '5.0',
    effectiveDate: '2026-02-10',
    title: 'TaqPath COVID-19 & Respiratory Multiplex RT-PCR Diagnostic SOP',
    category: 'Droplet Digital PCR (ddPCR) & Diagnostics',
    author: 'Thermo Fisher Scientific Clinical Diagnostics Group',
    reviewer: 'Dr. C. Lin, Clinical Molecular Pathology Lead',
    companyKitInfo: {
      vendor: 'Thermo Fisher',
      catalogNumber: 'A48003 / A48102',
      officialDocUrl: 'https://www.thermofisher.com/order/catalog/product/A48003',
      storageConditions: '-20°C (Protect from light)',
      kitIncludes: ['TaqPath 1-Step RT-qPCR Master Mix (4X)', 'TaqPath Respiratory Multiplex Assay (FAM/VIC/ABY/JUN Probes)', 'TaqPath Positive Control', 'TaqPath Control Dilution Buffer']
    },
    scope: 'Multiplex real-time RT-PCR diagnostic detection of viral RNA targets (SARS-CoV-2 ORF1ab, N gene, S gene, and MS2 phage extraction control) in clinical nasopharyngeal specimens.',
    biosafetyLevel: 'BSL-2',
    hazards: [{ type: 'BIOHAZARD', label: 'Clinical Viral Extracts', description: 'Potentially infectious human clinical samples. Process under certified BSL-2 hood.' }],
    ppeRequirements: [{ item: 'Double Nitrile Gloves', required: true }, { item: 'BSL-2 Lab Coat / Gown', required: true }, { item: 'Face Shield / Safety Glasses', required: true }],
    equipmentRequired: ['QuantStudio 5 / 7 Flex Real-Time PCR System', 'Class II Type A2 Biosafety Cabinet', 'Cold PCR Cooling Block'],
    reagentsRequired: ['TaqPath Multiplex Kit (Cat #A48003)', 'MS2 Phage Extraction Control', 'Nuclease-Free Water', 'Extracted Viral RNA'],
    steps: [
      { stepNumber: 1, title: 'Pre-PCR Clean Area Reagent Preparation', instruction: 'In clean template-free hood, prepare RT-qPCR master mix: 6.25 µL TaqPath 1-Step RT-qPCR Master Mix (4X), 1.25 µL TaqPath Multiplex Assay (20X), and 7.5 µL Nuclease-Free Water (15 µL total per well). Dispense 15 µL into 96-well optical reaction plate.', timingMinutes: 20, tempCelsius: 4 },
      { stepNumber: 2, title: 'Sample & Control Loading in Template Area', instruction: 'In designated specimen hood, add 10 µL extracted RNA sample, Negative Control (Water), or Positive Control to corresponding wells (25 µL final volume). Seal plate with optical adhesive film and centrifuge @ 1,000 x g for 1 min.', timingMinutes: 20 },
      { stepNumber: 3, title: 'QuantStudio Real-Time Multiplex Run', instruction: 'Run QuantStudio 5 diagnostic profile: UNG Incubation @ 25°C 2 min; Reverse Transcription @ 53°C 10 min; Polymerase Activation @ 95°C 2 min; 40 cycles of [95°C 3 sec, 60°C 30 sec with 4-channel fluorescence capture: FAM (ORF1ab), VIC (N gene), ABY (S gene), JUN (MS2 Control)].', timingMinutes: 70, tempCelsius: 53 }
    ],
    qualityControl: ['Positive control Cq < 28 for all viral channels; Negative control Cq = Undetermined; MS2 internal control Cq < 32 in all valid patient wells.'],
    troubleshooting: [{ issue: 'MS2 internal control fails (Cq > 35 or Undetermined)', cause: 'RNA extraction failure or PCR inhibition by specimen mucin/heparin', solution: 'Re-extract specimen using MagMAX Viral/Pathogen Kit with 1:2 dilution.' }],
    references: [{ citation: 'Thermo Fisher Scientific. (2025). TaqPath COVID-19 Combo Kit Instructions for Use (MAN0019181 Rev J).', doiOrUrl: 'https://www.thermofisher.com' }],
    reactionSheet: {
      id: 'rxn-taqpath-multiplex',
      title: 'TaqPath Respiratory Multiplex RT-PCR (25 µL Reaction)',
      assayType: 'Multiplex RT-qPCR Diagnostic',
      reactionVolumeMicroliters: 25,
      defaultNumReactions: 24,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 7.5, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'TaqPath 1-Step RT-qPCR Master Mix (4X)', stockConc: 4, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 6.25, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'TaqPath Multiplex Assay Probe Mix (20X)', stockConc: 20, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 1.25, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Extracted Clinical Viral RNA', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 10.0, pipettingOrder: 4, storageTemp: '-80°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'UNG Incubation', tempCelsius: 25, durationSeconds: 120, cycles: 1 },
        { stepNumber: 2, phase: 'Reverse Transcription', tempCelsius: 53, durationSeconds: 600, cycles: 1 },
        { stepNumber: 3, phase: 'Polymerase Activation', tempCelsius: 95, durationSeconds: 120, cycles: 1 },
        { stepNumber: 4, phase: 'Denaturation', tempCelsius: 95, durationSeconds: 3, cycles: 40 },
        { stepNumber: 5, phase: 'Anneal / Extend & 4-Color Read', tempCelsius: 60, durationSeconds: 30, cycles: 40 }
      ]
    },
    revisionHistory: [{ version: '5.0', date: '2026-02-10', changes: 'Updated for 4-target variant multiplex reporting standards.', author: 'Thermo Fisher Clinical' }]
  },
  {
    id: 'thermo-topo-ta-cloning-k457502',
    documentId: 'SOP-TF-K457502',
    version: '4.0',
    effectiveDate: '2026-01-20',
    title: 'Invitrogen TOPO TA Cloning Kit for Sequencing Protocol',
    category: 'High-Fidelity PCR & Cloning',
    author: 'Thermo Fisher Scientific Synthetic Biology Division',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Thermo Fisher',
      catalogNumber: 'K457502 / K457540',
      officialDocUrl: 'https://www.thermofisher.com/order/catalog/product/K457502',
      storageConditions: '-20°C (Competent Cells at -80°C)',
      kitIncludes: ['pCR4-TOPO Vector (covalently bound Topoisomerase I)', 'Salt Solution (1.2 M NaCl, 0.06 M MgCl2)', 'One Shot TOP10 Chemically Competent E. coli', 'M13 Forward & Reverse Primers', 'Control PCR Template & Primers']
    },
    scope: '5-minute room temperature topoisomerase-mediated cloning of Taq-amplified PCR products (with 3\'-A overhangs) directly into pCR4-TOPO sequencing vectors with >95% recombinant efficiency.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Salt Solution', description: 'Concentrated NaCl/MgCl2 solution.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Water Bath / Heat Block (42°C)', 'Shaking Incubator (37°C)', 'Microcentrifuge'],
    reagentsRequired: ['TOPO TA Cloning Kit for Sequencing (Cat #K457502)', 'Fresh Taq-generated PCR Product', 'SOC Medium', 'LB Ampicillin or Kanamycin Plates'],
    steps: [
      { stepNumber: 1, title: '5-Minute TOPO Cloning Reaction Assembly', instruction: 'In 0.2 mL tube, combine 0.5–4 µL fresh Taq PCR product, 1 µL Salt Solution, and 1 µL pCR4-TOPO Vector. Add Water to 6 µL total. Mix gently and incubate @ room temperature (22–25°C) for 5 minutes. Place reaction on ice.', timingMinutes: 6, tempCelsius: 22, criticalCheckpoint: 'Incubate strictly at 22-25°C for 5 min; do not exceed 30 min.' },
      { stepNumber: 2, title: 'One Shot TOP10 Chemical Transformation', instruction: 'Thaw one vial of One Shot TOP10 competent cells on ice. Add 2 µL TOPO reaction to cells, mix gently (do not pipette up and down). Incubate on ice 15 min. Heat-shock in 42°C water bath for exactly 30 seconds. Transfer immediately to ice for 2 min.', timingMinutes: 20, tempCelsius: 42 },
      { stepNumber: 3, title: 'Outgrowth & Selective Plating', instruction: 'Add 250 µL room temperature SOC medium to transformation vial. Shake horizontally at 37°C for 1 hour (200 RPM). Spread 50–100 µL onto pre-warmed LB agar plates with 100 µg/mL Ampicillin or 50 µg/mL Kanamycin. Incubate overnight at 37°C.', timingMinutes: 80, tempCelsius: 37 }
    ],
    qualityControl: ['Verify recombinant insert by direct colony PCR using supplied M13 Forward (-20) and M13 Reverse primers (expect amplicon size = insert length + 180 bp).'],
    troubleshooting: [{ issue: 'Low colony count or high vector background', cause: 'PCR product lacks 3\'-A overhangs (amplified with proofreading polymerase)', solution: 'Post-amplify with Taq polymerase + dATP @ 72°C for 15 min before TOPO cloning.' }],
    references: [{ citation: 'Thermo Fisher Scientific. (2025). TOPO TA Cloning Kit for Sequencing User Guide (MAN0000057).', doiOrUrl: 'https://www.thermofisher.com' }],
    reactionSheet: {
      id: 'rxn-topo-ta-cloning',
      title: 'Invitrogen TOPO TA Cloning Reaction (6 µL)',
      assayType: 'Topoisomerase I Cloning',
      reactionVolumeMicroliters: 6,
      defaultNumReactions: 4,
      defaultOverflowPercent: 0,
      components: [
        { id: 'c1', name: 'Fresh PCR Product (A-tailed)', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 3.0, pipettingOrder: 1, storageTemp: '4°C' },
        { id: 'c2', name: 'Salt Solution (1.2 M NaCl / 0.06 M MgCl2)', stockConc: 6, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 1.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Deionized Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 1.0, pipettingOrder: 3, storageTemp: '20°C' },
        { id: 'c4', name: 'pCR4-TOPO Vector (Activated)', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 1.0, pipettingOrder: 4, storageTemp: '-20°C', notes: 'Add last and mix gently' }
      ]
    },
    revisionHistory: [{ version: '4.0', date: '2026-01-20', changes: 'Standardized pCR4-TOPO vector sequencing screening workflow.', author: 'Thermo Fisher SynthBio' }]
  },

  // --- QIAGEN DNA EXTRACTION & PURIFICATION KITS ---
  {
    id: 'qiagen-dneasy-blood-tissue-69504',
    documentId: 'SOP-QIA-69504',
    version: '4.5',
    effectiveDate: '2026-02-01',
    title: 'QIAGEN DNeasy Blood & Tissue Kit Genomic DNA Isolation SOP',
    category: 'DNA Cleanup & Gel Extraction',
    author: 'QIAGEN Technical Operations Group',
    reviewer: 'Dr. H. Weber',
    companyKitInfo: {
      vendor: 'QIAGEN',
      catalogNumber: '69504 / 69506',
      officialDocUrl: 'https://www.qiagen.com/us/products/discovery-and-translational-research/dna-rna-purification/dna-purification/genomic-dna/dneasy-blood-and-tissue-kit',
      storageConditions: '15°C to 25°C (Proteinase K at room temperature / -20°C)',
      kitIncludes: ['Buffer ATL (Tissue Lysis)', 'Buffer AL (Lysis)', 'Buffer AW1 (Wash 1 Concentrate)', 'Buffer AW2 (Wash 2 Concentrate)', 'Buffer AE (Elution)', 'Proteinase K', 'DNeasy Mini Spin Columns']
    },
    scope: 'Silica spin-column extraction of high-purity genomic DNA (up to 30 µg yield) from rodent tails, animal tissues, cultured cells, whole blood, and yeast.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'Buffer AL & Buffer AW1', description: 'Contains guanidine hydrochloride. Do not expose to bleach.' },
      { type: 'CHEMICAL', label: 'Proteinase K', description: 'Enzymatic protease. Avoid inhalation and skin contact.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Thermomixer / Water Bath (56°C)', 'Microcentrifuge (14,000–20,000 x g)', 'Vortexer'],
    reagentsRequired: ['DNeasy Blood & Tissue Kit (Cat #69504)', '100% Ethanol', 'Sample Tissue / Blood'],
    steps: [
      { stepNumber: 1, title: 'Tissue Digestion with Proteinase K', instruction: 'Place up to 25 mg tissue (or 10–20 mg spleen / 0.5 cm tail tip) into 1.5 mL microcentrifuge tube. Add 180 µL Buffer ATL and 20 µL Proteinase K. Vortex mix. Incubate @ 56°C with shaking (1,000 RPM) for 1–3 hours (or overnight until tissue is completely lysed).', timingMinutes: 90, tempCelsius: 56 },
      { stepNumber: 2, title: 'Lysis & Ethanol Binding Addition', instruction: 'Vortex lysate 15s. Add 200 µL Buffer AL, mix thoroughly by vortexing. Incubate @ 56°C for 10 min. Add 200 µL 100% Ethanol and vortex thoroughly to yield a homogenous mixture.', timingMinutes: 15, tempCelsius: 56 },
      { stepNumber: 3, title: 'Spin Column Binding & Washes', instruction: 'Pipette mixture into DNeasy Mini Spin Column. Centrifuge @ 6,000 x g (8,000 RPM) for 1 min. Discard flow-through. Wash with 500 µL Buffer AW1 (centrifuge 1 min @ 6,000 x g). Wash with 500 µL Buffer AW2 (centrifuge 3 min @ 20,000 x g to dry membrane completely).', timingMinutes: 10 },
      { stepNumber: 4, title: 'High-Yield DNA Elution', instruction: 'Transfer column to clean 1.5 mL tube. Add 100–200 µL Buffer AE directly onto DNeasy membrane. Incubate at room temperature for 5 min to maximize yield. Centrifuge @ 6,000 x g for 1 min to elute purified gDNA.', timingMinutes: 8 }
    ],
    qualityControl: ['A260/A280 ratio = 1.7–1.9; A260/A230 > 2.0; Molecular weight >30 kb on 0.8% agarose gel.'],
    troubleshooting: [{ issue: 'Clogged spin column', cause: 'Incomplete tissue digestion or tissue input >25 mg', solution: 'Extend 56°C Proteinase K digestion time until no visible tissue particles remain.' }],
    references: [{ citation: 'QIAGEN. (2025). DNeasy Blood & Tissue Handbook (Third Edition). QIAGEN Group.', doiOrUrl: 'https://www.qiagen.com' }],
    revisionHistory: [{ version: '4.5', date: '2026-02-01', changes: 'Standardized 5-minute room temperature elution hold.', author: 'QIAGEN Technical Team' }]
  },
  {
    id: 'qiagen-qiaquick-gel-28704',
    documentId: 'SOP-QIA-28704',
    version: '4.0',
    effectiveDate: '2026-01-15',
    title: 'QIAGEN QIAquick Gel Extraction & PCR Purification Kit SOP',
    category: 'DNA Cleanup & Gel Extraction',
    author: 'QIAGEN Genomics Operations',
    reviewer: 'Dr. H. Weber',
    companyKitInfo: {
      vendor: 'QIAGEN',
      catalogNumber: '28704 / 28706',
      officialDocUrl: 'https://www.qiagen.com/us/products/discovery-and-translational-research/dna-rna-purification/dna-purification/dna-clean-up/qiaquick-gel-extraction-kit',
      storageConditions: '15°C to 25°C',
      kitIncludes: ['Buffer QG (Solubilization & Binding with pH indicator)', 'Buffer PE (Wash Concentrate)', 'Buffer EB (10 mM Tris-Cl, pH 8.5)', 'QIAquick Spin Columns']
    },
    scope: 'Silica membrane extraction and purification of 70 bp to 10 kb DNA fragments from standard or low-melt agarose gels in TAE/TBE buffer with up to 80% recovery.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'TOXIC', label: 'Buffer QG', description: 'Contains guanidine thiocyanate chaotrope. Irritating to skin.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }, { item: 'UV Face Shield', required: true, notes: 'When excising gel on UV transilluminator' }],
    equipmentRequired: ['Water Bath / Heating Block (50°C)', 'Microcentrifuge (17,900 x g)', 'Blue Light / UV Transilluminator'],
    reagentsRequired: ['QIAquick Gel Extraction Kit (Cat #28704)', '100% Isopropanol', '100% Ethanol (added to Buffer PE)', 'Agarose Gel Slice'],
    steps: [
      { stepNumber: 1, title: 'Gel Slice Excision & Solubilization', instruction: 'Excise DNA band from agarose gel using clean scalpel. Weigh gel slice in 1.5 mL tube. Add 3 volumes Buffer QG to 1 volume gel (e.g. 300 µL Buffer QG for 100 mg gel slice). Incubate @ 50°C for 10 min with vortexing every 2–3 min until gel slice has completely dissolved.', timingMinutes: 15, tempCelsius: 50, criticalCheckpoint: 'Verify color of Buffer QG mixture is bright yellow (pH ≤ 7.5). If orange or violet, add 10 µL 3 M sodium acetate pH 5.0.' },
      { stepNumber: 2, title: 'Isopropanol Addition & Column Binding', instruction: 'Add 1 gel volume (100 µL for 100 mg gel) of 100% isopropanol to dissolved mixture. Apply mixture to QIAquick Spin Column. Centrifuge @ 17,900 x g for 1 min. Discard flow-through.', timingMinutes: 5 },
      { stepNumber: 3, title: 'Optional QG Wash & PE Wash', instruction: 'Add 500 µL Buffer QG to column and centrifuge 1 min (removes trace agarose for direct sequencing). Wash with 750 µL Buffer PE (with ethanol added) and centrifuge 1 min. Discard flow-through and centrifuge empty column for additional 1 min @ 17,900 x g to dry membrane.', timingMinutes: 6 },
      { stepNumber: 4, title: 'Elution of Purified DNA', instruction: 'Place QIAquick column in clean 1.5 mL tube. Add 30–50 µL Buffer EB directly to the center of the silica membrane. Let stand for 1 min, then centrifuge @ 17,900 x g for 1 min to elute pure DNA.', timingMinutes: 5 }
    ],
    qualityControl: ['A260/A280 = 1.80–1.85; >75% fragment recovery confirmed by fluorometric Qubit quantitation.'],
    troubleshooting: [{ issue: 'Low recovery of <500 bp or >4 kb fragments', cause: 'Omission of isopropanol step or incomplete membrane drying', solution: 'Ensure 1 volume isopropanol is added; incubate Buffer EB at 50°C for 2 min before eluting large >4 kb DNA.' }],
    references: [{ citation: 'QIAGEN. (2025). QIAquick Gel Extraction Kit Handbook (Fourth Edition). QIAGEN Group.', doiOrUrl: 'https://www.qiagen.com' }],
    revisionHistory: [{ version: '4.0', date: '2026-01-15', changes: 'Standardized 500 µL Buffer QG wash step for enzymatic cloning purity.', author: 'QIAGEN Production' }]
  },

  // --- ZYMO RESEARCH EPIGENOMICS & RNA-SEQ KITS ---
  {
    id: 'zymo-ribofree-total-rna-r3000',
    documentId: 'SOP-ZYMO-R3000',
    version: '3.0',
    effectiveDate: '2026-02-08',
    title: 'Zymo-Seq RiboFree Total RNA Library Prep Kit Protocol',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Zymo Research NGS Applications Division',
    reviewer: 'Dr. E. Rossi',
    companyKitInfo: {
      vendor: 'Zymo Research',
      catalogNumber: 'R3000 / R3003',
      officialDocUrl: 'https://www.zymoresearch.com/products/zymo-seq-ribofree-total-rna-library-kit',
      storageConditions: '-20°C',
      kitIncludes: ['RiboFree Universal Depletion Reagent', 'First Strand RT Mix', 'Second Strand Synthesis Mix', 'Universal Index Primer Pairs', 'Zymo-Seq MagBeads']
    },
    scope: 'Probe-free enzymatic depletion of cytoplasmic and mitochondrial rRNA during library prep from any organism (human, mouse, plant, microbial) with 10 ng to 1 µg total RNA input.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'RiboFree Depletion Mix', description: 'Enzymatic depletion reagents.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['96-Well Thermal Cycler', 'Magnetic Separation Stand', 'TapeStation 4200'],
    reagentsRequired: ['Zymo-Seq RiboFree Kit (Cat #R3000)', 'Zymo-Seq MagBeads', 'Fresh 80% Ethanol', 'RNase-Free Water'],
    steps: [
      { stepNumber: 1, title: 'cDNA Synthesis & Adaptor Ligation', instruction: 'Synthesize first and second strand cDNA from 100 ng total RNA. Ligate full-length dual-indexed sequencing adaptors in a single-tube enzymatic workflow @ 20°C for 20 min.', timingMinutes: 90, tempCelsius: 20 },
      { stepNumber: 2, title: 'RiboFree Universal rRNA Depletion', instruction: 'Add RiboFree Universal Depletion Mix directly to adaptor-ligated library. Incubate in thermocycler: 37°C for 60 min to enzymatically eliminate all ribosomal RNA-derived amplicons.', timingMinutes: 65, tempCelsius: 37, criticalCheckpoint: 'Incubate @ 37°C for full 60 min for >99% rRNA removal.' },
      { stepNumber: 3, title: 'Library PCR Amplification & Bead Cleanup', instruction: 'Perform 8–12 cycles of PCR amplification with Zymo-Seq Library Amp Mix. Clean with 0.8X MagBeads. Elute in 20 µL Elution Buffer. Quantify library on TapeStation HS D1000 (peak ~320 bp).', timingMinutes: 50, tempCelsius: 98 }
    ],
    qualityControl: ['<2.0% residual rRNA sequencing reads across human, plant, and bacterial transcriptome data.'],
    troubleshooting: [{ issue: 'Residual rRNA >5%', cause: 'High starting RNA input (>1 µg) exhausting depletion enzymes', solution: 'Quantify initial RNA on Qubit RNA HS Assay and strictly load 100–500 ng.' }],
    references: [{ citation: 'Zymo Research. (2025). Zymo-Seq RiboFree Total RNA Library Kit Protocol Manual (Ver 2.1).', doiOrUrl: 'https://www.zymoresearch.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-02-08', changes: 'Universal species depletion optimization.', author: 'Zymo NGS Team' }]
  },
  {
    id: 'zymo-ez-methylation-gold-d5005',
    documentId: 'SOP-ZYMO-D5005',
    version: '4.2',
    effectiveDate: '2026-01-18',
    title: 'Zymo Research EZ DNA Methylation-Gold Kit Bisulfite Conversion SOP',
    category: 'RNA & Epigenomics Purification',
    author: 'Zymo Research Epigenetics Department',
    reviewer: 'Dr. E. Rossi',
    companyKitInfo: {
      vendor: 'Zymo Research',
      catalogNumber: 'D5005 / D5006',
      officialDocUrl: 'https://www.zymoresearch.com/products/ez-dna-methylation-gold-kit',
      storageConditions: '15°C to 25°C (CT Conversion Reagent in dark)',
      kitIncludes: ['CT Conversion Reagent', 'M-Dilution Buffer', 'M-Binding Buffer', 'M-Wash Buffer', 'M-Desulphonation Buffer', 'M-Elution Buffer', 'Zymo-Spin IC Columns']
    },
    scope: 'Rapid thermal denaturation and complete chemical bisulfite conversion of unmethylated cytosines to uracil (>99.5% conversion rate) from 500 pg to 2 µg genomic DNA in under 3 hours.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'CT Conversion Reagent', description: 'Contains sodium bisulfite. Strong reducing agent and respiratory irritant.' },
      { type: 'CORROSIVE', label: 'M-Desulphonation Buffer', description: 'Contains sodium hydroxide. Corrosive to skin and eyes.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }, { item: 'Safety Glasses', required: true }],
    equipmentRequired: ['Programmable PCR Thermal Cycler', 'Microcentrifuge (16,000 x g)'],
    reagentsRequired: ['EZ DNA Methylation-Gold Kit (Cat #D5005)', '100% Ethanol (added to M-Wash Buffer)', 'Purified Genomic DNA'],
    steps: [
      { stepNumber: 1, title: 'CT Conversion Reaction Setup', instruction: 'In 0.2 mL PCR tube, combine 20 µL DNA sample (100–500 ng gDNA) with 130 µL reconstituted CT Conversion Reagent (150 µL total). Pipette mix and spin down.', timingMinutes: 10 },
      { stepNumber: 2, title: 'Thermal Denaturation & Conversion Incubation', instruction: 'Place tube in thermal cycler: 98°C for 10 min (complete DNA denaturation); 64°C for 2.5 hours (bisulfite sulfonation and deamination); Hold at 4°C.', timingMinutes: 165, tempCelsius: 64, criticalCheckpoint: 'Do not interrupt 64°C 2.5-hour incubation.' },
      { stepNumber: 3, title: 'Column Binding & On-Column Desulphonation', instruction: 'Load 600 µL M-Binding Buffer into Zymo-Spin IC Column. Add converted sample (150 µL) and mix. Centrifuge @ 16,000 x g for 30 sec. Wash with 100 µL M-Wash Buffer. Add 200 µL M-Desulphonation Buffer directly to matrix, incubate @ room temp for 15–20 min. Centrifuge 30 sec.', timingMinutes: 25, tempCelsius: 22 },
      { stepNumber: 4, title: 'Washes & Bisulfite-DNA Elution', instruction: 'Wash column twice with 200 µL M-Wash Buffer. Centrifuge empty column 1 min to dry. Transfer column to clean 1.5 mL tube, add 15 µL M-Elution Buffer directly to matrix, wait 1 min, and centrifuge 30 sec to elute converted ssDNA.', timingMinutes: 8 }
    ],
    qualityControl: ['Cytosine conversion efficiency >99.5% confirmed by Sanger sequencing or Methylation-Specific PCR (MSP).'],
    troubleshooting: [{ issue: 'Incomplete conversion / false positive methylation', cause: 'Incomplete DNA denaturation prior to bisulfite treatment', solution: 'Ensure thermocycler lid is heated to 105°C during 98°C 10-minute initial step.' }],
    references: [{ citation: 'Zymo Research. (2025). EZ DNA Methylation-Gold Kit Instruction Manual (Ver 2.3.0).', doiOrUrl: 'https://www.zymoresearch.com' }],
    revisionHistory: [{ version: '4.2', date: '2026-01-18', changes: 'Standardized 2.5-hour conversion protocol for NGS methylation sequencing.', author: 'Zymo Epigenomics' }]
  },

  // --- BIO-RAD DDPCR & PROTEIN ANALYSIS KITS ---
  {
    id: 'biorad-ddpcr-evagreen-1864034',
    documentId: 'SOP-BIORAD-1864034',
    version: '3.1',
    effectiveDate: '2026-02-11',
    title: 'Bio-Rad QX200 / QX600 Droplet Digital PCR (ddPCR) EvaGreen Supermix SOP',
    category: 'Droplet Digital PCR (ddPCR) & Diagnostics',
    author: 'Bio-Rad Digital Biology Center',
    reviewer: 'Dr. L. Zhang, Lead ddPCR Applications Scientist',
    companyKitInfo: {
      vendor: 'Bio-Rad',
      catalogNumber: '1864034 / 1864035',
      officialDocUrl: 'https://www.bio-rad.com/en-us/product/qx200-ddpcr-evagreen-supermix',
      storageConditions: '-20°C (Protect from light)',
      kitIncludes: ['QX200 ddPCR EvaGreen Supermix (2X)', 'Droplet Generation Oil for EvaGreen', 'DG8 Cartridges & Gaskets', 'ddPCR 96-Well Plates & Foil Seals']
    },
    scope: 'Absolute copy number determination, rare mutation quantification, and gene expression without standard curves using partition-based Droplet Digital PCR on Bio-Rad QX200/QX600 system.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'CHEMICAL', label: 'Droplet Generation Oil', description: 'Fluorinated hydrocarbon surfactant oil.' },
      { type: 'CHEMICAL', label: 'EvaGreen Dye', description: 'DNA-binding fluorophore.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Bio-Rad QX200 / QX600 Droplet Generator & Droplet Reader', 'Bio-Rad C1000 Touch Thermal Cycler with 96-Deep Well Block', 'PX1 PCR Plate Sealer'],
    reagentsRequired: ['ddPCR EvaGreen Supermix (Cat #1864034)', '10 µM Forward & Reverse Primers (100 nM final)', 'Restriction Enzyme (HaeIII or MseI for gDNA fragmentation)', 'Target DNA Template'],
    steps: [
      { stepNumber: 1, title: 'Reaction Master Mix Assembly', instruction: 'Assemble 22 µL ddPCR reaction: 11 µL 2X EvaGreen Supermix, 0.22 µL Forward Primer (100 nM final), 0.22 µL Reverse Primer (100 nM final), 5 U restriction enzyme (for intact gDNA), DNA template (1 pg–50 ng), and water to 22 µL.', timingMinutes: 15, tempCelsius: 4 },
      { stepNumber: 2, title: 'Droplet Generation in DG8 Cartridge', instruction: 'Load 20 µL reaction mix into middle wells of DG8 cartridge. Dispense 70 µL Droplet Generation Oil into bottom wells. Place gasket over cartridge and insert into QX200 Droplet Generator. Generator partitions sample into ~20,000 nanoliter-sized droplets in 2.5 min.', timingMinutes: 10 },
      { stepNumber: 3, title: 'Droplet Transfer & Plate Heat Sealing', instruction: 'Carefully transfer 40 µL droplet emulsion from top wells into 96-well ddPCR plate using multi-channel pipette with slow aspiration (slow pipetting prevents droplet shearing). Seal plate with Pierceable Foil Seal on PX1 Sealer @ 180°C for 5 sec.', timingMinutes: 10, criticalCheckpoint: 'Pipette droplets extremely slowly (over 5 seconds) to avoid droplet coalescence.' },
      { stepNumber: 4, title: 'Thermal Cycling & Droplet Reading', instruction: 'Run deep-well thermocycler: 95°C 5 min; 40 cycles [95°C 30s, 58°C 1 min with 2°C/sec ramp rate]; 4°C 5 min; 90°C 5 min (droplet stabilization); Hold 4°C. Load plate into QX200 Droplet Reader to quantify positive/negative droplets.', timingMinutes: 130, tempCelsius: 58 }
    ],
    qualityControl: ['Minimum droplet count >10,000 accepted droplets per well for robust Poisson statistics.'],
    troubleshooting: [{ issue: 'Low accepted droplet count (<8,000)', cause: 'Fast pipetting during droplet transfer or dust in DG8 cartridge', solution: 'Aspirate/dispense over 5 full seconds; use filtered barrier tips and work in laminar flow hood.' }],
    references: [{ citation: 'Bio-Rad Laboratories. (2025). Droplet Digital PCR Applications Guide (Bulletin 6407). Bio-Rad.', doiOrUrl: 'https://www.bio-rad.com' }],
    reactionSheet: {
      id: 'rxn-biorad-ddpcr-evagreen',
      title: 'Bio-Rad ddPCR EvaGreen Master Mix (22 µL)',
      assayType: 'Droplet Digital PCR',
      reactionVolumeMicroliters: 22,
      defaultNumReactions: 8,
      defaultOverflowPercent: 10,
      components: [
        { id: 'c1', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 8.56, pipettingOrder: 1, storageTemp: '20°C' },
        { id: 'c2', name: 'QX200 ddPCR EvaGreen Supermix (2X)', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 11.0, pipettingOrder: 2, storageTemp: '-20°C' },
        { id: 'c3', name: 'Forward Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.1, finalUnit: 'µM', volPerRxnMicroliters: 0.22, pipettingOrder: 3, storageTemp: '-20°C' },
        { id: 'c4', name: 'Reverse Primer (10 µM)', stockConc: 10, stockUnit: 'µM', finalConc: 0.1, finalUnit: 'µM', volPerRxnMicroliters: 0.22, pipettingOrder: 4, storageTemp: '-20°C' },
        { id: 'c5', name: 'Target DNA Template', stockConc: 5, stockUnit: 'ng/µL', finalConc: 0.45, finalUnit: 'ng/µL', volPerRxnMicroliters: 2.0, pipettingOrder: 5, storageTemp: '-20°C' }
      ],
      thermocyclerProfile: [
        { stepNumber: 1, phase: 'Enzyme Activation', tempCelsius: 95, durationSeconds: 300, cycles: 1 },
        { stepNumber: 2, phase: 'Denaturation (2°C/s ramp)', tempCelsius: 95, durationSeconds: 30, cycles: 40 },
        { stepNumber: 3, phase: 'Anneal / Extend (2°C/s ramp)', tempCelsius: 58, durationSeconds: 60, cycles: 40 },
        { stepNumber: 4, phase: 'Signal Stabilization 1', tempCelsius: 4, durationSeconds: 300, cycles: 1 },
        { stepNumber: 5, phase: 'Signal Stabilization 2', tempCelsius: 90, durationSeconds: 300, cycles: 1 },
        { stepNumber: 6, phase: 'Hold', tempCelsius: 4, durationSeconds: 3600 }
      ]
    },
    revisionHistory: [{ version: '3.1', date: '2026-02-11', changes: 'Standardized 2°C/s ramp rate protocol for droplet temperature uniformity.', author: 'Bio-Rad ddPCR QA' }]
  },
  {
    id: 'biorad-transblot-turbo-1704272',
    documentId: 'SOP-BIORAD-1704272',
    version: '4.0',
    effectiveDate: '2026-01-20',
    title: 'Bio-Rad Trans-Blot Turbo RTA Transfer Kit & Rapid Western Blotting Protocol',
    category: 'Protein & Western Blot Analysis',
    author: 'Bio-Rad Protein Quantification Operations',
    reviewer: 'Dr. L. Zhang',
    companyKitInfo: {
      vendor: 'Bio-Rad',
      catalogNumber: '1704272 / 1704273',
      officialDocUrl: 'https://www.bio-rad.com/en-us/product/trans-blot-turbo-transfer-system',
      storageConditions: '15°C to 25°C (PVDF / Nitrocellulose Transfer Packs)',
      kitIncludes: ['Trans-Blot Turbo 5X Transfer Buffer', 'Pre-cut PVDF Membranes (0.2 µm)', 'Pre-cut Blotting Filter Papers', 'Gel Matrix Roller']
    },
    scope: 'Rapid semi-dry electrophoretic protein transfer from mini or midi SDS-PAGE polyacrylamide gels onto PVDF membranes in 3 to 7 minutes with high molecular weight efficiency.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'FLAMMABLE', label: '100% Methanol / Ethanol', description: 'Required for hydrophobic PVDF membrane activation.' },
      { type: 'CHEMICAL', label: 'SDS-PAGE Running Buffer', description: 'Standard electrophoresis buffer.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }, { item: 'Safety Glasses', required: true }],
    equipmentRequired: ['Bio-Rad Trans-Blot Turbo Transfer Starter System', 'ChemiDoc MP Imaging System', 'Mini-PROTEAN Tetra Cell'],
    reagentsRequired: ['Trans-Blot Turbo RTA Kit (Cat #1704272)', '100% Methanol', '1X Turbo Transfer Buffer (20% Ethanol)', 'Resolved SDS-PAGE Gel', 'EveryBlot Blocking Buffer (Cat #12010020)'],
    steps: [
      { stepNumber: 1, title: 'Membrane Activation & Transfer Stack Assembly', instruction: 'Activate 0.2 µm PVDF membrane in 100% methanol for 30 sec, then equilibrate in 1X Trans-Blot Turbo Transfer Buffer for 2 min. Soak blotting filter paper in 1X transfer buffer. Place bottom filter paper on cassette anode (+), lay activated PVDF membrane on paper, place resolved SDS-PAGE gel over membrane, and top with soaked filter paper.', timingMinutes: 10, criticalCheckpoint: 'Use gel roller gently over stack to eliminate all air bubbles; bubbles cause blank transfer spots.' },
      { stepNumber: 2, title: 'Rapid Semi-Dry Electrophoretic Transfer', instruction: 'Engage Trans-Blot Turbo cassette lid. Insert into instrument bay. Select protocol: "Standard SD" (25 V, 2.5 A constant, 3 min for mixed MW mini gels 10–150 kDa) or "High MW" (7 min for proteins >150 kDa). Initiate transfer.', timingMinutes: 7, tempCelsius: 25 },
      { stepNumber: 3, title: 'Rapid Blocking & Chemiluminescent Detection', instruction: 'Disassemble stack. Block PVDF membrane in EveryBlot Blocking Buffer for 5 min @ room temp. Incubate with primary antibody (diluted in EveryBlot) for 1 hr @ room temp. Wash 3x with TBST (5 min each). Incubate with HRP-conjugated secondary antibody for 30 min. Detect on ChemiDoc with Clarity Western ECL Substrate.', timingMinutes: 110, tempCelsius: 22 }
    ],
    qualityControl: ['Reversible Ponceau S or Total Protein Stain confirms uniform band transfer with zero retention on polyacrylamide gel.'],
    troubleshooting: [{ issue: 'Swirl patterns or uneven transfer', cause: 'Air bubbles trapped between gel and PVDF membrane', solution: 'Roll cassette roller across transfer stack firmly before closing lid.' }],
    references: [{ citation: 'Bio-Rad Laboratories. (2025). Trans-Blot Turbo Transfer System Instruction Manual (#10021340).', doiOrUrl: 'https://www.bio-rad.com' }],
    revisionHistory: [{ version: '4.0', date: '2026-01-20', changes: 'Standardized 3-minute rapid protocol and EveryBlot 5-minute blocking workflow.', author: 'Bio-Rad Protein Group' }]
  },

  // --- AGILENT INSTRUMENTATION & QUALITY CONTROL KITS ---
  {
    id: 'agilent-bioanalyzer-hs-dna-50674626',
    documentId: 'SOP-AGILENT-50674626',
    version: '4.2',
    effectiveDate: '2026-02-04',
    title: 'Agilent 2100 Bioanalyzer High Sensitivity DNA Assay Protocol',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Agilent Technologies Genomics Diagnostics',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Agilent',
      catalogNumber: '5067-4626 / 5067-4627',
      officialDocUrl: 'https://www.agilent.com/en/product/automated-electrophoresis/bioanalyzer-systems/bioanalyzer-dna-rna-kits/high-sensitivity-dna-kit',
      storageConditions: '4°C (Protect Dye Concentrate from light; Chips at room temp)',
      kitIncludes: ['High Sensitivity DNA Chips (10 chips)', 'HS DNA Gel Matrix', 'HS DNA Dye Concentrate', 'HS DNA Marker (35 bp / 10,380 bp)', 'HS DNA Ladder (50–7,000 bp)']
    },
    scope: 'On-chip microfluidic capillary electrophoresis sizing (50–7,000 bp) and ultra-sensitive quantification (5–500 pg/µL) of NGS libraries and sheared DNA fragments on Agilent 2100 Bioanalyzer.',
    biosafetyLevel: 'BSL-1',
    hazards: [
      { type: 'TOXIC', label: 'HS DNA Dye Concentrate', description: 'Contains DMSO solvent. Light-sensitive DNA intercalating dye.' }
    ],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Agilent 2100 Bioanalyzer System', 'Chip Priming Station with Syringe', 'IKA Vortexer (2,400 RPM)'],
    reagentsRequired: ['Agilent HS DNA Kit (Cat #5067-4626)', 'Purified NGS Library / DNA Sample', '0.22 µm Spin Filters'],
    steps: [
      { stepNumber: 1, title: 'Gel-Dye Mix Preparation & Chip Priming', instruction: 'Equilibrate HS DNA reagents at room temperature for 30 min in dark. Filter 300 µL Gel Matrix through spin filter @ 2,240 x g for 15 min. Add 15 µL Dye Concentrate to 300 µL filtered gel, vortex, and spin 5 min @ 14,000 x g. Pipette 9 µL Gel-Dye mix into marked well G. Prime chip in priming station (syringe clip set to position C, depress plunger for 60s, release clip). Pipette 9 µL Gel-Dye into other two G wells.', timingMinutes: 45, criticalCheckpoint: 'Set Priming Station base plate to position 4 and syringe clip to C.' },
      { stepNumber: 2, title: 'Marker & Sample Loading', instruction: 'Pipette 5 µL HS DNA Marker into all 11 sample wells and the Ladder well. Pipette 1 µL HS DNA Ladder into the ladder well. Pipette 1 µL DNA sample (5–500 pg/µL) into each of the 11 sample wells (pipette 1 µL marker into any unused wells).', timingMinutes: 10 },
      { stepNumber: 3, title: 'On-Chip Vortexing & Instrument Run', instruction: 'Place chip in IKA vortexer and vortex at 2,400 RPM for exactly 60 seconds. Insert chip into Agilent 2100 Bioanalyzer within 5 minutes. Select "High Sensitivity DNA" assay in 2100 Expert Software and start run.', timingMinutes: 35 }
    ],
    qualityControl: ['All 15 ladder peaks resolved; Lower Marker (35 bp) and Upper Marker (10,380 bp) aligned with <5% sizing error.'],
    troubleshooting: [{ issue: 'Late migration or missing upper marker', cause: 'Air bubbles in priming wells or dirty instrument electrode pins', solution: 'Perform electrode cartridge decontamination with RNaseZap and deionized water; avoid air bubble injection.' }],
    references: [{ citation: 'Agilent Technologies. (2025). Agilent High Sensitivity DNA Kit Guide (G2938-90033 Rev D).', doiOrUrl: 'https://www.agilent.com' }],
    revisionHistory: [{ version: '4.2', date: '2026-02-04', changes: 'Standardized 60-second IKA vortexing protocol.', author: 'Agilent QC Team' }]
  },
  {
    id: 'agilent-tapestation-hsd1000-50675584',
    documentId: 'SOP-AGILENT-50675584',
    version: '3.0',
    effectiveDate: '2026-02-12',
    title: 'Agilent TapeStation High Sensitivity D1000 ScreenTape Quality Control SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'Agilent Technologies Electrophoresis Group',
    reviewer: 'Dr. C. Lin',
    companyKitInfo: {
      vendor: 'Agilent',
      catalogNumber: '5067-5584 / 5067-5585',
      officialDocUrl: 'https://www.agilent.com/en/product/automated-electrophoresis/tapestation-systems/tapestation-dna-screentape-reagents/high-sensitivity-d1000-screentape',
      storageConditions: '2°C to 8°C (Reagents) / Room Temp (ScreenTape devices)',
      kitIncludes: ['High Sensitivity D1000 ScreenTape', 'High Sensitivity D1000 Reagents (Sample Buffer & Ladder)', 'Optical Tube Strips & Caps']
    },
    scope: 'Automated capillary electrophoresis sizing (35–1,000 bp) and quantification (10–1,000 pg/µL) of up to 96 NGS samples in under 90 seconds per sample on 4150/4200 TapeStation.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'HS D1000 Sample Buffer', description: 'Enzymatic marker buffer containing fluorescent dye.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Agilent 4150 or 4200 TapeStation System', 'I-Pette / Microplate Vortexer & Centrifuge'],
    reagentsRequired: ['HS D1000 ScreenTape (Cat #5067-5584)', 'HS D1000 Reagents (Cat #5067-5585)', 'Prepared NGS Library Samples'],
    steps: [
      { stepNumber: 1, title: 'Reagent Equilibration & Pipetting', instruction: 'Equilibrate HS D1000 reagents at room temp for 30 min. In 0.2 mL 8-strip tubes or 96-well plate, dispense 2 µL HS D1000 Sample Buffer to each well. Add 2 µL HS D1000 Ladder to well 1. Add 2 µL DNA sample (10–1,000 pg/µL) to remaining wells.', timingMinutes: 15 },
      { stepNumber: 2, title: 'Vortexing & Centrifugation', instruction: 'Cap tubes tightly. Vortex for 1 min at 2,000 RPM using I-Pette or plate shaker. Spin down for 1 min @ 1,000 x g to collect liquid at bottom and remove air bubbles.', timingMinutes: 5 },
      { stepNumber: 3, title: 'TapeStation Run Execution', instruction: 'Load HS D1000 ScreenTape and tube strip into TapeStation 4200. Select assay and start run (automated run time = 1.5 min per sample). Review electropherogram traces and molarity in TapeStation Controller software.', timingMinutes: 15 }
    ],
    qualityControl: ['Confirm Lower Marker (25 bp) and Upper Marker (1,500 bp) alignment with %CV < 5% across all channels.'],
    troubleshooting: [{ issue: 'Broad or distorted marker peaks', cause: 'Incomplete vortexing or air bubbles in tube bottom', solution: 'Re-vortex for 60 seconds and spin down thoroughly before loading.' }],
    references: [{ citation: 'Agilent Technologies. (2025). Agilent High Sensitivity D1000 ScreenTape System Quick Guide (G2992-90130).', doiOrUrl: 'https://www.agilent.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-02-12', changes: 'Updated for 96-well automated high-throughput workflows.', author: 'Agilent TapeStation Operations' }]
  },

  // --- TWIST BIOSCIENCE TARGET ENRICHMENT ---
  {
    id: 'twist-human-core-exome-102026',
    documentId: 'SOP-TWIST-102026',
    version: '3.2',
    effectiveDate: '2026-02-01',
    title: 'Twist Bioscience Human Core Exome Target Enrichment Protocol',
    category: 'NGS & Single Cell Sequencing',
    author: 'Twist Bioscience Target Enrichment Applications',
    reviewer: 'Dr. A. Sharma',
    companyKitInfo: {
      vendor: 'Twist Bioscience',
      catalogNumber: '102026 / 102027',
      officialDocUrl: 'https://www.twistbioscience.com/products/ngs/target-enrichment/exome-panels/human-core-exome',
      storageConditions: '-20°C / -80°C (Exome Probe Pool)',
      kitIncludes: ['Twist Human Core Exome Probe Pool (33 Mb target)', 'Twist Fast Hybridization Mix', 'Twist Universal Blockers', 'Streptavidin Binding Beads', 'Twist Wash Buffers 1 & 2']
    },
    scope: 'Rapid double-stranded DNA hybridization capture of human exome coding regions (33 Mb) with high library uniformity (Fold-80 < 1.35) for germline and oncology NGS variant discovery.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Hybridization Buffer', description: 'Concentrated hybridization salt cocktail.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['96-Well Thermal Cycler (Heated Lid @ 105°C)', 'Magnetic Separation Stand', 'Qubit 4 Fluorometer'],
    reagentsRequired: ['Twist Human Core Exome Kit (Cat #102026)', 'Equimolar Pooled NGS DNA Libraries (500–1,500 ng total)', 'AMPure XP Beads', 'Fresh 80% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'Library Pool Drying & Blocker Addition', instruction: 'Pool up to 16 indexed DNA libraries (totaling 1,500 ng DNA). Add 5 µL Twist Universal Blockers. Dry pool completely in vacuum concentrator @ 45°C for 30–45 min.', timingMinutes: 50, tempCelsius: 45 },
      { stepNumber: 2, title: 'Fast Probe Hybridization', instruction: 'Resuspend dried pool in 20 µL Twist Fast Hybridization Mix and 4 µL Twist Human Core Exome Probe Pool. Heat in thermocycler: 95°C for 5 min (denaturation), followed by 60°C for 2 hours (fast hybridization capture).', timingMinutes: 130, tempCelsius: 60, criticalCheckpoint: 'Set thermal cycler heated lid to 105°C to avoid condensation.' },
      { stepNumber: 3, title: 'Streptavidin Bead Capture & Strict High-Temp Washes', instruction: 'Bind biotinylated probe-target hybrids to 100 µL Streptavidin Beads @ room temp for 30 min. Magnetize and wash twice with Wash Buffer 1. Perform three strict washes with Wash Buffer 2 @ 60°C in thermocycler.', timingMinutes: 60, tempCelsius: 60 },
      { stepNumber: 4, title: 'Post-Capture PCR Amplification', instruction: 'Amplify target-captured library on beads using Equimolar Primers and KAPA HiFi HotStart (8–10 cycles). Purify with 0.8X AMPure XP beads and quantify for NovaSeq sequencing.', timingMinutes: 50, tempCelsius: 98 }
    ],
    qualityControl: ['Fold-80 base penalty < 1.35; >90% on-target sequencing alignment rate.'],
    troubleshooting: [{ issue: 'High off-target reads (>20%)', cause: 'Wash Buffer 2 temperature dropped below 60°C during bead washing', solution: 'Preheat Wash Buffer 2 and perform all 3 wash incubations directly inside a 60°C thermocycler.' }],
    references: [{ citation: 'Twist Bioscience. (2025). Twist Target Enrichment Protocol Manual (DOC-001007 Rev 4.0).', doiOrUrl: 'https://www.twistbioscience.com' }],
    revisionHistory: [{ version: '3.2', date: '2026-02-01', changes: 'Standardized 2-hour Fast Hyb protocol.', author: 'Twist Applications' }]
  },

  // --- PROMEGA REPORTER & CELL VIABILITY ASSAYS ---
  {
    id: 'promega-dual-luciferase-e1910',
    documentId: 'SOP-PROMEGA-E1910',
    version: '4.0',
    effectiveDate: '2026-01-22',
    title: 'Promega Dual-Luciferase Reporter (DLR) Assay System Protocol',
    category: 'Cell Viability & Reporter Assays',
    author: 'Promega Cellular Analysis Group',
    reviewer: 'Dr. R. Miller',
    companyKitInfo: {
      vendor: 'Promega',
      catalogNumber: 'E1910 / E1960',
      officialDocUrl: 'https://www.promega.com/products/luciferase-assays/reporter-assays/dual-luciferase-reporter-assay-system',
      storageConditions: '-20°C / -80°C (Protect LAR II & Stop & Glo from light)',
      kitIncludes: ['Passive Lysis Buffer (PLB 5X)', 'Luciferase Assay Buffer II & Luciferase Assay Substrate (LAR II)', 'Stop & Glo Buffer & 50X Stop & Glo Substrate']
    },
    scope: 'Sequential quantification of Firefly (Photinus pyralis) and Renilla (Renilla reniformis) bioluminescent luciferase activities in mammalian cell lysates for transcriptional regulation and promoter screening.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'Passive Lysis Buffer', description: 'Contains mild non-ionic cell lysis detergents.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Luminometer with Dual Auto-Injectors (Promega GloMax / Tecan Spark)', '96-Well White Solid Microplates'],
    reagentsRequired: ['Dual-Luciferase Reporter Assay Kit (Cat #E1910)', 'PBS 1X', 'Transfected Mammalian Cells (in 24/96-well culture plates)'],
    steps: [
      { stepNumber: 1, title: 'Cell Washing & Passive Lysis', instruction: 'Aspirate growth media from transfected cells in 96-well plate. Wash gently once with 100 µL 1X PBS. Add 20 µL 1X Passive Lysis Buffer (PLB) per well. Rock plate at room temperature for 15 min to achieve complete lysis.', timingMinutes: 20 },
      { stepNumber: 2, title: 'Luminometer Priming & Plate Setup', instruction: 'Prime Auto-Injector 1 with LAR II reagent (Firefly substrate). Prime Auto-Injector 2 with 1X Stop & Glo reagent (Renilla substrate + Firefly quencher). Transfer 20 µL cell lysate to white solid 96-well plate.', timingMinutes: 15 },
      { stepNumber: 3, title: 'Dual-Luciferase Sequential Measurement', instruction: 'Initiate GloMax protocol: Inject 100 µL LAR II -> 2 sec pre-measurement delay -> 10 sec luminescence acquisition (Firefly activity) -> Inject 100 µL Stop & Glo -> 2 sec delay -> 10 sec luminescence acquisition (Renilla activity). Calculate normalized ratio (Firefly RLU / Renilla RLU).', timingMinutes: 30 }
    ],
    qualityControl: ['Renilla Stop & Glo quenching of Firefly luminescence exceeds 10,000-fold (>99.99% quenching).'],
    troubleshooting: [{ issue: 'High well-to-well variance', cause: 'Incomplete passive lysis or luminescence signal crosstalk between wells', solution: 'Ensure full 15-minute PLB rocking; always use opaque solid white microplates.' }],
    references: [{ citation: 'Promega Corporation. (2025). Dual-Luciferase Reporter Assay System Technical Manual (TM040).', doiOrUrl: 'https://www.promega.com' }],
    revisionHistory: [{ version: '4.0', date: '2026-01-22', changes: 'Standardized auto-injector delay parameters for 96-well format.', author: 'Promega QA' }]
  },
  {
    id: 'promega-celltiter-glo-g9241',
    documentId: 'SOP-PROMEGA-G9241',
    version: '4.1',
    effectiveDate: '2026-02-05',
    title: 'Promega CellTiter-Glo 2.0 Luminescent Cell Viability Assay SOP',
    category: 'Cell Viability & Reporter Assays',
    author: 'Promega Cellular Analysis Technical Services',
    reviewer: 'Dr. R. Miller',
    companyKitInfo: {
      vendor: 'Promega',
      catalogNumber: 'G9241 / G9242',
      officialDocUrl: 'https://www.promega.com/products/cell-health-assays/cell-viability-and-cytotoxicity-assays/celltiter-glo-2_0-cell-viability-assay',
      storageConditions: '4°C (Stable for up to 5 months) or -20°C (Protect from light)',
      kitIncludes: ['CellTiter-Glo 2.0 Ready-to-Use Single-Component Reagent (Recombinant Ultra-Glo Luciferase, Luciferin, Detergent & Mg2+)']
    },
    scope: 'Homogeneous, single-step luminescent quantification of ATP levels to determine the number of viable, metabolically active mammalian cells in high-throughput drug cytotoxicity and proliferation screens.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'CellTiter-Glo 2.0 Reagent', description: 'Contains luciferase buffer and detergents. Protect from bright light.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Microplate Luminometer (Promega GloMax / BioTek Synergy)', 'Plate Shaker (Orbital)', 'White 96-Well or 384-Well Clear-Bottom Culture Plates'],
    reagentsRequired: ['CellTiter-Glo 2.0 Reagent (Cat #G9241)', 'Mammalian Cultured Cells in 96-Well Plates (100 µL/well)'],
    steps: [
      { stepNumber: 1, title: 'Reagent & Plate Temperature Equilibration', instruction: 'Equilibrate CellTiter-Glo 2.0 reagent and multi-well cell culture plate at room temperature (22–25°C) for 30 minutes.', timingMinutes: 30, tempCelsius: 22, criticalCheckpoint: 'Ensure reagent and plates reach room temperature to maintain uniform luciferase kinetics.' },
      { stepNumber: 2, title: 'Reagent Addition & Cell Lysis Shaking', instruction: 'Add an equal volume (100 µL) of CellTiter-Glo 2.0 Reagent directly to each well containing 100 µL of cells in culture medium. Mix plate on orbital shaker at 500 RPM for 2 minutes to induce complete cell lysis and release intracellular ATP.', timingMinutes: 5 },
      { stepNumber: 3, title: 'Signal Stabilization & Luminescent Readout', instruction: 'Incubate plate at room temperature in dark for 10 minutes to stabilize luminescent signal (glow-type signal with half-life >3 hours). Read total luminescence on GloMax plate reader (integration time: 0.5–1.0 second per well).', timingMinutes: 15 }
    ],
    qualityControl: ['Linear dynamic range spanning 10 to 50,000 cells/well with R^2 > 0.99.'],
    troubleshooting: [{ issue: 'High edge effect or signal drift', cause: 'Temperature gradients across the 96-well plate during readout', solution: 'Equilibrate plate to ambient room temperature for full 30 min before adding reagent.' }],
    references: [{ citation: 'Promega Corporation. (2025). CellTiter-Glo 2.0 Assay Technical Manual (TM403).', doiOrUrl: 'https://www.promega.com' }],
    revisionHistory: [{ version: '4.1', date: '2026-02-05', changes: 'Standardized 1-step room temperature addition protocol.', author: 'Promega Operations' }]
  },

  // --- NEB CAS9 & FS LIBRARY PREPARATION KITS ---
  {
    id: 'neb-engen-cas9-m0646',
    documentId: 'SOP-NEB-M0646',
    version: '3.0',
    effectiveDate: '2026-02-08',
    title: 'NEB EnGen Cas9 NLS, S. pyogenes RNP In Vitro Cleavage SOP',
    category: 'CRISPR & Genome Editing',
    author: 'New England Biolabs (NEB) Genome Editing Applications',
    reviewer: 'Dr. D. Patel',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'M0646T / M0646M',
      officialDocUrl: 'https://www.neb.com/en/products/m0646-engen-cas9-nls-s-pyogenes',
      storageConditions: '-20°C',
      kitIncludes: ['EnGen Cas9 NLS, S. pyogenes (20 µM)', 'NEBuffer r3.1 (10X)', 'EnGen sgRNA Synthesis Kit components']
    },
    scope: 'Assembly of Cas9-sgRNA ribonucleoprotein (RNP) complexes for high-efficiency in vitro validation of sgRNA cutting efficiency and direct microinjection/electroporation.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'NEBuffer r3.1', description: 'Enzyme buffer solution.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['PCR Thermocycler or Heating Block (37°C)', 'Sub-Cell GT Agarose Gel Electrophoresis System'],
    reagentsRequired: ['EnGen Cas9 NLS (Cat #M0646)', 'Synthetic or in vitro transcribed sgRNA', 'Target Substrate DNA (PCR amplicon or plasmid)', 'Proteinase K (20 mg/mL)'],
    steps: [
      { stepNumber: 1, title: 'Cas9 RNP Complex Assembly', instruction: 'In 0.2 mL PCR tube, combine 3 µL 10X NEBuffer r3.1, 300 nM sgRNA, and 30 nM EnGen Cas9 NLS in 27 µL Nuclease-Free Water. Incubate @ 25°C for 10 min to allow Cas9 RNP assembly.', timingMinutes: 10, tempCelsius: 25 },
      { stepNumber: 2, title: 'Target Substrate DNA Cleavage', instruction: 'Add 3 µL target substrate DNA (3 nM final target concentration) to the 27 µL Cas9 RNP mixture (30 µL total). Incubate in thermal cycler @ 37°C for 30 min.', timingMinutes: 30, tempCelsius: 37 },
      { stepNumber: 3, title: 'Proteinase K Quenching & Fragment Resolution', instruction: 'Add 1 µL Proteinase K (20 mg/mL) and incubate @ 56°C for 10 min to release tightly bound Cas9 protein from cleaved DNA. Add 6X Purple Gel Loading Dye and run on 1.5% Agarose Gel.', timingMinutes: 20, tempCelsius: 56 }
    ],
    qualityControl: ['>90% cleavage efficiency verified by band densitometry on agarose gel image.'],
    troubleshooting: [{ issue: 'Faint or smeared cleavage bands', cause: 'Omitting Proteinase K digestion leaving Cas9 protein bound to cleaved fragments', solution: 'Always incubate with 1 µL Proteinase K at 56°C before gel loading.' }],
    references: [{ citation: 'New England Biolabs. (2025). In Vitro Cleavage Assay with EnGen Cas9 NLS (M0646). NEB.', doiOrUrl: 'https://www.neb.com' }],
    revisionHistory: [{ version: '3.0', date: '2026-02-08', changes: 'Standardized 10-minute Proteinase K release step.', author: 'NEB Editing QA' }]
  },
  {
    id: 'nebnext-ultra-ii-fs-dna-e7805',
    documentId: 'SOP-NEB-E7805',
    version: '4.0',
    effectiveDate: '2026-02-12',
    title: 'NEBNext Ultra II FS DNA Library Prep Kit (Enzymatic Fragmentation) SOP',
    category: 'NGS Library Preparation & Sequencing',
    author: 'New England Biolabs (NEB) Next Generation Sequencing Division',
    reviewer: 'Dr. A. Sharma',
    companyKitInfo: {
      vendor: 'NEB',
      catalogNumber: 'E7805S / E7805L',
      officialDocUrl: 'https://www.neb.com/en/products/e7805-nebnext-ultra-ii-fs-dna-library-prep-kit-for-illumina',
      storageConditions: '-20°C',
      kitIncludes: ['NEBNext Ultra II FS Enzyme Mix', 'NEBNext Ultra II FS Reaction Buffer', 'NEBNext Ultra II Ligation Master Mix', 'NEBNext Ligation Enhancer', 'NEBNext Q5 Hot Start HiFi PCR Master Mix']
    },
    scope: 'Single-tube enzymatic DNA fragmentation, end repair, and A-tailing from 100 pg to 500 ng genomic DNA without mechanical shearing instrumentation for Illumina sequencing.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'FS Enzyme Mix', description: 'Endonuclease and polymerase blend.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Cold Block (4°C)', 'Thermal Cycler with Heated Lid (≥105°C)', 'Magnetic Separation Rack'],
    reagentsRequired: ['NEBNext Ultra II FS DNA Kit (Cat #E7805)', 'NEBNext Unique Dual Adaptors', 'AMPure XP Beads', 'Fresh 80% Ethanol'],
    steps: [
      { stepNumber: 1, title: 'Enzymatic Fragmentation & End Prep Assembly', instruction: 'On ice, combine 26 µL DNA sample (100 pg–500 ng in water or 0.1X TE), 7 µL Ultra II FS Reaction Buffer, and 2 µL Ultra II FS Enzyme Mix (35 µL total). Mix thoroughly by vortexing 5 sec. Immediately place in pre-chilled thermocycler: 37°C for 20 min (for ~300 bp insert), followed by 65°C for 30 min (enzyme inactivation). Hold at 4°C.', timingMinutes: 55, tempCelsius: 37, criticalCheckpoint: 'Assemble strictly on ice; fragmentation begins immediately upon enzyme addition at room temperature.' },
      { stepNumber: 2, title: 'Adaptor Ligation', instruction: 'Add directly to 35 µL FS reaction: 30 µL Ultra II Ligation Master Mix, 1 µL Ligation Enhancer, and 2.5 µL diluted NEBNext Adaptor. Mix thoroughly and incubate @ 20°C for 15 min with heated lid off.', timingMinutes: 15, tempCelsius: 20 },
      { stepNumber: 3, title: 'USER Cleavage & Bead Size Selection', instruction: 'Add 3 µL USER Enzyme, incubate @ 37°C for 15 min. Perform double-sided size selection using AMPure XP beads (0.4X / 0.2X ratio) to isolate 300–500 bp fragments. Elute in 17 µL 0.1X TE.', timingMinutes: 30, tempCelsius: 37 },
      { stepNumber: 4, title: 'PCR Amplification with NEBNext Q5', instruction: 'Combine 15 µL purified library with 25 µL NEBNext Q5 Master Mix, 5 µL i7 Index Primer, and 5 µL i5 Index Primer (50 µL total). Thermocycle: 98°C 30s; 4–9 cycles [98°C 10s, 65°C 75s]; 65°C 5 min. Clean with 0.9X beads and quantify on TapeStation.', timingMinutes: 45, tempCelsius: 98 }
    ],
    qualityControl: ['Electropherogram demonstrates uniform peak centered at 400 bp on TapeStation D1000 ScreenTape.'],
    troubleshooting: [{ issue: 'Over-fragmentation (library size <200 bp)', cause: 'DNA resuspended in pure water lacking EDTA or fragmentation time >30 min', solution: 'Ensure input DNA is in 0.1X TE (0.1 mM EDTA); reduce 37°C incubation to 12–15 min.' }],
    references: [{ citation: 'New England Biolabs. (2025). NEBNext Ultra II FS DNA Library Prep Kit Manual (E7805). NEB.', doiOrUrl: 'https://www.neb.com' }],
    revisionHistory: [{ version: '4.0', date: '2026-02-12', changes: 'Updated for low input 100 pg genomic DNA protocol.', author: 'NEB NGS Operations' }]
  },

  // --- LUCIGEN NUCLEIC ACID PURIFICATION ---
  {
    id: 'lucigen-masterpure-mc85200',
    documentId: 'SOP-LUC-MC85200',
    version: '3.1',
    effectiveDate: '2026-01-25',
    title: 'Lucigen MasterPure Complete DNA and RNA Purification Kit SOP',
    category: 'DNA Cleanup & Gel Extraction',
    author: 'LGC Biosearch Technologies / Lucigen Applications',
    reviewer: 'Dr. D. Patel',
    companyKitInfo: {
      vendor: 'Lucigen',
      catalogNumber: 'MC85200 / MCD85201',
      officialDocUrl: 'https://www.biosearchtech.com/products/reagents/nucleic-acid-purification/masterpure-complete-dna-and-rna-purification-kit',
      storageConditions: '15°C to 25°C (Proteinase K & RNase A at -20°C)',
      kitIncludes: ['2X Tissue and Cell Lysis Solution', 'MPC Protein Precipitation Reagent', 'Proteinase K (50 µg/µL)', 'RNase A (5 µg/µL)', 'TE Buffer']
    },
    scope: 'Column-free enzymatic and high-salt precipitation extraction of ultra-high-molecular-weight (>100 kb) genomic DNA or total RNA from tissues, cells, and bacterial pellets with zero shearing.',
    biosafetyLevel: 'BSL-1',
    hazards: [{ type: 'CHEMICAL', label: 'MPC Precipitation Reagent', description: 'Concentrated organic salt precipitating agent.' }],
    ppeRequirements: [{ item: 'Nitrile Gloves', required: true }, { item: 'Lab Coat', required: true }],
    equipmentRequired: ['Water Bath / Heat Block (65°C)', 'Microcentrifuge (≥16,000 x g)'],
    reagentsRequired: ['MasterPure Complete Kit (Cat #MC85200)', '100% Isopropanol', '70% Ethanol', 'Wide-Bore Pipette Tips'],
    steps: [
      { stepNumber: 1, title: 'Cell Lysis & Protein Digestion', instruction: 'Resuspend cell pellet (up to 5x10^6 cells) or 10 mg ground tissue in 300 µL Tissue & Cell Lysis Solution + 1 µL Proteinase K. Incubate @ 65°C for 15 min with periodic vortexing.', timingMinutes: 20, tempCelsius: 65 },
      { stepNumber: 2, title: 'MPC Protein Precipitation', instruction: 'Cool lysate on ice for 5 min. Add 175 µL MPC Protein Precipitation Reagent. Vortex vigorously for 10 sec. Centrifuge @ 16,000 x g for 10 min at 4°C to pellet cellular debris and proteins.', timingMinutes: 15, tempCelsius: 4 },
      { stepNumber: 3, title: 'DNA Precipitation & Gentle Resuspension', instruction: 'Carefully transfer clear supernatant to clean 1.5 mL tube using wide-bore pipette tip. Add 500 µL 100% isopropanol, invert 30 times until stringy DNA precipitate appears. Pellet DNA @ 16,000 x g for 10 min at 4°C. Wash pellet with 500 µL 70% Ethanol, air dry 5 min, resuspend in 50 µL TE Buffer.', timingMinutes: 30, tempCelsius: 4 }
    ],
    qualityControl: ['Spectrophotometric A260/A280 = 1.8–1.9; Intact high-MW band >100 kb on pulsed-field gel electrophoresis.'],
    troubleshooting: [{ issue: 'Difficulty dissolving DNA pellet', cause: 'Over-drying pellet (>10 min)', solution: 'Incubate resuspended DNA at 55°C for 30 min with gentle tapping.' }],
    references: [{ citation: 'LGC Biosearch Technologies. (2025). MasterPure Complete DNA and RNA Purification Kit Protocol.', doiOrUrl: 'https://www.biosearchtech.com' }],
    revisionHistory: [{ version: '3.1', date: '2026-01-25', changes: 'Standardized wide-bore pipetting for long-read sequencing applications.', author: 'LGC Applications' }]
  }
];

