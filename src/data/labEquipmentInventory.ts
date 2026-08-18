import { LabEquipmentItem } from '../types';

export const DEFAULT_LAB_EQUIPMENT_INVENTORY: LabEquipmentItem[] = [
  {
    id: 'eq-biorad-cfx96',
    name: 'Bio-Rad CFX96 Touch Real-Time PCR Detection System',
    category: 'THERMOCYCLER',
    manufacturer: 'Bio-Rad Laboratories',
    model: 'CFX96 Touch',
    location: 'Genomics Core - Bench A1',
    status: 'AVAILABLE',
    specifications: '96-well optical reaction block, 5-target multiplexing + FRET, Cq precision < 0.2 cycles, FAM/SYBR/HEX/Cy5 detection.'
  },
  {
    id: 'eq-abi-veriti-96',
    name: 'Applied Biosystems Veriti 96-Well Thermal Cycler',
    category: 'THERMOCYCLER',
    manufacturer: 'Thermo Fisher Scientific',
    model: 'Veriti 96-Well',
    location: 'PCR Suite - Bench B3',
    status: 'AVAILABLE',
    specifications: 'Standard 0.2 mL 96-well block, VeriFlex temperature zone control, heated lid up to 105°C.'
  },
  {
    id: 'eq-eppendorf-5424r',
    name: 'Eppendorf Microcentrifuge 5424R (Refrigerated)',
    category: 'CENTRIFUGE',
    manufacturer: 'Eppendorf',
    model: '5424R',
    location: 'Main Molecular Lab - Room 204',
    status: 'AVAILABLE',
    specifications: 'Max speed 21,130 x g (15,000 RPM), temp range -11°C to 40°C, 24 x 1.5/2.0 mL rotor with aerosol-tight lid.'
  },
  {
    id: 'eq-thermo-nanodrop-one',
    name: 'Thermo Scientific NanoDrop One Microvolume UV-Vis Spectrophotometer',
    category: 'SPECTROPHOTOMETER',
    manufacturer: 'Thermo Fisher Scientific',
    model: 'NanoDrop OneC',
    location: 'Sample QC Station - Bench C1',
    status: 'AVAILABLE',
    specifications: '1.0 µL sample volume, 190–850 nm spectrum, Acclaro sample intelligence algorithm for contaminant identification.'
  },
  {
    id: 'eq-qubit-4',
    name: 'Thermo Scientific Qubit 4 Fluorometer',
    category: 'FLUOROMETER',
    manufacturer: 'Thermo Fisher Scientific',
    model: 'Qubit 4',
    location: 'Sample QC Station - Bench C2',
    status: 'AVAILABLE',
    specifications: 'High-sensitivity DNA, RNA, protein fluorometric quantification, 1.0–20 µL sample size using dye assays.'
  },
  {
    id: 'eq-agilent-tapestation-4200',
    name: 'Agilent 4200 TapeStation System',
    category: 'ELECTROPHORESIS',
    manufacturer: 'Agilent Technologies',
    model: '4200 TapeStation',
    location: 'NGS Core - Room 208',
    status: 'AVAILABLE',
    specifications: 'Automated capillary electrophoresis for RNA/DNA sizing & RIN/DIN calculation, 1 to 96 samples per run.'
  },
  {
    id: 'eq-10x-chromium-controller',
    name: '10x Genomics Chromium Controller',
    category: 'MICROFLUIDICS',
    manufacturer: '10x Genomics',
    model: 'Chromium Controller',
    location: 'Single-Cell Suite - Room 210',
    status: 'MAINTENANCE',
    specifications: 'Microfluidic single-cell partitioner for Next GEM chips, up to 8 channels, 10,000 cells/channel.'
  },
  {
    id: 'eq-magnetic-rack-96',
    name: 'DynaMag-96 Side Magnet (Magnetic Separation Rack)',
    category: 'MAGNETIC_RACK',
    manufacturer: 'Thermo Fisher Scientific',
    model: 'DynaMag-96 Side',
    location: 'NGS Prep Bench A2',
    status: 'AVAILABLE',
    specifications: 'High-energy neodymium magnet for 96-well PCR plates and SPRI bead cleanup.'
  },
  {
    id: 'eq-eppendorf-thermomixer-c',
    name: 'Eppendorf ThermoMixer C with SmartBlock',
    category: 'SHAKER_INCUBATOR',
    manufacturer: 'Eppendorf',
    model: 'ThermoMixer C',
    location: 'Main Molecular Lab - Bench B1',
    status: 'AVAILABLE',
    specifications: 'Temp range -15°C relative to ambient to 100°C, mixing speed 300 to 3,000 RPM, interchangeable blocks.'
  },
  {
    id: 'eq-countess-iii-fl',
    name: 'Countess III FL Automated Cell Counter',
    category: 'CELL_COUNTER',
    manufacturer: 'Thermo Fisher Scientific',
    model: 'Countess III FL',
    location: 'Cell Culture Core - Room 102',
    status: 'AVAILABLE',
    specifications: 'Dual fluorescent channels + brightfield, automated focus and lighting, viability assessment via AO/PI or Trypan Blue.'
  },
  {
    id: 'eq-biorad-geldoc-ez',
    name: 'Bio-Rad Gel Doc EZ System',
    category: 'ELECTROPHORESIS',
    manufacturer: 'Bio-Rad Laboratories',
    model: 'Gel Doc EZ',
    location: 'Darkroom / Imaging Bay',
    status: 'AVAILABLE',
    specifications: 'Compact automated gel imaging with UV/Blue/Stain-Free trays for agarose gel quantification.'
  },
  {
    id: 'eq-rainin-xls-8ch-20',
    name: 'Rainin Pipet-Lite XLS+ 8-Channel Pipette (2–20 µL)',
    category: 'LIQUID_HANDLING',
    manufacturer: 'Mettler Toledo / Rainin',
    model: 'L8-20XLS+',
    location: 'Molecular Core - Bench A3',
    status: 'AVAILABLE',
    specifications: '8-channel multi-channel pipette for 96-well column pipetting (0.2–20 µL), LTS LiteTouch tip ejection, magnetic assist.'
  },
  {
    id: 'eq-rainin-xls-8ch-200',
    name: 'Rainin Pipet-Lite XLS+ 8-Channel Pipette (20–200 µL)',
    category: 'LIQUID_HANDLING',
    manufacturer: 'Mettler Toledo / Rainin',
    model: 'L8-200XLS+',
    location: 'Molecular Core - Bench A3',
    status: 'AVAILABLE',
    specifications: '8-channel multi-channel pipette for rapid master mix and sample addition across 96-well columns (20–200 µL).'
  },
  {
    id: 'eq-rainin-xls-8ch-10',
    name: 'Rainin Pipet-Lite XLS+ 8-Channel Pipette (0.5–10 µL)',
    category: 'LIQUID_HANDLING',
    manufacturer: 'Mettler Toledo / Rainin',
    model: 'L8-10XLS+',
    location: 'Molecular Core - Bench A3',
    status: 'AVAILABLE',
    specifications: 'Low-volume 8-channel multi-channel pipette (0.5–10 µL) for high-precision cDNA/DNA template & enzyme dispensing.'
  },
  {
    id: 'eq-rainin-xls-12ch-200',
    name: 'Rainin Pipet-Lite XLS+ 12-Channel Pipette (20–200 µL)',
    category: 'LIQUID_HANDLING',
    manufacturer: 'Mettler Toledo / Rainin',
    model: 'L12-200XLS+',
    location: 'Molecular Core - Bench A4',
    status: 'AVAILABLE',
    specifications: '12-channel multi-channel pipette for row-wise additions (Rows A–H, 12 channels simultaneously).'
  },
  {
    id: 'eq-single-pipette-set',
    name: 'Rainin Pipet-Lite XLS+ Calibrated Pipette Set (P2, P10, P20, P200, P1000)',
    category: 'LIQUID_HANDLING',
    manufacturer: 'Mettler Toledo / Rainin',
    model: 'Pipet-Lite XLS+ Set',
    location: 'All Molecular Benches',
    status: 'AVAILABLE',
    specifications: 'ISO 8655 certified single-channel pipettes: 0.1–2 µL, 0.5–10 µL, 2–20 µL, 20–200 µL, 100–1000 µL.'
  },
  {
    id: 'eq-covaris-me220',
    name: 'Covaris ME220 Focused-ultrasonicator (DNA Shearing)',
    category: 'MICROFLUIDICS',
    manufacturer: 'Covaris LLC',
    model: 'ME220',
    location: 'Genomics / NGS Core - Room 206',
    status: 'AVAILABLE',
    specifications: 'Acoustic AFA DNA & Chromatin shearing (150–5000 bp), integrated wave guide, temperature-controlled water bath (4–7°C), microTUBE / 8-strip support.'
  },
  {
    id: 'eq-plate-fuge',
    name: 'Benchmark Scientific PlateFuge Microplate Centrifuge',
    category: 'CENTRIFUGE',
    manufacturer: 'Benchmark Scientific',
    model: 'PlateFuge C2000',
    location: 'PCR Suite - Bench B1',
    status: 'AVAILABLE',
    specifications: 'Quick-spin microplate centrifuge for 96-well / 384-well skirted & non-skirted PCR plates, 2,550 RPM (600 x g).'
  },
  {
    id: 'eq-speedvac-dna130',
    name: 'Thermo Scientific Savant DNA SpeedVac Concentrator',
    category: 'SHAKER_INCUBATOR',
    manufacturer: 'Thermo Fisher Scientific',
    model: 'DNA130 SpeedVac',
    location: 'Sample Prep Core - Room 205',
    status: 'AVAILABLE',
    specifications: 'Integrated vacuum concentrator for DNA/RNA sample pelleting and volume normalization down to target microliters.'
  },
  {
    id: 'eq-bsc-class2-type-a2',
    name: 'Class II Type A2 Biological Safety Cabinet',
    category: 'SAFETY_HOOD',
    manufacturer: 'Thermo Scientific / Labconco',
    model: 'Purifier CellGard',
    location: 'BSL-2 Suite - Room 212',
    status: 'AVAILABLE',
    specifications: 'HEPA filtered vertical laminar airflow, 70% recirculated / 30% exhausted, sash sensor.'
  }
];
