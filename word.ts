import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  ShadingType
} from 'docx';
import { SopDocument } from '../types';

export async function generateWordDocument(sop: SopDocument): Promise<Uint8Array> {
  const reqInfo = sop.requestorInfo || {};
  const revInfo = sop.reviewerInfo || {};
  const sheet = sop.reactionSheet;

  // Helper for creating section headers
  const createHeading = (text: string) => {
    return new Paragraph({
      text: text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 }
    });
  };

  // Helper for cell text
  const cellParagraph = (text: string, bold = false, color = '000000', alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]) => {
    return new Paragraph({
      alignment: alignment || AlignmentType.LEFT,
      children: [new TextRun({ text, bold, size: 20, color, font: 'Arial' })]
    });
  };

  // 1. Title Banner / Header
  const titleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: 'STANDARD OPERATING PROCEDURE (SOP)',
        bold: true,
        size: 28,
        color: '0F172A',
        font: 'Arial'
      })
    ]
  });

  const subTitleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: sop.title,
        bold: true,
        size: 24,
        color: '0284C7',
        font: 'Arial'
      })
    ]
  });

  // Document Metadata Table
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [cellParagraph(`Doc ID: ${sop.documentId}`, true)],
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }
          }),
          new TableCell({
            children: [cellParagraph(`Version: ${sop.version}`, true)],
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }
          }),
          new TableCell({
            children: [cellParagraph(`Effective Date: ${sop.effectiveDate}`, true)],
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }
          }),
          new TableCell({
            children: [cellParagraph(`BSL Rating: ${sop.biosafetyLevel}`, true, '0284C7')],
            shading: { fill: 'E0F2FE', type: ShadingType.CLEAR }
          })
        ]
      })
    ]
  });

  // 2. Requestor & Reviewer Information Table
  const requestorReviewerHeader = createHeading('REQUESTOR & REVIEWER INFORMATION');

  const reqRevTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header Row for Requestor
      new TableRow({
        children: [
          new TableCell({
            children: [cellParagraph('REQUESTOR INFORMATION', true, 'FFFFFF')],
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            columnSpan: 2
          }),
          new TableCell({
            children: [cellParagraph('REVIEWER / QA INFORMATION', true, 'FFFFFF')],
            shading: { fill: '0F172A', type: ShadingType.CLEAR },
            columnSpan: 2
          })
        ]
      }),
      // Row 1
      new TableRow({
        children: [
          new TableCell({ children: [cellParagraph('Requestor Name:', true)], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [cellParagraph(reqInfo.name || '[Not Filled / Blank]')], width: { size: 30, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [cellParagraph('Reviewer Name:', true)], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [cellParagraph(revInfo.name || '[Not Filled / Blank]')], width: { size: 30, type: WidthType.PERCENTAGE } })
        ]
      }),
      // Row 2
      new TableRow({
        children: [
          new TableCell({ children: [cellParagraph('Department / Lab:', true)] }),
          new TableCell({ children: [cellParagraph(reqInfo.department || '[Not Filled / Blank]')] }),
          new TableCell({ children: [cellParagraph('Title / Role:', true)] }),
          new TableCell({ children: [cellParagraph(revInfo.titleOrRole || '[Not Filled / Blank]')] })
        ]
      }),
      // Row 3
      new TableRow({
        children: [
          new TableCell({ children: [cellParagraph('Email / Role:', true)] }),
          new TableCell({ children: [cellParagraph(reqInfo.emailOrRole || '[Not Filled / Blank]')] }),
          new TableCell({ children: [cellParagraph('Review Status:', true)] }),
          new TableCell({ children: [cellParagraph(revInfo.status || 'Pending Review', true, revInfo.status === 'Approved' ? '15803D' : '0284C7')] })
        ]
      }),
      // Row 4
      new TableRow({
        children: [
          new TableCell({ children: [cellParagraph('Date Requested:', true)] }),
          new TableCell({ children: [cellParagraph(reqInfo.dateRequested || '[Not Filled / Blank]')] }),
          new TableCell({ children: [cellParagraph('Date Reviewed:', true)] }),
          new TableCell({ children: [cellParagraph(revInfo.dateReviewed || '[Not Filled / Blank]')] })
        ]
      }),
      // Row 5 (Comments)
      new TableRow({
        children: [
          new TableCell({ children: [cellParagraph('Reviewer Comments / Notes:', true)], columnSpan: 1 }),
          new TableCell({ children: [cellParagraph(revInfo.comments || '[None]')], columnSpan: 3 })
        ]
      })
    ]
  });

  // 3. Section 1: Scope
  const scopeHeader = createHeading('1. PURPOSE & OPERATIONAL SCOPE');
  const scopeText = new Paragraph({
    children: [new TextRun({ text: sop.scope, size: 21, font: 'Arial' })],
    spacing: { after: 160 }
  });

  // 4. Section 2: Hazards & PPE Table
  const hazardHeader = createHeading('2. BIOSAFETY HAZARDS & PPE REQUIREMENTS');
  const hazardTableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [cellParagraph('Hazard Type', true, 'FFFFFF')], shading: { fill: '0369A1', type: ShadingType.CLEAR } }),
        new TableCell({ children: [cellParagraph('Label / Reagent', true, 'FFFFFF')], shading: { fill: '0369A1', type: ShadingType.CLEAR } }),
        new TableCell({ children: [cellParagraph('Risk Description & Precautions', true, 'FFFFFF')], shading: { fill: '0369A1', type: ShadingType.CLEAR } })
      ]
    }),
    ...sop.hazards.map(
      (h) =>
        new TableRow({
          children: [
            new TableCell({ children: [cellParagraph(h.type, true, 'B91C1C')] }),
            new TableCell({ children: [cellParagraph(h.label, true)] }),
            new TableCell({ children: [cellParagraph(h.description)] })
          ]
        })
    )
  ];
  const hazardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: hazardTableRows
  });

  const ppeText = new Paragraph({
    children: [
      new TextRun({ text: 'Required PPE: ', bold: true, size: 20 }),
      new TextRun({
        text: sop.ppeRequirements.map((p) => `${p.item}${p.notes ? ` (${p.notes})` : ''}`).join(', '),
        size: 20
      })
    ],
    spacing: { before: 120, after: 160 }
  });

  // 5. Section 3: Reagents & Equipment
  const inventoryHeader = createHeading('3. EQUIPMENT & REAGENTS');
  const eqList = new Paragraph({
    children: [
      new TextRun({ text: 'Equipment Required: ', bold: true, size: 20 }),
      new TextRun({ text: sop.equipmentRequired.join('; '), size: 20 })
    ],
    spacing: { after: 80 }
  });
  const reList = new Paragraph({
    children: [
      new TextRun({ text: 'Reagents & Solutions: ', bold: true, size: 20 }),
      new TextRun({ text: sop.reagentsRequired.join('; '), size: 20 })
    ],
    spacing: { after: 160 }
  });

  // 6. Section 4: Step-by-Step Procedure Table
  const stepsHeader = createHeading('4. STEP-BY-STEP PROCEDURE');
  const stepTableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [cellParagraph('Step #', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR }, width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [cellParagraph('Procedure Step', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR }, width: { size: 65, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [cellParagraph('Time / Temp', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR }, width: { size: 25, type: WidthType.PERCENTAGE } })
      ]
    }),
    ...sop.steps.map(
      (s) =>
        new TableRow({
          children: [
            new TableCell({ children: [cellParagraph(`${s.stepNumber}`, true, '000000', AlignmentType.CENTER)] }),
            new TableCell({
              children: [
                cellParagraph(s.title, true),
                cellParagraph(s.instruction),
                ...(s.criticalCheckpoint ? [cellParagraph(`CRITICAL CHECKPOINT: ${s.criticalCheckpoint}`, true, 'B91C1C')] : []),
                ...(s.safetyWarning ? [cellParagraph(`SAFETY WARNING: ${s.safetyWarning}`, true, 'D97706')] : [])
              ]
            }),
            new TableCell({
              children: [
                cellParagraph(s.timingMinutes ? `${s.timingMinutes} min` : '-'),
                cellParagraph(s.tempCelsius ? `${s.tempCelsius}°C` : '')
              ]
            })
          ]
        })
    )
  ];
  const stepTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: stepTableRows
  });

  // 7. Section 5: Reaction Sheet Master Mix Calculator Table (if available)
  const elements: any[] = [
    titleParagraph,
    subTitleParagraph,
    metaTable,
    requestorReviewerHeader,
    reqRevTable,
    scopeHeader,
    scopeText,
    hazardHeader,
    hazardTable,
    ppeText,
    inventoryHeader,
    eqList,
    reList,
    stepsHeader,
    stepTable
  ];

  if (sheet && sheet.components && sheet.components.length > 0) {
    const rxnHeader = createHeading('5. REACTION SHEET MASTER MIX CALCULATOR');

    const numRxns = sheet.defaultNumReactions || 8;
    const overflowPct = sheet.defaultOverflowPercent || 10;
    const overflowMultiplier = 1 + overflowPct / 100;

    const rxnMetaText = new Paragraph({
      children: [
        new TextRun({ text: `Assay: ${sheet.title} | `, bold: true, size: 20 }),
        new TextRun({ text: `Calculated for ${numRxns} Reactions (+${overflowPct}% Overflow)`, size: 20, color: '0369A1', bold: true })
      ],
      spacing: { after: 120 }
    });

    const rxnTableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ children: [cellParagraph('Order', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph('Component Name', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph('Stock Conc.', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph('Final Conc.', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph('Vol / 1 Rxn (uL)', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph(`Vol / ${numRxns} Rxns (uL)`, true, 'FFFFFF')], shading: { fill: '0284C7', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph('Storage / Notes', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } })
        ]
      }),
      ...sheet.components.map((c, idx) => {
        const totalVol = c.volPerRxnMicroliters * numRxns * overflowMultiplier;
        return new TableRow({
          children: [
            new TableCell({ children: [cellParagraph(`${c.pipettingOrder || idx + 1}`, false, '000000', AlignmentType.CENTER)] }),
            new TableCell({ children: [cellParagraph(c.name, true)] }),
            new TableCell({ children: [cellParagraph(`${c.stockConc} ${c.stockUnit}`)] }),
            new TableCell({ children: [cellParagraph(`${c.finalConc} ${c.finalUnit}`)] }),
            new TableCell({ children: [cellParagraph(`${c.volPerRxnMicroliters.toFixed(2)}`)] }),
            new TableCell({ children: [cellParagraph(`${totalVol.toFixed(2)}`, true, '0284C7')], shading: { fill: 'F0F9FF', type: ShadingType.CLEAR } }),
            new TableCell({ children: [cellParagraph(c.notes ? `[${c.storageTemp || 'Cold'}] ${c.notes}` : c.storageTemp || '')] })
          ]
        });
      })
    ];

    // Total Row
    const sumSingleVol = sheet.components.reduce((acc, c) => acc + c.volPerRxnMicroliters, 0);
    const sumTotalVol = sumSingleVol * numRxns * overflowMultiplier;
    rxnTableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [cellParagraph('TOTAL VOLUME:', true)], columnSpan: 4, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph(`${sumSingleVol.toFixed(2)} uL`, true)], shading: { fill: 'F8FAFC', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph(`${sumTotalVol.toFixed(2)} uL`, true, '0284C7')], shading: { fill: 'E0F2FE', type: ShadingType.CLEAR } }),
          new TableCell({ children: [cellParagraph('Ready for pipetting')], shading: { fill: 'F8FAFC', type: ShadingType.CLEAR } })
        ]
      })
    );

    const rxnTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rxnTableRows
    });

    elements.push(rxnHeader, rxnMetaText, rxnTable);

    if (sheet.stepByStepReactionSteps && sheet.stepByStepReactionSteps.length > 0) {
      const rxnStepsHeader = createHeading('5B. STEP-BY-STEP REACTION PROTOCOL (CONDITIONS & VOLUMES)');
      const rxnStepRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({ children: [cellParagraph('Step #', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR }, width: { size: 10, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [cellParagraph('Step & Conditions', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [cellParagraph('Reagents & Amounts / Volumes', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR }, width: { size: 35, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [cellParagraph('Instructions & Notes', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR }, width: { size: 25, type: WidthType.PERCENTAGE } })
          ]
        }),
        ...sheet.stepByStepReactionSteps.map(
          (st) =>
            new TableRow({
              children: [
                new TableCell({ children: [cellParagraph(`${st.stepNumber}`, true, '000000', AlignmentType.CENTER)] }),
                new TableCell({
                  children: [
                    cellParagraph(st.stepName, true, '0284C7'),
                    cellParagraph(`Phase: ${st.phase || 'Reaction'}`),
                    cellParagraph(`Conditions: ${st.conditions || 'Bench'}`),
                    ...(st.tempCelsius !== undefined ? [cellParagraph(`Temp: ${st.tempCelsius}°C`, true, '0F172A')] : []),
                    ...(st.timingMinutes !== undefined ? [cellParagraph(`Time: ${st.timingMinutes} min`)] : [])
                  ]
                }),
                new TableCell({
                  children: (st.reagentsAndVolumes && st.reagentsAndVolumes.length > 0)
                    ? st.reagentsAndVolumes.map((rv) => cellParagraph(`• ${rv.reagentName}: ${rv.volPerRxnMicroliters} uL/rxn (${(rv.volPerRxnMicroliters * numRxns * overflowMultiplier).toFixed(2)} uL total)${rv.finalAmountOrConc ? ` [${rv.finalAmountOrConc}]` : ''}`, true))
                    : [cellParagraph('Refer to Master Mix Table', false, '64748B')]
                }),
                new TableCell({
                  children: [
                    cellParagraph(st.instructions),
                    ...(st.criticalCheckpoint ? [cellParagraph(`CRITICAL: ${st.criticalCheckpoint}`, true, 'B91C1C')] : []),
                    ...(st.safetyWarning ? [cellParagraph(`SAFETY: ${st.safetyWarning}`, true, 'D97706')] : [])
                  ]
                })
              ]
            })
        )
      ];

      const rxnStepTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rxnStepRows
      });

      elements.push(rxnStepsHeader, rxnStepTable);
    }
  }

  // 8. Quality Control & Troubleshooting
  const qcHeader = createHeading('6. QUALITY CONTROL & TROUBLESHOOTING');
  const qcText = new Paragraph({
    children: [
      new TextRun({ text: 'Quality Control Criteria: ', bold: true, size: 20 }),
      new TextRun({ text: sop.qualityControl.join('; '), size: 20 })
    ],
    spacing: { after: 120 }
  });

  const tbTableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ children: [cellParagraph('Observed Issue', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } }),
        new TableCell({ children: [cellParagraph('Root Cause', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } }),
        new TableCell({ children: [cellParagraph('Corrective Solution', true, 'FFFFFF')], shading: { fill: '0F172A', type: ShadingType.CLEAR } })
      ]
    }),
    ...sop.troubleshooting.map(
      (t) =>
        new TableRow({
          children: [
            new TableCell({ children: [cellParagraph(t.issue, true, 'B91C1C')] }),
            new TableCell({ children: [cellParagraph(t.cause)] }),
            new TableCell({ children: [cellParagraph(t.solution, true, '15803D')] })
          ]
        })
    )
  ];
  const tbTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tbTableRows
  });

  elements.push(qcHeader, qcText, tbTable);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: elements
      }
    ]
  });

  return new Uint8Array(await (await Packer.toBlob(doc)).arrayBuffer());
}
