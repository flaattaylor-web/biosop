import { SopDocument, HazardType, BioSafetyLevel } from '../types';

/**
 * Vendor-agnostic bench protocols, so the library is not only kit SOPs.
 *
 * These are standard methods — the ones a new starter is handed on day one — written at the level
 * of detail a competent bench scientist needs and no further. They are reference material, not
 * generated content: nothing here came out of a model, and each carries the source it follows.
 *
 * Every protocol is still subject to the same consistency check as a generated one. A qualified
 * scientist must review and adapt any of these to their own cells, agents and institutional rules
 * before use — cell lines differ, and biosafety classification is a local determination.
 */

interface ProtocolSeed {
  id: string;
  documentId: string;
  title: string;
  category: string;
  bsl?: BioSafetyLevel;
  scope: string;
  hazards?: [HazardType, string, string][];
  ppe?: [string, string][];
  equipment: string[];
  reagents: string[];
  steps: [string, string, number?, number?][];
  qc: string[];
  trouble: [string, string, string][];
  refs: [string, string?][];
}

const DEFAULT_PPE: [string, string][] = [
  ['Nitrile gloves', 'Change on contamination and between sample sets.'],
  ['Laboratory coat', 'Fastened; dedicated coat for tissue culture areas.'],
  ['Safety glasses', 'Required whenever solvents, fixatives or pressurised vessels are handled.'],
];

function build(p: ProtocolSeed): SopDocument {
  return {
    id: p.id,
    documentId: p.documentId,
    version: '1.0',
    effectiveDate: '2026-08-19',
    title: p.title,
    category: p.category,
    author: 'Reference method — transcribed from published standard practice',
    reviewer: 'Requires local review before use',
    scope: p.scope,
    biosafetyLevel: p.bsl || 'BSL-1',
    hazards: (p.hazards || []).map(([type, label, description]) => ({ type, label, description })),
    ppeRequirements: (p.ppe || DEFAULT_PPE).map(([item, notes]) => ({ item, required: true, notes })),
    equipmentRequired: p.equipment,
    reagentsRequired: p.reagents,
    steps: p.steps.map(([title, instruction, timingMinutes, tempCelsius], i) => ({
      stepNumber: i + 1,
      title,
      instruction,
      ...(timingMinutes !== undefined ? { timingMinutes } : {}),
      ...(tempCelsius !== undefined ? { tempCelsius } : {}),
    })),
    qualityControl: p.qc,
    troubleshooting: p.trouble.map(([issue, cause, solution]) => ({ issue, cause, solution })),
    references: p.refs.map(([citation, doiOrUrl]) => ({ citation, ...(doiOrUrl ? { doiOrUrl } : {}) })),
    revisionHistory: [{ version: '1.0', date: '2026-08-19', changes: 'Initial import of the reference method.', author: 'Library import' }],
  };
}

const BIO_HAZ: [HazardType, string, string] = ['BIOHAZARD', 'Biological material', 'Handle in a certified biological safety cabinet; decontaminate all waste before disposal.'];
const FLAM: [HazardType, string, string] = ['FLAMMABLE', 'Flammable solvent', 'Keep away from ignition sources; use in a ventilated area.'];

export const BIOLOGY_PROTOCOLS: SopDocument[] = [
  // ------------------------------------------------------------------ virology
  build({
    id: 'bio-tcid50', documentId: 'SOP-VIR-001', category: 'Virology', bsl: 'BSL-2',
    title: 'TCID50 Endpoint Dilution Assay for Viral Titre (Reed-Muench)',
    scope: 'Determines infectious titre as the dilution at which 50% of inoculated wells show cytopathic effect. Suitable for viruses that produce CPE but do not form countable plaques.',
    hazards: [BIO_HAZ, ['TOXIC', 'Fixative and stain', 'Formaldehyde and crystal violet are toxic and staining; handle in a fume hood.']],
    equipment: ['Class II biological safety cabinet', 'CO2 incubator (37 °C, 5% CO2)', 'Inverted phase-contrast microscope', 'Multichannel pipette (20-200 µL)', '96-well flat-bottom tissue culture plates'],
    reagents: ['Susceptible cell line (e.g. Vero E6, MDCK)', 'Complete growth medium', 'Infection medium (serum-reduced, ± trypsin as the virus requires)', 'Virus stock', 'PBS'],
    steps: [
      ['Seed the assay plate', 'Seed 1-2 x 10^4 cells per well in 100 µL complete medium across a 96-well plate. Incubate overnight at 37 °C, 5% CO2 to reach 80-90% confluence. Reserve at least one column for uninfected cell controls.', 1440, 37],
      ['Prepare serial dilutions', 'In a separate plate or tubes, prepare ten-fold serial dilutions of the virus stock in infection medium, typically 10^-1 to 10^-8. Change tips between every dilution — carryover is the dominant source of titre error.', 30, 22],
      ['Inoculate', 'Remove growth medium and wash the monolayer once with PBS. Add 100 µL of each dilution to 8 (or 4) replicate wells per dilution. Leave the control wells with medium only. Incubate at 37 °C, 5% CO2.', 30, 37],
      ['Incubate and score CPE', 'Incubate for the period established for the virus and cell system, typically 3-7 days. Examine each well by microscopy and score it positive or negative for cytopathic effect. Score blind to the dilution layout where practical.', 7200, 37],
      ['Optional fix and stain', 'For an unambiguous endpoint, fix with 4% formaldehyde for 20 min, then stain with 0.1% crystal violet for 10 min and rinse. Wells lacking an intact monolayer are positive.', 45, 22],
      ['Calculate the titre', 'Compute TCID50/mL by the Reed-Muench or Spearman-Karber method from the proportion of positive wells at each dilution. Report the dilution factor and the volume inoculated alongside the titre.', 20, 22],
    ],
    qc: ['Uninfected control wells must show an intact monolayer at the time of scoring.', 'A reference virus stock of known titre should fall within the laboratory-established range.', 'Discard the run if the 50% endpoint falls outside the dilution series — repeat with a shifted range.'],
    trouble: [
      ['CPE in the cell control wells', 'Cross-contamination during inoculation, or the cells were already infected (mycoplasma, adventitious virus).', 'Change tips between every dilution and inoculate control wells first. Screen the cell bank for mycoplasma.'],
      ['All wells positive or all negative', 'Dilution series does not span the endpoint.', 'Extend the series in the appropriate direction and repeat.'],
      ['Titre drifts between operators', 'Subjective CPE scoring, or inconsistent cell density at inoculation.', 'Fix and stain to harden the endpoint; standardise the seeding density and confluence window.'],
    ],
    refs: [['Reed LJ, Muench H. A simple method of estimating fifty per cent endpoints. American Journal of Hygiene. 1938;27(3):493-497.', 'https://doi.org/10.1093/oxfordjournals.aje.a118408']],
  }),
  build({
    id: 'bio-plaque', documentId: 'SOP-VIR-002', category: 'Virology', bsl: 'BSL-2',
    title: 'Plaque Assay for Infectious Virus Quantification',
    scope: 'Counts individual infectious particles as plaques under a semi-solid overlay, giving titre in plaque-forming units per millilitre. The reference method where the virus forms discrete plaques.',
    hazards: [BIO_HAZ, ['TOXIC', 'Crystal violet', 'Stains skin and clothing; contains methanol in some formulations.']],
    equipment: ['Class II biological safety cabinet', 'CO2 incubator', '6-well or 12-well tissue culture plates', 'Water bath at 42 °C for the overlay', 'Plate rocker'],
    reagents: ['Susceptible cell monolayer', 'Growth medium', '2x overlay medium', 'Agarose (low melting point) or carboxymethylcellulose', 'Virus stock', '4% formaldehyde', '0.1% crystal violet'],
    steps: [
      ['Seed monolayers', 'Seed cells to reach a confluent monolayer on the day of infection — typically 5 x 10^5 cells per well in a 6-well plate. Confluence must be even; a patchy monolayer gives unusable plaques.', 1440, 37],
      ['Serial dilution', 'Prepare ten-fold serial dilutions of the virus in serum-free medium. Aim for 20-100 plaques per well in the countable dilution.', 20, 22],
      ['Adsorb', 'Remove medium, add 200-500 µL of each dilution per well, and rock every 10-15 min for 1 h at 37 °C so the inoculum does not dry the centre of the well.', 60, 37],
      ['Apply the overlay', 'Prepare the overlay by mixing equal volumes of 2x medium and molten agarose equilibrated to 42 °C. Remove the inoculum and add 2-3 mL per well. Let it set at room temperature before returning the plates to the incubator, inverted if using agarose.', 30, 42],
      ['Incubate', 'Incubate 2-5 days depending on the virus, without disturbing the plates. Do not refeed unless the method requires a second overlay.', 4320, 37],
      ['Fix, stain and count', 'Fix through the overlay with 4% formaldehyde for at least 1 h, remove the overlay plug, then stain with 0.1% crystal violet for 10 min and rinse. Count plaques in wells with 20-100 plaques and calculate PFU/mL.', 90, 22],
    ],
    qc: ['Uninfected wells must show a complete unstained-free monolayer with no plaques.', 'Only wells with 20-100 plaques are used for the calculation.', 'Plaque morphology should be consistent with the virus stock on record.'],
    trouble: [
      ['Monolayer lifts during staining', 'Overlay removed too vigorously, or fixation too short.', 'Fix for at least 1 h before removing the plug, and rinse gently from the well edge.'],
      ['Comet-shaped or merged plaques', 'Overlay too fluid, or plates disturbed during incubation.', 'Increase agarose concentration slightly and leave plates undisturbed.'],
      ['No plaques at any dilution', 'Overlay too hot when applied, killing the monolayer, or an inactive virus stock.', 'Equilibrate the overlay to 42 °C and check the stock against a reference titration.'],
    ],
    refs: [['Baer A, Kehn-Hall K. Viral concentration determination through plaque assays. Journal of Visualized Experiments. 2014;(93):e52065.', 'https://doi.org/10.3791/52065']],
  }),
  build({
    id: 'bio-neutralisation', documentId: 'SOP-VIR-003', category: 'Virology', bsl: 'BSL-2',
    title: 'Virus Neutralisation Assay for Serum Antibody Titre',
    scope: 'Measures the serum dilution that reduces viral infectivity by a defined percentage, reported as a 50% neutralising titre. Applies to both plaque-reduction and CPE-based readouts.',
    hazards: [BIO_HAZ, ['BIOHAZARD', 'Human or animal serum', 'Treat all sera as potentially infectious; handle at the containment level of the source material.']],
    equipment: ['Class II biological safety cabinet', 'CO2 incubator', '96-well plates', 'Multichannel pipette', 'Inverted microscope or plate reader'],
    reagents: ['Heat-inactivated test sera', 'Reference positive and negative sera', 'Virus stock of known titre', 'Susceptible cells', 'Infection medium'],
    steps: [
      ['Heat-inactivate sera', 'Incubate sera at 56 °C for 30 min to destroy complement, which otherwise contributes non-specific virus inactivation.', 30, 56],
      ['Titrate the sera', 'Prepare two-fold serial dilutions of each serum in infection medium across the plate, typically from 1:10 to 1:1280, in duplicate or triplicate.', 40, 22],
      ['Add virus', 'Add an equal volume of virus diluted to a fixed challenge dose — commonly 100 TCID50 or 100 PFU per well. Note that this halves every serum dilution; report final dilutions.', 20, 22],
      ['Neutralise', 'Incubate the serum-virus mixtures for 1 h at 37 °C to allow antibody binding before the cells see the virus.', 60, 37],
      ['Infect and incubate', 'Transfer the mixtures onto washed monolayers and incubate for the period established for the system. Include virus-only wells, cell-only wells and a back-titration of the challenge dose.', 4320, 37],
      ['Read and calculate', 'Score CPE or count plaques and determine the dilution giving 50% neutralisation by interpolation. Report the final serum dilution, the challenge dose and the readout used.', 40, 22],
    ],
    qc: ['The back-titration must confirm the challenge dose within roughly half a log of target — otherwise the titre is not comparable between runs.', 'The reference positive serum must fall within its established range.', 'Negative serum must show no neutralisation at the lowest dilution.'],
    trouble: [
      ['Reference serum titre drifts run to run', 'Challenge dose varied; this is the commonest cause of poor reproducibility.', 'Back-titrate on every plate and normalise or repeat when the dose is off target.'],
      ['Toxicity at low serum dilutions', 'Serum components damaging the monolayer, mistaken for neutralisation.', 'Include serum-only wells without virus at each dilution and exclude toxic dilutions from the fit.'],
      ['Titres cluster at the assay floor', 'Starting dilution too high.', 'Extend the series downward, respecting the toxicity limit determined above.'],
    ],
    refs: [['World Health Organization. Manual for the laboratory diagnosis and virological surveillance of infectious diseases. WHO Press.', 'https://www.who.int/publications']],
  }),
  build({
    id: 'bio-viral-rna', documentId: 'SOP-VIR-004', category: 'Virology', bsl: 'BSL-2',
    title: 'Viral RNA Extraction from Clinical Specimens by Silica Column',
    scope: 'Recovers viral RNA from swabs, plasma or respiratory specimens using a chaotropic lysis and silica membrane binding, suitable for downstream RT-qPCR or sequencing.',
    hazards: [BIO_HAZ, ['TOXIC', 'Guanidinium salts', 'Lysis buffer is toxic and forms reactive compounds with bleach. Never decontaminate guanidinium waste with hypochlorite.'], FLAM],
    equipment: ['Class II biological safety cabinet', 'Microcentrifuge (up to 20,000 x g)', 'Vortex mixer', 'Dedicated pre- and post-extraction work areas', 'Filter pipette tips'],
    reagents: ['Guanidinium-based lysis buffer with carrier RNA', 'Wash buffers 1 and 2', 'Absolute ethanol', 'Nuclease-free elution buffer', 'Proteinase K', 'Extraction control (internal or external)'],
    steps: [
      ['Lyse the specimen', 'Add 140-200 µL specimen to lysis buffer containing carrier RNA and proteinase K in the ratio the column requires. Vortex and incubate to complete lysis and inactivate the specimen before it leaves containment.', 15, 56],
      ['Add ethanol and bind', 'Add absolute ethanol, mix thoroughly, and transfer the lysate to the silica column. Centrifuge and discard the flow-through. Load in two aliquots if the volume exceeds the reservoir.', 10, 22],
      ['Wash', 'Wash with the guanidinium-containing wash buffer, then with the ethanol-containing wash buffer, discarding the flow-through each time.', 10, 22],
      ['Dry the membrane', 'Centrifuge the empty column at full speed for 1-2 min to remove residual ethanol. Carryover ethanol is the most common cause of downstream inhibition.', 3, 22],
      ['Elute', 'Transfer the column to a clean tube, add 50-60 µL elution buffer to the centre of the membrane, stand for 1 min and centrifuge. Keep the eluate on ice and freeze at -80 °C if not used the same day.', 5, 22],
    ],
    qc: ['Run an extraction blank with every batch to detect cross-contamination.', 'The internal or external extraction control must amplify within its expected range, otherwise the specimen result is void.', 'A260/A280 is not informative at these concentrations; judge success by control amplification.'],
    trouble: [
      ['Late or absent internal control', 'Ethanol carryover or insufficient drying.', 'Extend the dry spin and take care not to touch the column tip to the flow-through.'],
      ['Cross-contamination between specimens', 'Aerosol from vigorous vortexing or shared surfaces.', 'Spin plates and tubes before opening, use filter tips, and keep pre- and post-extraction areas separate.'],
      ['Low yield from swabs', 'Insufficient elution from the swab matrix.', 'Vortex the swab in transport medium and use the largest specimen input the column supports.'],
    ],
    refs: [['Boom R, Sol CJ, Salimans MM, et al. Rapid and simple method for purification of nucleic acids. Journal of Clinical Microbiology. 1990;28(3):495-503.', 'https://doi.org/10.1128/jcm.28.3.495-503.1990']],
  }),

  // ------------------------------------------------------------------ cell culture
  build({
    id: 'bio-thaw-cells', documentId: 'SOP-CC-001', category: 'Cell Culture',
    title: 'Thawing Cryopreserved Mammalian Cells',
    scope: 'Recovers a cryovial of adherent or suspension cells into culture with maximum viability. Speed matters: DMSO is toxic above 4 °C and every minute in a thawing vial costs viable cells.',
    hazards: [BIO_HAZ, ['CHEMICAL', 'DMSO', 'Readily crosses skin and carries dissolved solutes with it. Wear gloves and avoid contact.'], ['SHARPS', 'Cryovial rupture', 'Vials stored in liquid phase can explode on warming. Use a face shield and thaw in a sealed bag or a dedicated thawing device.']],
    equipment: ['Class II biological safety cabinet', 'Water bath or bead bath at 37 °C', 'Centrifuge with swing-out rotor', 'CO2 incubator', 'Inverted microscope'],
    reagents: ['Cryovial of cells', 'Pre-warmed complete growth medium', '70% ethanol'],
    steps: [
      ['Prepare before retrieving the vial', 'Warm medium to 37 °C and place 9 mL in a sterile tube. Label the flask. Everything must be ready before the vial leaves the freezer.', 10, 37],
      ['Thaw rapidly', 'Retrieve the vial and swirl it in the 37 °C bath until only a small ice crystal remains — typically 60-90 s. Do not let it warm fully; the residual ice keeps the suspension cold.', 2, 37],
      ['Dilute out the DMSO', 'Decontaminate the vial exterior with 70% ethanol, then add the contents dropwise into the 9 mL of warm medium, swirling gently. Adding medium to the vial instead subjects the cells to an osmotic shock.', 3, 37],
      ['Remove the cryoprotectant', 'Centrifuge at 200-300 x g for 5 min, aspirate the supernatant completely and resuspend the pellet gently in fresh medium.', 8, 22],
      ['Seed and recover', 'Seed into an appropriately sized vessel and incubate. Change the medium after 16-24 h to remove residual DMSO and non-viable cells.', 1440, 37],
    ],
    qc: ['Record post-thaw viability by trypan blue; below 70% suggests a problem with the freeze or the storage chain.', 'Confirm expected morphology and attachment at 24 h.', 'Do not use cells for experiments until they have recovered for at least one passage.'],
    trouble: [
      ['Poor attachment at 24 h', 'DMSO carryover, or the cells were held too long between thaw and dilution.', 'Complete the thaw-to-dilution sequence within three minutes and always spin out the freezing medium.'],
      ['Viability below 50%', 'Slow thaw, or a storage excursion above -130 °C.', 'Thaw rapidly and audit the freezer temperature log for the vial in question.'],
      ['Contamination appears within days', 'Non-sterile vial exterior carried into the cabinet.', 'Wipe the vial with 70% ethanol before it enters the cabinet and after removing from the bath.'],
    ],
    refs: [['Freshney RI. Culture of Animal Cells: A Manual of Basic Technique and Specialized Applications. 8th ed. Wiley; 2021.', 'https://doi.org/10.1002/9781119513001']],
  }),
  build({
    id: 'bio-passage-cells', documentId: 'SOP-CC-002', category: 'Cell Culture',
    title: 'Subculturing Adherent Cells by Trypsinisation',
    scope: 'Routine passage of adherent monolayers before they reach confluence, preserving growth characteristics and preventing the drift that comes from repeated overgrowth.',
    hazards: [BIO_HAZ, ['CHEMICAL', 'Trypsin-EDTA', 'Proteolytic; avoid skin and eye contact and do not over-expose cells.']],
    equipment: ['Class II biological safety cabinet', 'CO2 incubator', 'Inverted microscope', 'Centrifuge', 'Haemocytometer or automated cell counter'],
    reagents: ['Complete growth medium', 'Ca/Mg-free PBS', '0.05% or 0.25% trypsin-EDTA', 'Trypan blue'],
    steps: [
      ['Assess the culture', 'Examine the monolayer. Passage at 70-90% confluence — the exact window is line-specific. Overgrown cultures lose their growth characteristics and recover unevenly.', 5, 22],
      ['Wash out serum', 'Aspirate the medium and rinse the monolayer with Ca/Mg-free PBS. Residual serum inhibits trypsin and is the usual reason cells refuse to detach.', 3, 22],
      ['Detach', 'Add just enough trypsin-EDTA to cover the surface and incubate at 37 °C for 2-5 min. Watch by microscope and stop as soon as the cells round up and detach; prolonged exposure damages surface proteins.', 5, 37],
      ['Neutralise', 'Add at least twice the trypsin volume of serum-containing medium and disperse the cells by gentle pipetting. For serum-free systems use a defined trypsin inhibitor.', 3, 22],
      ['Count and reseed', 'Count viable cells and seed at the split ratio or density established for the line. Record the passage number on the flask — provenance is part of the result.', 15, 37],
    ],
    qc: ['Viability above 90% for a healthy routine culture.', 'Record passage number on every vessel and retire lines at the passage limit set for the line.', 'Morphology consistent with the reference image for the line.'],
    trouble: [
      ['Cells will not detach', 'Serum carryover, or exhausted trypsin.', 'Wash thoroughly with Ca/Mg-free PBS and use freshly thawed trypsin aliquots.'],
      ['Clumping after neutralisation', 'Over-trypsinisation releasing DNA, or too-vigorous pipetting.', 'Shorten the trypsin step; add DNase if clumping persists.'],
      ['Growth rate slows over passages', 'Line drift from repeated overgrowth, or approaching senescence.', 'Return to an early-passage vial from the master bank and keep to the confluence window.'],
    ],
    refs: [['Freshney RI. Culture of Animal Cells: A Manual of Basic Technique and Specialized Applications. 8th ed. Wiley; 2021.', 'https://doi.org/10.1002/9781119513001']],
  }),
  build({
    id: 'bio-cryopreserve', documentId: 'SOP-CC-003', category: 'Cell Culture',
    title: 'Cryopreservation of Mammalian Cell Lines',
    scope: 'Banks cells in liquid nitrogen vapour phase with a controlled-rate freeze, so that a recovered vial behaves like the culture that went in.',
    hazards: [BIO_HAZ, ['CHEMICAL', 'DMSO', 'Absorbed through skin; prepare freezing medium in a fume hood or cabinet and wear gloves.'], ['TOXIC', 'Liquid nitrogen', 'Asphyxiation and cold-burn risk. Use a face shield, cryo gloves and an oxygen-depletion-monitored room.']],
    equipment: ['Class II biological safety cabinet', 'Controlled-rate freezing container or programmable freezer', '-80 °C freezer', 'Liquid nitrogen storage dewar', 'Centrifuge'],
    reagents: ['Cells in exponential growth', 'Complete growth medium', 'DMSO (cell culture grade)', 'Cryovials rated for vapour-phase storage'],
    steps: [
      ['Harvest in exponential phase', 'Passage the culture 24-48 h before freezing and harvest at 70-80% confluence. Cells frozen from a confluent or stressed culture recover poorly.', 30, 37],
      ['Count and pellet', 'Count viable cells; proceed only above 90% viability. Centrifuge at 200-300 x g for 5 min and aspirate the supernatant completely.', 15, 22],
      ['Resuspend in freezing medium', 'Resuspend at 1-5 x 10^6 cells/mL in freezing medium — commonly 90% serum or complete medium with 10% DMSO, prepared fresh and chilled. Work quickly once DMSO contacts the cells.', 5, 4],
      ['Aliquot and freeze at a controlled rate', 'Dispense 1 mL per cryovial, transfer to a controlled-rate container and place at -80 °C. The target is approximately -1 °C per minute.', 240, -80],
      ['Transfer to vapour phase', 'After 4-24 h at -80 °C, transfer the vials to liquid nitrogen vapour phase. Record the position, passage number and date in the bank inventory before you close the dewar.', 20, -150],
      ['Verify the bank', 'Thaw one vial after at least 24 h and confirm viability and growth. A bank that has never been test-thawed is an assumption, not a bank.', 1440, 37],
    ],
    qc: ['Pre-freeze viability above 90%.', 'Test-thaw one vial per bank and record post-thaw viability and recovery time.', 'Mycoplasma screen the culture before banking.'],
    trouble: [
      ['Poor recovery from the whole bank', 'Freezing medium prepared warm, or cells held in DMSO too long before freezing.', 'Chill the freezing medium and complete aliquoting within 10 min.'],
      ['Variable recovery between vials', 'Uneven cooling in the freezing container, or vials moved between temperature zones.', 'Fill the container to capacity as specified and avoid transient warming during transfer.'],
      ['Vial cracks or floods on retrieval', 'Storage in liquid phase rather than vapour phase.', 'Store in vapour phase; liquid nitrogen entering a vial expands violently on warming.'],
    ],
    refs: [['Freshney RI. Culture of Animal Cells. 8th ed. Wiley; 2021.', 'https://doi.org/10.1002/9781119513001'], ['Coriell Institute. Cell culture cryopreservation best practice.', 'https://www.coriell.org']],
  }),
  build({
    id: 'bio-trypan', documentId: 'SOP-CC-004', category: 'Cell Culture',
    title: 'Cell Counting and Viability by Trypan Blue Exclusion',
    scope: 'Determines total and viable cell concentration on a haemocytometer. The exclusion principle is simple: intact membranes keep the dye out, so blue cells are dead cells.',
    hazards: [['TOXIC', 'Trypan blue', 'A suspected carcinogen. Wear gloves and dispose of as chemical waste.']],
    equipment: ['Haemocytometer and coverslip, or an automated counter', 'Inverted or upright microscope', 'Hand tally counter'],
    reagents: ['0.4% trypan blue solution', 'Single-cell suspension', 'PBS for dilution'],
    steps: [
      ['Prepare a single-cell suspension', 'Ensure the suspension is free of clumps — a clumped suspension cannot be counted accurately no matter how carefully the squares are scored.', 3, 22],
      ['Stain', 'Mix the suspension 1:1 with 0.4% trypan blue and count within 3-5 min. Trypan blue is itself toxic; leaving cells in it inflates the dead fraction.', 5, 22],
      ['Load the chamber', 'Apply 10 µL to the edge of the coverslip and let capillary action fill the chamber. Do not overfill or force liquid in; both change the depth and therefore the count.', 2, 22],
      ['Count', 'Count viable (unstained) and dead (blue) cells in the four corner 1 mm squares. Apply a consistent boundary rule — count cells touching the top and left lines, not the bottom and right. Aim for 20-50 cells per square.', 10, 22],
      ['Calculate', 'Cells/mL = mean count per square x dilution factor x 10^4. Report viability as viable cells divided by total cells.', 5, 22],
    ],
    qc: ['20-50 cells per counting square; dilute or concentrate the sample to reach this range.', 'Count duplicate chambers and repeat if they disagree by more than 10%.', 'Viability below 80% in a routine culture warrants investigation before use.'],
    trouble: [
      ['Counts vary widely between squares', 'Suspension not mixed, or clumps present.', 'Resuspend immediately before loading and disperse clumps by gentle pipetting.'],
      ['Everything looks blue', 'Cells left in trypan blue too long, or a genuinely poor sample.', 'Count within 5 min of staining and check against an unstained aliquot.'],
      ['Debris counted as cells', 'Excess cell death or carryover of matrix.', 'Judge by size and refractility; wash the suspension before counting if debris is heavy.'],
    ],
    refs: [['Strober W. Trypan blue exclusion test of cell viability. Current Protocols in Immunology. 2015;111:A3.B.1-3.', 'https://doi.org/10.1002/0471142735.ima03bs111']],
  }),
  build({
    id: 'bio-mycoplasma', documentId: 'SOP-CC-005', category: 'Cell Culture',
    title: 'Mycoplasma Screening of Cell Cultures by PCR',
    scope: 'Detects mycoplasma contamination in culture supernatant by PCR against conserved 16S rRNA regions. Mycoplasma is invisible by light microscopy and alters cell physiology profoundly, so screening is routine rather than diagnostic.',
    hazards: [BIO_HAZ, ['MUTAGEN', 'Nucleic acid stain', 'Intercalating gel stains are mutagenic; use a designated area and dispose of gels as hazardous waste.']],
    equipment: ['Thermal cycler', 'Gel electrophoresis apparatus and imager, or a qPCR instrument', 'Microcentrifuge', 'Separate pre- and post-PCR areas'],
    reagents: ['Culture supernatant from cells at high density, antibiotic-free for at least three passages', 'Mycoplasma primer set (16S rRNA consensus)', 'PCR master mix', 'Positive control DNA', 'Nuclease-free water'],
    steps: [
      ['Prepare the sample correctly', 'Take supernatant from a culture grown to high density without antibiotics for at least three passages. Antibiotics suppress mycoplasma below the detection limit without eliminating it, which produces false negatives.', 10, 22],
      ['Clarify and lyse', 'Centrifuge the supernatant at 200 x g to remove cells, then pellet mycoplasma from the supernatant at high speed or heat the supernatant at 95 °C for 5 min to release template.', 15, 95],
      ['Amplify', 'Set up reactions with the consensus primer set, including a positive control, a no-template control, and a negative culture control. Cycle per the primer set specification.', 90, 94],
      ['Analyse', 'Resolve products on a 2% agarose gel or read the qPCR curves. A product of the expected size in the sample lane indicates contamination.', 30, 22],
      ['Act on a positive', 'Quarantine the culture immediately, discard it if a clean early-passage vial exists, and screen every culture handled in the same cabinet and incubator.', 30, 22],
    ],
    qc: ['Positive control must amplify and the no-template control must not.', 'Screen every new line on arrival, every bank before freezing, and all lines on a routine cycle.', 'A negative result on an antibiotic-treated culture is not evidence of absence.'],
    trouble: [
      ['Everything positive including controls', 'Amplicon contamination of the workspace or reagents.', 'Separate pre- and post-PCR areas, use filter tips, and replace reagent aliquots.'],
      ['Known positive line reads negative', 'Antibiotics in the medium, or sampling at low cell density.', 'Culture antibiotic-free for three passages and sample at high density.'],
      ['Smeared or non-specific bands', 'Annealing temperature too low or excess template.', 'Raise the annealing temperature and dilute the template.'],
    ],
    refs: [['Uphoff CC, Drexler HG. Detection of mycoplasma contamination in cell cultures. Current Protocols in Molecular Biology. 2014;106:28.4.1-14.', 'https://doi.org/10.1002/0471142727.mb2804s106']],
  }),

  // ------------------------------------------------------------------ proteomics and protein biochemistry
  build({
    id: 'bio-bca', documentId: 'SOP-PROT-001', category: 'Proteomics & Protein Biochemistry',
    title: 'BCA Protein Assay for Total Protein Quantification',
    scope: 'Colorimetric determination of protein concentration by the biuret reaction and bicinchoninic acid chelation of Cu(I), read at 562 nm against a BSA standard curve.',
    hazards: [['CORROSIVE', 'Alkaline BCA reagent', 'Reagent A is strongly alkaline; avoid skin and eye contact.']],
    equipment: ['Microplate reader with a 562 nm filter', '96-well flat-bottom plates', 'Incubator or heat block at 37 °C', 'Multichannel pipette'],
    reagents: ['BCA reagent A and B', 'BSA standard (2 mg/mL)', 'Sample buffer matching the standards', 'Diluent'],
    steps: [
      ['Build the standard curve', 'Prepare BSA standards spanning 0-2000 µg/mL in the same buffer as the samples. Matching the matrix matters: detergents and reducing agents shift the response.', 20, 22],
      ['Prepare working reagent', 'Mix reagent A with reagent B at 50:1. The working reagent is stable for one day; a green tinge that does not clear indicates contamination with reducing agent.', 5, 22],
      ['Load the plate', 'Pipette 25 µL of each standard and unknown in duplicate or triplicate, then add 200 µL working reagent to each well. Mix on a plate shaker for 30 s.', 15, 22],
      ['Incubate', 'Incubate at 37 °C for 30 min, then cool to room temperature before reading. Colour continues to develop, so read all plates at a consistent time.', 40, 37],
      ['Read and calculate', 'Read absorbance at 562 nm. Subtract the blank, fit the standards, and interpolate the unknowns. Samples above the top standard must be diluted and repeated, not extrapolated.', 15, 22],
    ],
    qc: ['Standard curve R-squared above 0.99 across the working range.', 'Replicate CV below 10%.', 'Unknowns must fall inside the standard range.'],
    trouble: [
      ['Standards non-linear at the top', 'Working range exceeded.', 'Use the linear portion or switch to the micro-format for low concentrations.'],
      ['High blank absorbance', 'Reducing agents (DTT, mercaptoethanol) or high detergent in the buffer.', 'Use the reducing-agent-compatible formulation, or precipitate and resuspend the protein.'],
      ['Sample reads higher than expected', 'Buffer components contributing colour.', 'Blank against the sample buffer, not water.'],
    ],
    refs: [['Smith PK, Krohn RI, Hermanson GT, et al. Measurement of protein using bicinchoninic acid. Analytical Biochemistry. 1985;150(1):76-85.', 'https://doi.org/10.1016/0003-2697(85)90442-7']],
  }),
  build({
    id: 'bio-sds-page', documentId: 'SOP-PROT-002', category: 'Proteomics & Protein Biochemistry',
    title: 'SDS-PAGE Separation of Proteins',
    scope: 'Separates denatured proteins by molecular weight through a discontinuous polyacrylamide gel. The foundation for western blotting, in-gel digestion and purity assessment.',
    hazards: [['TOXIC', 'Acrylamide', 'Unpolymerised acrylamide is a potent neurotoxin. Wear gloves, work in a fume hood and use pre-cast gels where possible.'], ['CHEMICAL', 'Electrical hazard', 'Running tanks carry lethal voltages. Never open a tank while the supply is on.']],
    equipment: ['Vertical electrophoresis tank and power supply', 'Heat block at 95 °C', 'Microcentrifuge', 'Gel casting apparatus or pre-cast gels'],
    reagents: ['Acrylamide/bis solution or pre-cast gels', 'Laemmli sample buffer with reducing agent', 'Tris-glycine-SDS running buffer', 'Molecular weight markers', 'Coomassie or other total protein stain'],
    steps: [
      ['Normalise the load', 'Quantify the samples and load equal protein mass per lane, typically 10-30 µg for a total stain. Loading equal volumes of unequal lysates is the most common cause of an uninterpretable gel.', 20, 22],
      ['Denature', 'Add Laemmli buffer to 1x, heat at 95 °C for 5 min and spin briefly. For membrane proteins prone to aggregation, incubate at 37 °C for 30 min instead.', 10, 95],
      ['Assemble and load', 'Assemble the tank, fill with running buffer, and load samples and markers with gel-loading tips. Fill empty lanes with sample buffer so the front runs evenly.', 15, 22],
      ['Run', 'Run at 100-120 V through the stacking gel, then 150-180 V through the resolving gel until the dye front reaches the bottom. Keep the tank cool; overheating distorts the bands.', 75, 22],
      ['Stain or transfer', 'Either stain with Coomassie for total protein, or proceed directly to transfer for western blotting. Note that fixing stains interfere with downstream mass spectrometry.', 60, 22],
    ],
    qc: ['Marker bands must be sharp and evenly spaced.', 'The dye front should be level across the gel; a smile indicates overheating or uneven buffer.', 'A loading control lane should show comparable intensity across samples.'],
    trouble: [
      ['Smiling or distorted bands', 'Excess current generating heat, or uneven buffer levels.', 'Reduce voltage, run in a cold room, and ensure both buffer chambers are filled correctly.'],
      ['Streaky lanes', 'Overloaded protein, or insoluble material not cleared before loading.', 'Reduce the load and centrifuge the denatured sample before loading.'],
      ['Bands run at the wrong weight', 'Post-translational modification, incomplete reduction, or an inappropriate gel percentage.', 'Confirm reduction, and match the acrylamide percentage to the target size range.'],
    ],
    refs: [['Laemmli UK. Cleavage of structural proteins during the assembly of the head of bacteriophage T4. Nature. 1970;227(5259):680-685.', 'https://doi.org/10.1038/227680a0']],
  }),
  build({
    id: 'bio-western', documentId: 'SOP-PROT-003', category: 'Proteomics & Protein Biochemistry',
    title: 'Western Blot: Transfer, Immunodetection and Quantification',
    scope: 'Transfers proteins from a polyacrylamide gel to a membrane and detects a specific target with primary and enzyme-conjugated secondary antibodies, read by chemiluminescence.',
    hazards: [['CHEMICAL', 'Methanol in transfer buffer', 'Toxic by inhalation and skin contact; prepare in a fume hood.'], ['CHEMICAL', 'Electrical hazard', 'Transfer tanks operate at high current. Do not open while powered.']],
    equipment: ['Transfer apparatus (wet or semi-dry)', 'Rocking platform', 'Chemiluminescence imager', 'Incubator or cold room at 4 °C'],
    reagents: ['PVDF or nitrocellulose membrane', 'Transfer buffer', 'Blocking buffer (5% non-fat milk or BSA in TBST)', 'Primary antibody', 'HRP-conjugated secondary antibody', 'ECL substrate', 'TBST wash buffer'],
    steps: [
      ['Prepare the membrane', 'Activate PVDF in methanol for 30 s, then equilibrate in transfer buffer. Nitrocellulose needs no activation. Handle only at the edges with clean forceps.', 10, 22],
      ['Assemble and transfer', 'Assemble the sandwich without bubbles — a bubble is a blank spot on the blot. Transfer at 100 V for 60-90 min with cooling, or per the semi-dry program for the target size.', 90, 4],
      ['Confirm transfer', 'Stain the membrane reversibly with Ponceau S and photograph it. This is the only direct evidence that transfer and loading were even, and it takes two minutes.', 10, 22],
      ['Block', 'Block for 1 h at room temperature in 5% milk or BSA in TBST. Use BSA rather than milk when probing phospho-epitopes, since milk contains phosphoprotein.', 60, 22],
      ['Primary antibody', 'Incubate with primary antibody diluted in blocking buffer, typically overnight at 4 °C with gentle rocking. Record the lot and dilution; antibody performance is lot-dependent.', 960, 4],
      ['Wash and secondary', 'Wash 3 x 5 min in TBST, incubate with HRP-conjugated secondary for 1 h at room temperature, then wash 3 x 5 min again.', 90, 22],
      ['Detect', 'Apply ECL substrate, and image with a series of exposures. Quantify only from unsaturated exposures; a saturated band cannot be quantified in either direction.', 20, 22],
    ],
    qc: ['Ponceau image retained as the transfer record.', 'A loading control or total protein normalisation for every quantitative blot.', 'At least one exposure in which no band of interest is saturated.'],
    trouble: [
      ['No signal', 'Failed transfer, inactive antibody, or the target is below detection.', 'Check the Ponceau first — it separates transfer failure from detection failure.'],
      ['High background', 'Insufficient washing, blocking mismatch, or secondary antibody too concentrated.', 'Extend washes, switch blocking agent, and titrate the secondary.'],
      ['Multiple unexpected bands', 'Non-specific antibody, degradation, or isoforms.', 'Include a knockout or knockdown control; that is the only definitive specificity test.'],
    ],
    refs: [['Towbin H, Staehelin T, Gordon J. Electrophoretic transfer of proteins from polyacrylamide gels to nitrocellulose sheets. PNAS. 1979;76(9):4350-4354.', 'https://doi.org/10.1073/pnas.76.9.4350']],
  }),
  build({
    id: 'bio-ingel-digest', documentId: 'SOP-PROT-004', category: 'Proteomics & Protein Biochemistry',
    title: 'In-Gel Tryptic Digestion for LC-MS/MS',
    scope: 'Recovers peptides from a Coomassie-stained gel band for mass spectrometric identification. Keratin contamination is the principal enemy: every step is designed to keep skin and dust out of the tube.',
    hazards: [['CHEMICAL', 'Acetonitrile and formic acid', 'Volatile and corrosive; work in a fume hood.'], ['TOXIC', 'Iodoacetamide', 'Alkylating agent, light sensitive. Prepare fresh and protect from light.']],
    equipment: ['Laminar flow or dust-free bench', 'Thermomixer or incubator at 37 °C', 'Vacuum concentrator', 'Clean scalpel and dedicated glass plate', 'Low-bind microcentrifuge tubes'],
    reagents: ['Ammonium bicarbonate (50 mM)', 'Acetonitrile (LC-MS grade)', 'DTT', 'Iodoacetamide', 'Sequencing-grade modified trypsin', 'Formic acid', 'LC-MS grade water'],
    steps: [
      ['Excise the band cleanly', 'Wearing fresh gloves, excise the band on a cleaned glass plate with a fresh blade and cut it into 1 mm cubes. Trim away as much blank gel as possible. Keratin from skin, hair and dust dominates the spectrum if introduced here.', 15, 22],
      ['Destain', 'Wash the gel pieces alternately with 50 mM ammonium bicarbonate and acetonitrile until the Coomassie colour is gone, typically three cycles.', 45, 22],
      ['Reduce', 'Cover with 10 mM DTT in 50 mM ammonium bicarbonate and incubate at 56 °C for 30 min to reduce disulfides.', 30, 56],
      ['Alkylate', 'Replace with 55 mM iodoacetamide in ammonium bicarbonate and incubate 20 min at room temperature in the dark. Alkylation prevents disulfides re-forming and is why cysteine is seen as carbamidomethylated.', 20, 22],
      ['Dehydrate and add trypsin', 'Dehydrate the pieces with acetonitrile until white, dry briefly, then rehydrate on ice with trypsin at 10-20 ng/µL in 50 mM ammonium bicarbonate. Add just enough to cover.', 30, 4],
      ['Digest', 'Incubate overnight at 37 °C. Peptides are already leaving the gel at this point, so keep the tube sealed and do not discard the supernatant.', 960, 37],
      ['Extract and dry', 'Collect the supernatant, then extract the gel twice with 50% acetonitrile / 5% formic acid. Pool the extracts, dry in a vacuum concentrator and store at -20 °C until analysis.', 60, 22],
    ],
    qc: ['Process a blank gel piece alongside every batch as a keratin and reagent control.', 'Trypsin autolysis peptides serve as an internal digestion check.', 'Sequence coverage below expectation for the band intensity indicates incomplete digestion or extraction.'],
    trouble: [
      ['Spectra dominated by keratin', 'Skin, hair or dust introduced during excision.', 'Excise in a dust-free area with fresh gloves and blades; run a blank gel control to locate the source.'],
      ['Low peptide recovery', 'Gel pieces cut too large, or extraction skipped.', 'Cut to 1 mm cubes and perform both acidic extractions.'],
      ['Missed cleavages throughout', 'Insufficient trypsin or a digest that was too short.', 'Increase trypsin and digest overnight at 37 °C.'],
    ],
    refs: [['Shevchenko A, Tomas H, Havlis J, et al. In-gel digestion for mass spectrometric characterization of proteins and proteomes. Nature Protocols. 2006;1(6):2856-2860.', 'https://doi.org/10.1038/nprot.2006.468']],
  }),
  build({
    id: 'bio-ip', documentId: 'SOP-PROT-005', category: 'Proteomics & Protein Biochemistry',
    title: 'Immunoprecipitation and Co-Immunoprecipitation',
    scope: 'Captures a target protein, and anything stably bound to it, from a cell lysate using an immobilised antibody. Interpretation stands or falls on the controls.',
    hazards: [BIO_HAZ, ['CHEMICAL', 'Protease inhibitors and detergents', 'Some inhibitors are acutely toxic; prepare in a fume hood and follow the supplier safety data.']],
    equipment: ['Refrigerated microcentrifuge', 'Tube rotator in a cold room', 'Magnetic rack or spin columns', 'Sonicator or cell disruptor'],
    reagents: ['Lysis buffer with protease and phosphatase inhibitors', 'Target antibody and a matched isotype control antibody', 'Protein A/G beads (magnetic or agarose)', 'Wash buffer', 'Elution buffer or Laemmli buffer'],
    steps: [
      ['Lyse under conditions that preserve the interaction', 'Lyse cells cold in a buffer whose detergent is mild enough to keep the complex intact — NP-40 or digitonin for most complexes, RIPA only when the target is the sole interest. Clear the lysate at 14,000 x g for 15 min.', 45, 4],
      ['Reserve an input sample', 'Set aside 2-5% of the cleared lysate as the input control before anything is added. Without an input, an absent band cannot be distinguished from an absent protein.', 5, 4],
      ['Pre-clear', 'Incubate the lysate with beads alone for 30-60 min at 4 °C and discard the beads. This removes proteins that bind the matrix rather than the antibody.', 60, 4],
      ['Bind the antibody', 'Add the target antibody, and in a parallel tube the isotype control at the same concentration. Rotate 2 h to overnight at 4 °C.', 240, 4],
      ['Capture', 'Add Protein A/G beads and rotate a further 1-2 h at 4 °C. Protein A and Protein G differ in affinity by species and isotype — choose accordingly.', 120, 4],
      ['Wash', 'Wash 3-5 times with cold wash buffer, handling the beads gently. Each additional wash lowers background and risks losing weak interactions; record how many you used.', 30, 4],
      ['Elute and analyse', 'Elute by boiling in Laemmli buffer, or gently with a competing peptide or low pH when the complex must stay intact. Analyse input, IP and isotype control side by side on the same blot.', 20, 95],
    ],
    qc: ['Input, isotype control and IP lanes must all appear on the same blot; a co-IP without an isotype control is not interpretable.', 'For co-IP, confirm the bait is enriched before drawing any conclusion about the prey.', 'Beads-only control to identify matrix binders.'],
    trouble: [
      ['Heavy and light chain bands obscure the target', 'Denaturing elution releases the antibody.', 'Use a conformation-specific secondary, covalently crosslink the antibody to the beads, or elute natively.'],
      ['No target recovered', 'Antibody does not recognise the native protein, or the epitope is masked in the complex.', 'Confirm the antibody is validated for IP, not only for western blotting.'],
      ['Everything appears to interact', 'Insufficient washing or lysate overload.', 'Increase wash stringency and compare directly against the isotype control at equal exposure.'],
    ],
    refs: [['Bonifacino JS, Dell Angelica EC, Springer TA. Immunoprecipitation. Current Protocols in Molecular Biology. 2001;Chapter 10:Unit 10.16.', 'https://doi.org/10.1002/0471142727.mb1016s48']],
  }),
  build({
    id: 'bio-imac', documentId: 'SOP-PROT-006', category: 'Proteomics & Protein Biochemistry',
    title: 'His-Tagged Protein Purification by Immobilised Metal Affinity Chromatography',
    scope: 'Purifies a polyhistidine-tagged recombinant protein from bacterial lysate on a nickel-charged resin, eluting with imidazole.',
    hazards: [['TOXIC', 'Nickel salts', 'Sensitiser and suspected carcinogen; avoid contact with the charging solution.'], ['CHEMICAL', 'Imidazole and lysozyme buffers', 'Irritant; wear gloves and eye protection.']],
    equipment: ['Refrigerated centrifuge', 'Sonicator or high-pressure homogeniser', 'Gravity column or FPLC system', 'Cold room or 4 °C cabinet', 'SDS-PAGE apparatus'],
    reagents: ['Induced bacterial cell pellet', 'Lysis buffer (50 mM sodium phosphate, 300 mM NaCl, 10 mM imidazole, pH 8.0)', 'Wash buffer (20-40 mM imidazole)', 'Elution buffer (250-500 mM imidazole)', 'Ni-NTA or Ni-IDA resin', 'Protease inhibitors (EDTA-free)'],
    steps: [
      ['Lyse the cells', 'Resuspend the pellet in cold lysis buffer with EDTA-free inhibitors — EDTA strips nickel from the resin. Lyse by sonication on ice or by homogenisation, keeping the lysate below 15 °C.', 45, 4],
      ['Clarify', 'Centrifuge at 20,000-40,000 x g for 30 min at 4 °C. Retain a sample of both supernatant and pellet: if the protein is in the pellet, the problem is solubility, not purification.', 40, 4],
      ['Bind', 'Apply the cleared lysate to equilibrated resin, either batch-wise with rotation for 1 h at 4 °C or by column flow. Keep a flow-through sample.', 60, 4],
      ['Wash', 'Wash with 10-20 column volumes of wash buffer containing 20-40 mM imidazole. Too little imidazole leaves contaminants; too much strips weakly bound target. Determine the optimum once per construct.', 30, 4],
      ['Elute', 'Elute in fractions with 250-500 mM imidazole. Collect small fractions and follow the elution by A280 or a rapid protein assay.', 30, 4],
      ['Analyse and buffer exchange', 'Run all fractions on SDS-PAGE alongside the input, flow-through and washes. Pool the clean fractions and immediately exchange into a storage buffer — imidazole promotes aggregation on storage.', 90, 4],
    ],
    qc: ['A gel showing input, flow-through, washes and elutions; a purification judged only on the elution lane hides its own failure modes.', 'Target purity assessed by densitometry against the total lane.', 'Endotoxin testing where the protein is destined for cell-based assays.'],
    trouble: [
      ['Protein in the pellet, not the lysate', 'Inclusion bodies from over-fast expression.', 'Lower induction temperature and IPTG concentration, or refold from inclusion bodies.'],
      ['Target does not bind', 'Tag inaccessible, or nickel stripped by EDTA or reducing agent.', 'Use EDTA-free inhibitors, keep DTT below 1 mM, and consider an N- versus C-terminal tag swap.'],
      ['Contaminants co-elute', 'Native histidine-rich host proteins.', 'Raise imidazole in the wash, add a second orthogonal step such as size exclusion, and consider a tag cleavage step.'],
    ],
    refs: [['Bornhorst JA, Falke JJ. Purification of proteins using polyhistidine affinity tags. Methods in Enzymology. 2000;326:245-254.', 'https://doi.org/10.1016/s0076-6879(00)26058-8']],
  }),

  // ------------------------------------------------------------------ immunology
  build({
    id: 'bio-elisa', documentId: 'SOP-IMM-001', category: 'Immunology & Immunoassay',
    title: 'Indirect ELISA for Antigen-Specific Antibody Detection',
    scope: 'Detects and semi-quantifies antibodies in serum or supernatant against an immobilised antigen, read colorimetrically after enzyme-conjugated secondary detection.',
    hazards: [BIO_HAZ, ['CORROSIVE', 'Stop solution', 'Sulfuric acid; add carefully and never to a plate that is still being read.'], ['TOXIC', 'TMB substrate', 'Irritant and light sensitive.']],
    equipment: ['Microplate reader (450 nm with 570 nm reference)', 'Plate washer or multichannel pipette', 'Plate shaker', 'Incubator at 37 °C'],
    reagents: ['High-binding 96-well plates', 'Coating antigen and carbonate coating buffer', 'Blocking buffer (1-5% BSA in PBS)', 'Test sera and reference standards', 'HRP-conjugated anti-species secondary', 'TMB substrate', '2 M sulfuric acid', 'PBST wash buffer'],
    steps: [
      ['Coat', 'Coat wells with antigen in carbonate buffer, typically 50-100 µL at 1-10 µg/mL, overnight at 4 °C. Leave a set of wells uncoated as the non-specific binding control.', 960, 4],
      ['Block', 'Wash three times with PBST and block with 1-5% BSA for 1 h at room temperature. Under-blocking is the leading cause of high background.', 60, 22],
      ['Add samples', 'Add diluted sera and the reference standard curve in duplicate. Incubate 1-2 h at 37 °C or overnight at 4 °C.', 120, 37],
      ['Secondary antibody', 'Wash three to five times, then add HRP-conjugated secondary at its titrated dilution and incubate 1 h at room temperature.', 60, 22],
      ['Develop', 'Wash thoroughly, add TMB and develop in the dark for 10-20 min, watching the standards rather than the clock.', 20, 22],
      ['Stop and read', 'Stop with 2 M sulfuric acid and read at 450 nm within 30 min, subtracting the 570 nm reference. Report titres against the standard curve, not raw OD.', 15, 22],
    ],
    qc: ['Standard curve R-squared above 0.98 with a four-parameter fit.', 'Replicate CV below 15%; below 10% for a validated assay.', 'Blank and uncoated wells within established limits; positive and negative controls on every plate.'],
    trouble: [
      ['High background across the plate', 'Insufficient blocking or washing, or secondary antibody too concentrated.', 'Extend blocking, increase wash cycles, and titrate the secondary against a blank plate.'],
      ['Edge effects', 'Uneven temperature during incubation.', 'Avoid stacking plates, use a plate sealer, and equilibrate reagents before use.'],
      ['Signal saturates immediately', 'Substrate incubation too long or antigen coating too heavy.', 'Shorten development and titrate the coating concentration.'],
    ],
    refs: [['Engvall E, Perlmann P. Enzyme-linked immunosorbent assay (ELISA). Quantitative assay of immunoglobulin G. Immunochemistry. 1971;8(9):871-874.', 'https://doi.org/10.1016/0019-2791(71)90454-x']],
  }),
  build({
    id: 'bio-flow', documentId: 'SOP-IMM-002', category: 'Immunology & Immunoassay',
    title: 'Flow Cytometry Surface Marker Staining',
    scope: 'Stains cell surface antigens with fluorochrome-conjugated antibodies for multiparameter analysis, including the compensation and gating controls the analysis depends on.',
    hazards: [BIO_HAZ, ['TOXIC', 'Fixative', 'Paraformaldehyde is toxic and a suspected carcinogen; handle in a fume hood.'], ['CHEMICAL', 'Sheath fluid and instrument lasers', 'Never defeat instrument interlocks; laser exposure causes permanent eye injury.']],
    equipment: ['Flow cytometer with appropriate laser and filter configuration', 'Refrigerated centrifuge', '96-well round-bottom plates or 5 mL tubes', 'Vortex mixer'],
    reagents: ['Single-cell suspension', 'FACS buffer (PBS, 2% FBS, 2 mM EDTA)', 'Fc receptor blocking reagent', 'Fluorochrome-conjugated antibody panel', 'Viability dye', 'Compensation beads', '1-2% paraformaldehyde (optional)'],
    steps: [
      ['Prepare single cells', 'Prepare a single-cell suspension and filter through a 40-70 µm strainer. Doublets ruin the analysis and cannot be fixed afterwards.', 20, 4],
      ['Viability stain', 'Stain with a fixable viability dye in protein-free buffer before adding antibodies — dead cells bind antibody non-specifically and generate false positives in every channel.', 15, 4],
      ['Block Fc receptors', 'Incubate with Fc block for 10 min at 4 °C, essential for myeloid and B-lineage cells.', 10, 4],
      ['Surface stain', 'Add the titrated antibody panel and incubate 20-30 min at 4 °C in the dark. Use titrated concentrations, not the supplier default; titration is per lot.', 30, 4],
      ['Wash', 'Wash twice with FACS buffer at 300-400 x g for 5 min, resuspending fully between washes.', 15, 4],
      ['Controls', 'Prepare single-stain compensation controls on beads or cells, and fluorescence-minus-one controls for every channel where a gate boundary matters.', 30, 4],
      ['Acquire', 'Acquire promptly, or fix in 1-2% paraformaldehyde and acquire within 24 h. Record enough events for the rarest population of interest.', 40, 4],
    ],
    qc: ['Single-stain compensation controls for every fluorochrome, matched to the staining matrix.', 'FMO controls for any gate that is not clearly bimodal.', 'Instrument QC beads run and passing on the day of acquisition.'],
    trouble: [
      ['Spreading error between channels', 'Compensation controls mismatched to the sample, or dim controls.', 'Use the same fluorochrome lot and a bright control; beads and cells are not interchangeable.'],
      ['High background in all channels', 'Dead cells or Fc-mediated binding.', 'Include a viability dye and Fc block, and gate dead cells out before analysis.'],
      ['Population appears then disappears between runs', 'Antibody degradation or inconsistent gating.', 'Store conjugates in the dark at 4 °C, re-titrate on new lots, and gate against FMO rather than by eye.'],
    ],
    refs: [['Cossarizza A, Chang HD, Radbruch A, et al. Guidelines for the use of flow cytometry and cell sorting in immunological studies. European Journal of Immunology. 2019;49(10):1457-1973.', 'https://doi.org/10.1002/eji.201970107']],
  }),

  // ------------------------------------------------------------------ microbiology
  build({
    id: 'bio-transformation', documentId: 'SOP-MIC-001', category: 'Microbiology',
    title: 'Heat-Shock Transformation of Chemically Competent E. coli',
    scope: 'Introduces plasmid DNA into chemically competent E. coli by a brief heat shock, followed by outgrowth and selective plating.',
    hazards: [BIO_HAZ, ['CHEMICAL', 'Antibiotics', 'Sensitisation risk; weigh powders in a fume hood or use pre-made stocks.'], ['TOXIC', 'Bunsen flame and hot loops', 'Burn risk and ignition source near ethanol.']],
    equipment: ['Water bath or heat block at 42 °C', 'Ice bucket', 'Shaking incubator at 37 °C', 'Static incubator at 37 °C', 'Sterile spreader or beads'],
    reagents: ['Chemically competent E. coli', 'Plasmid DNA or ligation reaction', 'SOC or LB recovery medium', 'LB agar plates with the appropriate selection', 'Control plasmid'],
    steps: [
      ['Thaw competent cells on ice', 'Thaw a vial on ice, never at room temperature, and handle gently — competent cells are fragile and vortexing destroys efficiency.', 10, 0],
      ['Add DNA', 'Add 1-5 µL of DNA (1-100 ng plasmid) per 50 µL of cells, mix by flicking, and hold on ice for 20-30 min.', 30, 0],
      ['Heat shock', 'Transfer to 42 °C for exactly 30-45 s, then return immediately to ice for 2 min. Both the duration and the abrupt return matter.', 3, 42],
      ['Recover', 'Add 250-950 µL of room-temperature SOC and shake at 37 °C for 1 h. Recovery is optional for ampicillin but essential for kanamycin, chloramphenicol and tetracycline, which need time for resistance to be expressed.', 60, 37],
      ['Plate', 'Spread 20-200 µL on pre-warmed selective plates. Plate two volumes to guarantee countable colonies. Include a no-DNA control and a known-efficiency control plasmid.', 15, 37],
      ['Incubate and pick', 'Incubate overnight at 37 °C. Pick well-separated single colonies for screening; satellite colonies around a large colony on ampicillin plates are not transformants.', 960, 37],
    ],
    qc: ['No-DNA control plate must be clear.', 'Control plasmid gives colony counts within the expected efficiency range for the competent cell lot.', 'Colony morphology consistent and free of contaminants.'],
    trouble: [
      ['No colonies at all', 'Cells lost competence through warming, or the selection is wrong for the plasmid.', 'Keep cells on ice throughout and confirm the resistance marker against the plasmid map.'],
      ['Colonies on the no-DNA control', 'Contaminated plates, or antibiotic degraded.', 'Prepare fresh plates and store them at 4 °C in the dark for no more than a few weeks.'],
      ['A lawn instead of colonies', 'Too many cells plated, or ineffective antibiotic.', 'Plate a smaller volume and check the antibiotic concentration and expiry.'],
    ],
    refs: [['Hanahan D. Studies on transformation of Escherichia coli with plasmids. Journal of Molecular Biology. 1983;166(4):557-580.', 'https://doi.org/10.1016/s0022-2836(83)80284-8']],
  }),
  build({
    id: 'bio-growth-curve', documentId: 'SOP-MIC-002', category: 'Microbiology',
    title: 'Bacterial Growth Curve by Optical Density',
    scope: 'Characterises growth kinetics by measuring turbidity at 600 nm over time, yielding lag duration, doubling time in exponential phase, and the onset of stationary phase.',
    hazards: [BIO_HAZ],
    equipment: ['Spectrophotometer or plate reader at 600 nm', 'Shaking incubator', 'Sterile cuvettes or a 96-well plate', 'Baffled flasks'],
    reagents: ['Overnight starter culture', 'Sterile growth medium', 'Blank medium for reference'],
    steps: [
      ['Prepare the starter', 'Inoculate a single colony into medium and grow overnight. A starter from a colony rather than a glycerol stock keeps the lag phase reproducible.', 960, 37],
      ['Subculture', 'Dilute the overnight culture into fresh pre-warmed medium to an OD600 of roughly 0.05, in a flask filled to no more than one fifth of its volume so aeration is not limiting.', 15, 37],
      ['Sample on a schedule', 'Measure OD600 every 20-30 min against a medium blank. Dilute any reading above 0.8 into the linear range and multiply back — above that, turbidity and cell number stop being proportional.', 480, 37],
      ['Plot and fit', 'Plot log10(OD600) against time. Fit the linear exponential portion; doubling time is log10(2) divided by the slope.', 30, 22],
      ['Optional viable counts', 'For a relationship between OD and viable cells, plate serial dilutions at several time points and count colonies. OD measures turbidity, including dead cells and debris.', 60, 37],
    ],
    qc: ['Blank against uninoculated medium from the same batch.', 'Keep readings below OD 0.8 or dilute; report the dilution factor.', 'At least three points defining the exponential phase before fitting a doubling time.'],
    trouble: [
      ['Long or variable lag phase', 'Starter culture too old, or a large temperature or medium shift.', 'Subculture from an exponential-phase starter into pre-warmed identical medium.'],
      ['Growth plateaus early', 'Aeration limited by flask fill volume or shaking speed.', 'Use baffled flasks filled to 20% of nominal volume and increase shaking.'],
      ['OD rises but viable count falls', 'Cell lysis or aggregation inflating turbidity.', 'Confirm with plate counts and inspect the culture microscopically.'],
    ],
    refs: [['Monod J. The growth of bacterial cultures. Annual Review of Microbiology. 1949;3:371-394.', 'https://doi.org/10.1146/annurev.mi.03.100149.002103']],
  }),
  build({
    id: 'bio-gram-stain', documentId: 'SOP-MIC-003', category: 'Microbiology',
    title: 'Gram Staining of Bacterial Smears',
    scope: 'Differentiates bacteria by cell wall structure through sequential crystal violet, iodine, decolourisation and safranin. The single most informative two-minute test in microbiology.',
    hazards: [BIO_HAZ, FLAM, ['TOXIC', 'Crystal violet and iodine', 'Staining and irritant; dispose of stain waste as chemical waste.']],
    equipment: ['Microscope with 100x oil immersion objective', 'Staining rack and sink', 'Bunsen burner or slide warmer', 'Glass slides and inoculating loop'],
    reagents: ['Crystal violet', 'Gram iodine', 'Decolouriser (95% ethanol or acetone-alcohol)', 'Safranin counterstain', 'Immersion oil', 'Known Gram-positive and Gram-negative control organisms'],
    steps: [
      ['Prepare the smear', 'Emulsify a small amount of colony in a drop of water on a slide and spread thinly. A thick smear will not decolourise evenly and reads as false positive.', 5, 22],
      ['Dry and fix', 'Air dry completely, then heat fix by passing through a flame three times, or fix with methanol for 1 min. Heat fixing a wet smear distorts the cells.', 5, 22],
      ['Crystal violet', 'Flood with crystal violet for 1 min and rinse gently with water.', 2, 22],
      ['Iodine mordant', 'Flood with Gram iodine for 1 min and rinse. Iodine traps the dye as a complex inside the peptidoglycan.', 2, 22],
      ['Decolourise', 'Apply decolouriser for 5-15 s until the runoff is just clear, then rinse immediately. This is the only subjective step and the only one that commonly goes wrong.', 1, 22],
      ['Counterstain and read', 'Flood with safranin for 30-60 s, rinse, blot dry and examine under oil immersion. Gram-positive cells are purple, Gram-negative pink.', 5, 22],
    ],
    qc: ['Stain known Gram-positive and Gram-negative controls on every staining session or slide.', 'Cultures older than 24 h can Gram-stain variably; use fresh growth.', 'Examine several fields before reporting.'],
    trouble: [
      ['Everything reads Gram-positive', 'Under-decolourisation, or a smear that was too thick.', 'Thin the smear and decolourise until the runoff just clears.'],
      ['Everything reads Gram-negative', 'Over-decolourisation or an old culture.', 'Shorten decolourisation and use growth under 24 h old.'],
      ['Cells wash off the slide', 'Inadequate fixation.', 'Ensure the smear is fully dry before fixing and fix adequately.'],
    ],
    refs: [['Gram HC. Uber die isolirte Farbung der Schizomyceten in Schnitt- und Trockenpraparaten. Fortschritte der Medicin. 1884;2:185-189.'], ['Coico R. Gram staining. Current Protocols in Microbiology. 2005;Appendix 3:A.3C.1-2.', 'https://doi.org/10.1002/9780471729259.mca03cs00']],
  }),

  // ------------------------------------------------------------------ molecular biology
  build({
    id: 'bio-trizol', documentId: 'SOP-MOL-001', category: 'Molecular Biology',
    title: 'Total RNA Extraction by Acid Guanidinium-Phenol-Chloroform',
    scope: 'Isolates total RNA from cells or tissue by phase separation, the reference method where column chemistries lose small RNAs or struggle with difficult tissue.',
    hazards: [['TOXIC', 'Phenol', 'Causes severe burns and is absorbed through skin. Work in a fume hood; keep polyethylene glycol on hand for skin exposure.'], ['TOXIC', 'Chloroform', 'Volatile, hepatotoxic and a suspected carcinogen; fume hood only.'], BIO_HAZ],
    equipment: ['Fume hood', 'Refrigerated microcentrifuge', 'Homogeniser or bead mill for tissue', 'RNase-free pipettes and tips', 'Spectrophotometer'],
    reagents: ['Guanidinium-phenol reagent', 'Chloroform', 'Isopropanol', '75% ethanol in RNase-free water', 'RNase-free water', 'Glycogen or linear acrylamide carrier for low inputs'],
    steps: [
      ['Lyse', 'Add 1 mL reagent per 5-10 x 10^6 cells or per 50-100 mg tissue and homogenise completely. Incomplete lysis, not extraction chemistry, is the usual cause of poor yield.', 10, 22],
      ['Phase separate', 'Add 0.2 mL chloroform per 1 mL reagent, shake vigorously for 15 s, stand 3 min, and centrifuge at 12,000 x g for 15 min at 4 °C.', 25, 4],
      ['Recover the aqueous phase', 'Transfer only the upper aqueous phase to a fresh tube, keeping well clear of the interphase. Carrying interphase across is how genomic DNA contaminates the prep.', 5, 4],
      ['Precipitate', 'Add 0.5 mL isopropanol per 1 mL of original reagent, stand 10 min and centrifuge at 12,000 x g for 10 min at 4 °C. Add carrier first for inputs below 10^5 cells.', 25, 4],
      ['Wash', 'Wash the pellet with 1 mL of 75% ethanol, vortex briefly and centrifuge at 7,500 x g for 5 min at 4 °C. Repeat once for salt-heavy samples.', 15, 4],
      ['Dissolve', 'Air dry for 5-10 min — do not dry to transparency, since an over-dried pellet is very hard to redissolve — then dissolve in RNase-free water and store at -80 °C.', 15, 22],
    ],
    qc: ['A260/A280 of 1.9-2.1; A260/A230 above 2.0, with a low ratio indicating guanidinium or phenol carryover.', 'RIN or equivalent integrity measure where downstream work is sensitive to degradation.', 'A no-reverse-transcriptase control downstream to detect residual genomic DNA.'],
    trouble: [
      ['Low A260/A230', 'Guanidinium or phenol carryover.', 'Repeat the 75% ethanol wash and avoid disturbing the interphase.'],
      ['Pellet will not redissolve', 'Over-dried, or excess salt.', 'Warm to 55 °C with gentle pipetting; dry for less time in future.'],
      ['Genomic DNA in downstream assays', 'Interphase carried over.', 'Take less of the aqueous phase and add an on-column or solution DNase step.'],
    ],
    refs: [['Chomczynski P, Sacchi N. Single-step method of RNA isolation by acid guanidinium thiocyanate-phenol-chloroform extraction. Analytical Biochemistry. 1987;162(1):156-159.', 'https://doi.org/10.1006/abio.1987.9999']],
  }),
  build({
    id: 'bio-rtqpcr', documentId: 'SOP-MOL-002', category: 'Molecular Biology',
    title: 'Two-Step RT-qPCR with Relative Quantification',
    scope: 'Reverse transcribes RNA to cDNA and quantifies a target by real-time PCR, reporting relative expression by the comparative Ct method against validated reference genes.',
    hazards: [['MUTAGEN', 'Nucleic acid dyes', 'Intercalating dyes are mutagenic; handle with gloves and dispose as hazardous waste.'], BIO_HAZ],
    equipment: ['Real-time PCR instrument', 'Thermal cycler for reverse transcription', 'Dedicated pre- and post-PCR areas', 'Calibrated pipettes and filter tips', 'Plate centrifuge'],
    reagents: ['DNase-treated total RNA', 'Reverse transcriptase and buffer', 'Random hexamers or oligo-dT', 'qPCR master mix (probe or dye based)', 'Validated primer pairs for target and reference genes', 'Nuclease-free water'],
    steps: [
      ['Normalise the RNA input', 'Quantify and dilute all samples to the same RNA concentration. Equal input is what makes the comparative method valid.', 20, 22],
      ['Reverse transcribe', 'Assemble the RT reaction with a fixed RNA mass per reaction. Include a no-reverse-transcriptase control for every sample — it is the only way to detect genomic DNA amplification.', 60, 42],
      ['Validate the primers once', 'For each new primer pair, run a standard curve over five ten-fold dilutions. Accept only 90-110% efficiency and R-squared above 0.99, and confirm a single melt peak.', 120, 60],
      ['Set up the qPCR plate', 'Plate technical triplicates of each sample for target and reference genes, plus no-template controls. Seal, vortex and spin the plate before loading.', 40, 22],
      ['Cycle', 'Run the standard two-step protocol, adding a melt curve for dye-based chemistry. Set the threshold in the exponential phase consistently across plates.', 100, 95],
      ['Analyse', 'Calculate delta-delta Ct against the geometric mean of at least two validated reference genes. State the reference genes and efficiency assumptions in the report — a fold change without them is uninterpretable.', 40, 22],
    ],
    qc: ['No-template controls with no amplification, or Ct at least 5 cycles above the lowest sample.', 'No-RT controls confirming absence of genomic DNA signal.', 'Technical replicate Ct spread below 0.5 cycles.', 'Reference gene stability confirmed across the experimental conditions, not assumed.'],
    trouble: [
      ['Amplification in the no-template control', 'Amplicon or primer-dimer contamination.', 'Separate pre- and post-PCR areas, replace reagent aliquots, and check the melt curve for dimers.'],
      ['Poor efficiency on the standard curve', 'Primer design, inhibitors, or pipetting error at the dilution steps.', 'Redesign primers across an exon junction and dilute the template to test for inhibition.'],
      ['Reference gene varies with treatment', 'Chosen reference is not stable in this system.', 'Screen candidate reference genes in the actual experimental conditions and use the geometric mean of the stable ones.'],
    ],
    refs: [['Bustin SA, Benes V, Garson JA, et al. The MIQE guidelines: minimum information for publication of quantitative real-time PCR experiments. Clinical Chemistry. 2009;55(4):611-622.', 'https://doi.org/10.1373/clinchem.2008.112797'], ['Livak KJ, Schmittgen TD. Analysis of relative gene expression data using real-time quantitative PCR and the 2(-Delta Delta C(T)) method. Methods. 2001;25(4):402-408.', 'https://doi.org/10.1006/meth.2001.1262']],
  }),

  // ------------------------------------------------------------------ histology
  build({
    id: 'bio-he-stain', documentId: 'SOP-HIS-001', category: 'Histology & Imaging',
    title: 'Haematoxylin and Eosin Staining of FFPE Sections',
    scope: 'The routine morphological stain: haematoxylin binds nucleic acids blue, eosin stains cytoplasm and connective tissue pink. Everything else in histology is read against it.',
    hazards: [['FLAMMABLE', 'Xylene and graded alcohols', 'Flammable and neurotoxic; use in a fume hood with adequate extraction.'], ['TOXIC', 'Haematoxylin and eosin solutions', 'Irritant; dispose of as chemical waste.'], BIO_HAZ],
    equipment: ['Fume hood and staining line', 'Slide racks and staining dishes', 'Microtome and water bath', 'Coverslipper or manual mounting station', 'Light microscope'],
    reagents: ['FFPE tissue sections on charged slides', 'Xylene or a xylene substitute', 'Graded ethanol series (100%, 95%, 70%)', 'Haematoxylin', 'Acid alcohol differentiator', 'Bluing reagent', 'Eosin Y', 'Mounting medium'],
    steps: [
      ['Dewax', 'Pass slides through three changes of xylene, 3-5 min each. Incomplete dewaxing leaves pale patchy areas that cannot be corrected later.', 15, 22],
      ['Rehydrate', 'Pass through 100%, 95% and 70% ethanol, 2-3 min each, then into water.', 10, 22],
      ['Haematoxylin', 'Stain in haematoxylin for 3-5 min depending on the formulation and its age, then rinse in running water.', 8, 22],
      ['Differentiate and blue', 'Dip briefly in acid alcohol to remove excess stain, rinse, then blue in running tap water or a bluing reagent until nuclei are crisp blue.', 5, 22],
      ['Eosin', 'Counterstain in eosin for 30 s to 2 min. Eosin is easily over-applied; check a slide under the microscope before committing the batch.', 3, 22],
      ['Dehydrate, clear and mount', 'Dehydrate through graded alcohols, clear in xylene and coverslip with mounting medium, avoiding bubbles.', 12, 22],
    ],
    qc: ['Include a control section of known tissue in each run.', 'Nuclei crisply blue with visible chromatin detail; cytoplasm pink and differentiated, not uniformly red.', 'Monitor and record reagent change schedules — most H&E drift is reagent exhaustion.'],
    trouble: [
      ['Pale or patchy staining', 'Incomplete dewaxing or exhausted haematoxylin.', 'Refresh xylene and extend dewaxing; replace stain on schedule rather than on appearance.'],
      ['Nuclei brown rather than blue', 'Inadequate bluing.', 'Extend the bluing step or replace the bluing reagent.'],
      ['Sections lift off the slide', 'Unsuitable slides or inadequate drying.', 'Use charged slides and dry sections thoroughly at 37-60 °C before staining.'],
    ],
    refs: [['Fischer AH, Jacobson KA, Rose J, Zeller R. Hematoxylin and eosin staining of tissue and cell sections. Cold Spring Harbor Protocols. 2008;2008:pdb.prot4986.', 'https://doi.org/10.1101/pdb.prot4986']],
  }),
  build({
    id: 'bio-ihc', documentId: 'SOP-HIS-002', category: 'Histology & Imaging',
    title: 'Immunohistochemistry on FFPE Sections with DAB Detection',
    scope: 'Localises a protein antigen in fixed tissue using a primary antibody, polymer-HRP detection and DAB chromogen, with heat-induced epitope retrieval.',
    hazards: [['TOXIC', 'DAB chromogen', 'A suspected carcinogen. Handle in a fume hood and inactivate waste as required by local rules.'], ['FLAMMABLE', 'Xylene and alcohols', 'Flammable and neurotoxic; fume hood only.'], ['TOXIC', 'Pressurised retrieval', 'Pressure cookers and steamers cause scald injuries; allow full depressurisation before opening.'], BIO_HAZ],
    equipment: ['Fume hood', 'Pressure cooker, microwave or water bath for retrieval', 'Humidified staining chamber', 'Light microscope', 'Slide scanner (optional)'],
    reagents: ['FFPE sections on charged slides', 'Citrate pH 6.0 or EDTA pH 9.0 retrieval buffer', 'Hydrogen peroxide block (3%)', 'Protein block', 'Primary antibody', 'Polymer-HRP secondary', 'DAB substrate kit', 'Haematoxylin counterstain'],
    steps: [
      ['Dewax and rehydrate', 'Dewax in xylene and rehydrate through graded alcohols to water, as for H&E.', 25, 22],
      ['Retrieve the epitope', 'Heat in the retrieval buffer the antibody datasheet specifies — citrate pH 6.0 or EDTA pH 9.0 — for 15-20 min, then cool slowly in buffer for at least 20 min. Buffer choice changes the result more than any other variable here.', 45, 98],
      ['Block endogenous peroxidase', 'Incubate in 3% hydrogen peroxide for 10 min and rinse. Skipping this gives brown staining in erythrocytes and other peroxidase-rich structures.', 12, 22],
      ['Protein block', 'Apply protein block for 10-20 min to reduce non-specific binding. Do not rinse before the primary.', 20, 22],
      ['Primary antibody', 'Apply the titrated primary in a humidified chamber, typically 1 h at room temperature or overnight at 4 °C. Run a matched isotype or no-primary control slide alongside every batch.', 60, 22],
      ['Detection', 'Rinse, apply polymer-HRP for 30 min, rinse again, then develop with DAB while watching under the microscope — DAB development is fast and irreversible.', 45, 22],
      ['Counterstain and mount', 'Counterstain lightly with haematoxylin, blue, dehydrate, clear and coverslip.', 20, 22],
    ],
    qc: ['Positive control tissue known to express the target, on every run.', 'Negative control: isotype-matched or primary omitted, processed identically.', 'Endogenous peroxidase block verified on a tissue rich in erythrocytes.'],
    trouble: [
      ['No staining in known positive tissue', 'Retrieval mismatch, or over-fixation masking the epitope.', 'Test both citrate and EDTA retrieval and record fixation time — over-fixed archival blocks often need longer retrieval.'],
      ['Diffuse background staining', 'Primary too concentrated, inadequate blocking, or sections dried out during incubation.', 'Titrate the primary, extend blocking, and keep sections humidified throughout.'],
      ['Brown staining in the negative control', 'Endogenous peroxidase or biotin not blocked.', 'Extend the peroxide block; use a polymer rather than a biotin-based system in biotin-rich tissue.'],
    ],
    refs: [['Ramos-Vara JA, Miller MA. When tissue antigens and antibodies get along: revisiting the technical aspects of immunohistochemistry. Veterinary Pathology. 2014;51(1):42-87.', 'https://doi.org/10.1177/0300985813505879']],
  }),
];
