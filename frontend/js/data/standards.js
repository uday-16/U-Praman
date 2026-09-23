/**
 * Indian Standards Data Model
 * Ingested directly from Bureau of Indian Standards (BIS) publications and gazette amendments in datab/
 */

export const mockStandards = [
  {
    id: 'IS-2925-1984',
    code: 'IS 2925:1984',
    isNumber: 'IS 2925:1984',
    title: 'Industrial Safety Helmets',
    category: 'Safety & Personal Protection',
    department: 'Chemical Department (CHD)',
    committee: 'CHD 8 (Occupational Safety and Health)',
    status: 'Active',
    revision: 'Second Revision',
    year: '1984',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    sourcePdfs: ['is.2925.1984.pdf', 'is.2925.b.1984.pdf'],
    amendments: [
      { number: 1, year: 2018, description: 'Updated chin strap tension test limits and shock absorption criteria' }
    ],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Heavy Industries / DPIIT (PPE QCO)',
    scope: 'Specifies physical, performance, construction, and testing requirements for industrial safety helmets for protection of workers against falling objects, mechanical impact, and electrical hazards.',
    keyRequirements: [
      'Shock absorption test (transmitted force <= 5.0 kN under 50J drop)',
      'Penetration resistance test with 3 kg conical striker',
      'Flammability resistance and lateral rigidity',
      'Dielectric voltage test (leakage current <= 3mA under 1.2 kV AC)',
      'Adjustable chin strap retention system (release force 150N to 250N)'
    ],
    clauses: [
      { number: 'Clause 4.1', title: 'Materials & Construction', summary: 'Shell shall be smooth, impact resistant HDPE, ABS, or fiberglass with non-irritating harness.' },
      { number: 'Clause 5.2', title: 'Shock Absorption Test', summary: 'Deceleration of headform shall not exceed 50g acceleration equivalent.' },
      { number: 'Clause 6.1', title: 'Electrical Insulation', summary: 'Leakage current shall not exceed 3mA under 1200V AC test.' },
      { number: 'Clause 7.4', title: 'Marking & BIS Logo', summary: 'Must carry IS number, manufacturer trademark, year of manufacture and ISI mark.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 98,
    coverageScore: 98,
    technicalScore: 99,
    appScore: 97,
    criteriaScores: {
      requirement: '98%',
      product: '99%',
      application: '97%',
      evidence: '98%'
    },
    whyRecommended: {
      summary: 'Direct match for industrial safety helmets in construction, infrastructure, and mining procurement specifications.',
      evidence: [
        { source: 'Tender Clause 4.2', section: 'Head Protection', text: '50J impact drop resistance and 1.2kV dielectric insulation required.', status: 'Verified Match' },
        { source: 'datab/is.2925.1984.pdf', section: 'Clause 5.2 Shock Absorption', text: 'Prescribes maximum 5.0 kN peak force transmission under 50 J impact energy.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 15298 (Part 2):2011', title: 'Personal Protective Equipment — Safety Footwear', relationship: 'Related PPE' },
      { code: 'IS 2062:2011', title: 'Hot Rolled Medium and High Tensile Structural Steel', relationship: 'Site Environment' }
    ]
  },
  {
    id: 'IS-2062-2011',
    code: 'IS 2062:2011',
    isNumber: 'IS 2062:2011',
    title: 'Hot Rolled Medium and High Tensile Structural Steel',
    category: 'Steel & Construction',
    department: 'Civil Engineering Department (CED)',
    committee: 'CED 7 (Structural Engineering & Structural Sections)',
    status: 'Active',
    revision: 'Seventh Revision',
    year: '2011',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    sourcePdfs: ['is.2062.2011.pdf'],
    amendments: [
      { number: 1, year: 2012, description: 'Revised carbon equivalent tolerances' },
      { number: 2, year: 2019, description: 'Updated micro-alloyed steel grade specifications' }
    ],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Steel (Steel and Steel Products QCO)',
    scope: 'Covers requirements for hot-rolled medium and high tensile structural steel plates, shapes, sections, flats, and bars for use in structural steelwork, bridges, buildings, and infrastructure.',
    keyRequirements: [
      'Grades E250, E350, E450, E550, E650 yield stress classifications',
      'Tensile strength range 410 - 630 MPa with elongation >= 20%',
      'Charpy V-notch impact toughness test at 0°C and -20°C (Sub-qualities A, BR, BO, C)',
      'Carbon Equivalent (CE) <= 0.42% for weldability',
      'Bend test without cracking on specified mandrel radius'
    ],
    clauses: [
      { number: 'Clause 6.1', title: 'Chemical Composition', summary: 'Limits on Carbon, Sulphur (<= 0.045%), Phosphorus (<= 0.045%) and micro-alloys.' },
      { number: 'Clause 8.3', title: 'Mechanical Properties', summary: 'Tensile test, yield strength verification, and percentage elongation criteria.' },
      { number: 'Clause 10.1', title: 'Impact Test', summary: 'Charpy V-notch impact absorption energy verification at specified temperature.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 96,
    coverageScore: 96,
    technicalScore: 98,
    appScore: 95,
    criteriaScores: {
      requirement: '96%',
      product: '98%',
      application: '95%',
      evidence: '96%'
    },
    whyRecommended: {
      summary: 'Matches structural steel requirements for welded, bolted, and riveted structural fabrication.',
      evidence: [
        { source: 'datab/is.2062.2011.pdf', section: 'Clause 8.1 Mechanical Properties', text: 'Grade E250 to E450 structural steel sections for heavy infrastructure.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 1489 (Part 1):2015', title: 'Portland Pozzolana Cement', relationship: 'Civil Construction' },
      { code: 'IS 15328:2003', title: 'Plastics Piping Systems for Underground Drainage', relationship: 'Infrastructure' }
    ]
  },
  {
    id: 'IS-10500-2012',
    code: 'IS 10500:2012',
    isNumber: 'IS 10500:2012',
    title: 'Drinking Water — Specification',
    category: 'Water & Environmental',
    department: 'Chemical Department (CHD)',
    committee: 'CHD 13 (Water Quality)',
    status: 'Active',
    revision: 'Second Revision',
    year: '2012',
    reviewedYear: 2023,
    reaffirmedYear: 2023,
    sourcePdfs: ['is.10500.2012.pdf', 'is.10500.1991.pdf'],
    amendments: [
      { number: 1, year: 2015, description: 'Updated pesticide residue limits' },
      { number: 2, year: 2018, description: 'Revised radioactive substance limits' },
      { number: 3, year: 2021, description: 'Aligned heavy metal limits with latest WHO guidelines' }
    ],
    certification: 'Mandatory Certification',
    ministry: 'Ministry of Jal Shakti / FSSAI',
    scope: 'Prescribes quality limits for physical, chemical, and bacteriological parameters of drinking water supplied for public consumption and municipal procurement.',
    keyRequirements: [
      'Turbidity acceptable limit <= 1 NTU (max permissible 5 NTU)',
      'pH range 6.5 to 8.5 (no relaxation)',
      'Total Dissolved Solids (TDS) acceptable limit 500 mg/l (max 2000 mg/l)',
      'Total Hardness (as CaCO3) acceptable limit 200 mg/l (max 600 mg/l)',
      'E. coli or coliform bacteria: Shall not be detectable in any 100 ml sample',
      'Heavy metals: Arsenic <= 0.01 mg/l, Lead <= 0.01 mg/l, Cadmium <= 0.003 mg/l'
    ],
    clauses: [
      { number: 'Clause 4.1', title: 'Physical & Chemical Parameters', summary: 'Limits specified in Table 1 and Table 2 for potability.' },
      { number: 'Clause 4.2', title: 'Bacteriological Quality', summary: 'Zero coliform bacteria and microbial pathogens per 100 ml sample.' },
      { number: 'Clause 5.1', title: 'Sampling Procedures', summary: 'Representative sampling as per IS 1622 and IS 3025 protocols.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 95,
    coverageScore: 94,
    technicalScore: 96,
    appScore: 95,
    criteriaScores: {
      requirement: '95%',
      product: '96%',
      application: '95%',
      evidence: '94%'
    },
    whyRecommended: {
      summary: 'Matches public health, municipal water treatment, and packaged drinking water quality procurement standards.',
      evidence: [
        { source: 'datab/is.10500.2012.pdf', section: 'Table 1 & Table 2', text: 'Prescribes mandatory potability and safety thresholds for Indian drinking water supplies.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 15328:2003', title: 'Plastics Piping for Underground Drainage', relationship: 'Water Network' }
    ]
  },
  {
    id: 'IS-694-2010',
    code: 'IS 694:2010',
    isNumber: 'IS 694:2010',
    title: 'Polyvinyl Chloride Insulated Cables for Working Voltages up to and Including 1100 V',
    category: 'Electrical Distribution',
    department: 'Electrotechnical Department (ETD)',
    committee: 'ETD 9 (Power Cables)',
    status: 'Active',
    revision: 'Fourth Revision',
    year: '2010',
    reviewedYear: 2023,
    reaffirmedYear: 2023,
    sourcePdfs: [
      'is.694.2010.pdf',
      'zIS694Amd.1_2012.pdf',
      'zIS694Amd.2_2014.pdf',
      'zIS694Amd.3_2015.pdf',
      'zIS694Amd.4_2020.pdf'
    ],
    amendments: [
      { number: 1, year: 2012, description: 'Conductor resistance and tolerance adjustments' },
      { number: 2, year: 2014, description: 'Flame retardant low smoke (FRLS) insulation criteria' },
      { number: 3, year: 2015, description: 'Halogen acid gas emission limits' },
      { number: 4, year: 2020, description: 'Marking and packaging standard updates' }
    ],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Power (Electrical Wires and Cables QCO)',
    scope: 'Covers requirements for single-core, twin-core, and multicore PVC insulated unsheathed and sheathed electric cables for working voltages up to 1100 V AC / DC.',
    keyRequirements: [
      'Voltage grade up to and including 1100 V',
      'High conductivity annealed copper or aluminium conductors conforming to IS 8130',
      'Type A PVC insulation compound conforming to IS 5831',
      'Spark test and 3000 V AC water immersion high voltage withstand test for 5 minutes',
      'FRLS options: Oxygen Index >= 29%, Temperature Index >= 250°C'
    ],
    clauses: [
      { number: 'Clause 5.1', title: 'Conductor Material', summary: 'Conductors shall consist of plain or tinned annealed copper or aluminium.' },
      { number: 'Clause 6.1', title: 'Insulation Application', summary: 'PVC insulation applied continuously by extrusion without flaws.' },
      { number: 'Clause 14.1', title: 'High Voltage Test', summary: 'Withstand 3 kV AC for 5 minutes without dielectric breakdown.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 94,
    coverageScore: 93,
    technicalScore: 95,
    appScore: 94,
    criteriaScores: {
      requirement: '94%',
      product: '95%',
      application: '94%',
      evidence: '93%'
    },
    whyRecommended: {
      summary: 'Matches low-voltage building wiring, power distribution, and industrial panel cabling specifications.',
      evidence: [
        { source: 'datab/is.694.2010.pdf', section: 'Clause 14 High Voltage Test', text: '1100V voltage grade with 3000V AC immersion proof test compliance.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 1293:2019', title: 'Plugs and Socket-Outlets up to 250V', relationship: 'Wiring Accessories' },
      { code: 'IS 15652:2006', title: 'Insulating Mats for Electrical Purposes', relationship: 'Electrical Safety' }
    ]
  },
  {
    id: 'IS-1489-1-2015',
    code: 'IS 1489 (Part 1):2015',
    isNumber: 'IS 1489 (Part 1):2015',
    title: 'Portland Pozzolana Cement — Specification (Part 1: Flyash based)',
    category: 'Civil & Construction',
    department: 'Civil Engineering Department (CED)',
    committee: 'CED 2 (Cement and Concrete)',
    status: 'Active',
    revision: 'Fourth Revision',
    year: '2015',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    sourcePdfs: ['IS1489_Part1_2015.pdf', 'is.1489.1.1991.pdf', 'zIS1489_Part1Amd.1_2018.pdf'],
    amendments: [
      { number: 1, year: 2018, description: 'Updated flyash uniformity and chloride content limits' }
    ],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Commerce & Industry (Cement QCO)',
    scope: 'Covers manufacture, chemical, and physical requirements of flyash-based Portland Pozzolana Cement for civil engineering, infrastructure, and structural concrete works.',
    keyRequirements: [
      'Compressive strength: 72h >= 16 MPa, 168h >= 22 MPa, 672h (28 days) >= 33 MPa',
      'Initial setting time >= 30 minutes; Final setting time <= 600 minutes',
      'Soundness: Le-Chatelier expansion <= 10 mm; Autoclave expansion <= 0.8%',
      'Fineness: Specific surface >= 300 m2/kg (Blaine air permeability method)',
      'Flyash constituent percentage: Minimum 15%, Maximum 35% by mass'
    ],
    clauses: [
      { number: 'Clause 6.1', title: 'Chemical Requirements', summary: 'Limits on insoluble residue, magnesia (<= 6.0%), and sulfuric anhydride (<= 3.5%).' },
      { number: 'Clause 7.1', title: 'Physical Requirements', summary: 'Compressive strength, setting times, soundness, and fineness benchmarks.' },
      { number: 'Clause 9.1', title: 'Marking & Packing', summary: 'Bags marked with IS 1489 (Part 1), flyash percentage, and ISI certification mark.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 93,
    coverageScore: 92,
    technicalScore: 94,
    appScore: 93,
    criteriaScores: {
      requirement: '93%',
      product: '94%',
      application: '93%',
      evidence: '92%'
    },
    whyRecommended: {
      summary: 'Matches civil infrastructure tender requirements for high durability, low-heat flyash-based Portland Pozzolana Cement.',
      evidence: [
        { source: 'datab/IS1489_Part1_2015.pdf', section: 'Clause 7 Physical Requirements', text: 'Minimum 28-day compressive strength of 33 MPa with 15-35% flyash blending.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 2062:2011', title: 'Hot Rolled Structural Steel', relationship: 'Civil Construction' },
      { code: 'IS 15328:2003', title: 'Plastics Piping for Underground Drainage', relationship: 'Municipal Works' }
    ]
  },
  {
    id: 'IS-15298-2-2011',
    code: 'IS 15298 (Part 2):2011',
    isNumber: 'IS 15298 (Part 2):2011',
    title: 'Personal Protective Equipment — Safety Footwear',
    category: 'Safety & Personal Protection',
    department: 'Chemical Department (CHD)',
    committee: 'CHD 8 (Occupational Safety and Health)',
    status: 'Active',
    revision: 'Second Revision',
    year: '2011',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    sourcePdfs: [
      'is.15298.1.2011.pdf',
      'is.15298.2.2011.pdf',
      'is.15298.3.2011.pdf',
      'is.15298.4.2010.pdf',
      'is.15298.5.2004.pdf',
      'is.15298.6.2004.pdf',
      'is.15298.7.2004.pdf',
      'is.15298.8.2004.pdf'
    ],
    amendments: [],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Commerce & Industry / DPIIT (Footwear QCO)',
    scope: 'Specifies basic and additional requirements for safety footwear used in industrial, construction, and mining applications, including toe impact, slip resistance, and penetration protection.',
    keyRequirements: [
      'Steel / composite toe protection: 200 Joules impact energy and 15 kN compression load',
      'Outsole slip resistance on ceramic tile with NaLS and steel floor with glycerol (SRA / SRB / SRC)',
      'Penetration-resistant outsole (P category >= 1100 N)',
      'Antistatic resistance (A category: 100 kOhm to 1000 MOhm)',
      'Upper leather tear strength >= 120 N and water penetration resistance'
    ],
    clauses: [
      { number: 'Clause 5.3', title: 'Toecap Impact Resistance', summary: 'Must withstand 200 J impact without clearance falling below safety limits.' },
      { number: 'Clause 5.8', title: 'Outsole Slip Resistance', summary: 'Friction coefficient verification across wet ceramic and lubricated steel surfaces.' },
      { number: 'Clause 6.2', title: 'Penetration Resistance', summary: 'Penetration force through sole shall be not less than 1100 N.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 95,
    coverageScore: 94,
    technicalScore: 96,
    appScore: 95,
    criteriaScores: {
      requirement: '95%',
      product: '96%',
      application: '95%',
      evidence: '94%'
    },
    whyRecommended: {
      summary: 'Matches industrial and construction PPE procurement requirements for heavy-duty safety footwear.',
      evidence: [
        { source: 'datab/is.15298.2.2011.pdf', section: 'Clause 5.3.2 Impact Test', text: 'Safety toecap tested to 200J impact and 15kN compression load.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 2925:1984', title: 'Industrial Safety Helmets', relationship: 'Worker PPE' }
    ]
  },
  {
    id: 'IS-15328-2003',
    code: 'IS 15328:2003',
    isNumber: 'IS 15328:2003',
    title: 'Plastics Piping Systems for Non-Pressure Underground Drainage and Sewerage — Unplasticized PVC (PVC-U)',
    category: 'Civil & Municipal Infrastructure',
    department: 'Civil Engineering Department (CED)',
    committee: 'CED 50 (Plastic Piping System)',
    status: 'Active',
    revision: 'First Publication',
    year: '2003',
    reviewedYear: 2023,
    reaffirmedYear: 2023,
    sourcePdfs: ['is.15328.2003.pdf', 'zIS15328Amd.6_2017.pdf', 'zIS15328Amd.7_2021.pdf'],
    amendments: [
      { number: 6, year: 2017, description: 'Updated ring flexibility and stiffness test parameters' },
      { number: 7, year: 2021, description: 'Revised elastomeric ring seal tightness testing methods' }
    ],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Housing and Urban Affairs / CPWD',
    scope: 'Specifies requirements for unplasticized polyvinyl chloride (PVC-U) pipes with socket ends for non-pressure underground drainage and sewerage systems.',
    keyRequirements: [
      'Nominal ring stiffness classes SN2, SN4, SN8 for burial load resistance',
      'Ring flexibility test without cracking or debonding at 30% diametric deflection',
      'Impact resistance at 0°C (True Impact Rate TIR <= 10%)',
      'Resistance to internal hydrostatic pressure (4.2 MPa at 20°C for 1 hour)',
      'Elastomeric sealing ring joint tightness under positive and negative hydrostatic pressure'
    ],
    clauses: [
      { number: 'Clause 4.1', title: 'Material Composition', summary: 'Virgin PVC resin without recycled scrap or incompatible plasticizers.' },
      { number: 'Clause 7.1', title: 'Ring Stiffness Test', summary: 'Stiffness determined in accordance with IS 15328 Clause 7 benchmarks.' },
      { number: 'Clause 8.2', title: 'Joint Tightness', summary: 'Elastomeric ring joint tested against water leakage under angular deflection.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 92,
    coverageScore: 91,
    technicalScore: 93,
    appScore: 92,
    criteriaScores: {
      requirement: '92%',
      product: '93%',
      application: '92%',
      evidence: '91%'
    },
    whyRecommended: {
      summary: 'Matches municipal underground drainage and sewerage pipe procurement specifications.',
      evidence: [
        { source: 'datab/is.15328.2003.pdf', section: 'Clause 7 Mechanical Characteristics', text: 'Ring stiffness classes SN4 and SN8 for underground trench installation.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 10500:2012', title: 'Drinking Water Specification', relationship: 'Public Works' }
    ]
  },
  {
    id: 'IS-1293-2019',
    code: 'IS 1293:2019',
    isNumber: 'IS 1293:2019',
    title: 'Plugs and Socket-Outlets for Household and Similar Purposes of Rated Voltage up to 250V',
    category: 'Electrical Distribution',
    department: 'Electrotechnical Department (ETD)',
    committee: 'ETD 14 (Electrical Accessories)',
    status: 'Active',
    revision: 'Fourth Revision',
    year: '2019',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    sourcePdfs: ['IS1293_2019.pdf', 'is.1293.2005.pdf', 'zIS1293Amd.1_2020.pdf'],
    amendments: [
      { number: 1, year: 2020, description: 'Clarification on shuttered socket dimensions and transition timeline' }
    ],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Commerce & Industry (Electrical Equipment QCO)',
    scope: 'Applies to plugs and fixed or portable socket-outlets for AC only, with or without earthing contact, rated voltage up to 250V and rated current up to 16A.',
    keyRequirements: [
      'Rated voltage 250V AC; Rated currents 6A, 10A, 16A',
      'Mandatory safety shutter mechanism on socket-outlets to prevent accidental contact',
      'Insulation resistance not less than 5 MOhm at 500V DC',
      'Electric dielectric strength 2000V AC for 1 minute without flashover',
      'Temperature rise limit <= 45 K at current terminals under full load'
    ],
    clauses: [
      { number: 'Clause 9.1', title: 'Protection Against Electric Shock', summary: 'Live contacts inaccessible when plug is partially or fully engaged.' },
      { number: 'Clause 19.1', title: 'Temperature Rise Test', summary: 'Terminal temperature rise shall not exceed 45°C during continuous rated load.' },
      { number: 'Clause 28.1', title: 'Resistance to Heat and Fire', summary: 'Glow wire test at 850°C for insulating parts holding live components.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 94,
    coverageScore: 93,
    technicalScore: 95,
    appScore: 94,
    criteriaScores: {
      requirement: '94%',
      product: '95%',
      application: '94%',
      evidence: '93%'
    },
    whyRecommended: {
      summary: 'Matches public electrical fixtures and government building wiring accessories procurement tenders.',
      evidence: [
        { source: 'datab/IS1293_2019.pdf', section: 'Clause 9 & Clause 19', text: 'Shuttered 250V socket-outlets rated 6A/16A with 45K temperature rise limits.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 694:2010', title: 'PVC Insulated Cables', relationship: 'Wiring Systems' },
      { code: 'IS 302 (Part 1):2008', title: 'Electrical Appliance Safety', relationship: 'Connected Devices' }
    ]
  },
  {
    id: 'IS-15652-2006',
    code: 'IS 15652:2006',
    isNumber: 'IS 15652:2006',
    title: 'Insulating Mats for Electrical Purposes',
    category: 'Electrical Safety',
    department: 'Electrotechnical Department (ETD)',
    committee: 'ETD 23 (Electrical Installations & Safety)',
    status: 'Active',
    revision: 'First Edition',
    year: '2006',
    reviewedYear: 2023,
    reaffirmedYear: 2023,
    sourcePdfs: ['is.15652.2006.pdf'],
    amendments: [],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Heavy Industries / CEA Safety Regulations',
    scope: 'Specifies requirements for elastomer insulating mats used as floor covering for personal protection of workers on AC and DC electrical switchgear and transformer installations up to 33 kV.',
    keyRequirements: [
      'Voltage classes: Class 0 (up to 3.3 kV), Class 1 (up to 11 kV), Class 2 (up to 33 kV)',
      'Dielectric proof voltage test (50 kV for Class 2) for 1 minute without puncture',
      'Flame retardancy and self-extinguishing properties',
      'Acid, alkali, transformer oil, and low-temperature resistant elastomeric matrix',
      'Anti-skid upper surface pattern with thickness 2.0 mm to 3.5 mm'
    ],
    clauses: [
      { number: 'Clause 5.1', title: 'Dielectric Proof Test', summary: 'Mats subjected to specified proof voltage across 100% surface without puncture.' },
      { number: 'Clause 6.3', title: 'Mechanical Properties', summary: 'Tensile strength >= 15 N/mm2, elongation at break >= 250%.' },
      { number: 'Clause 7.2', title: 'Flammability Test', summary: 'Self-extinguishing within 5 seconds after flame removal.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 96,
    coverageScore: 95,
    technicalScore: 97,
    appScore: 96,
    criteriaScores: {
      requirement: '96%',
      product: '97%',
      application: '96%',
      evidence: '95%'
    },
    whyRecommended: {
      summary: 'Matches substation, HT/LT panel room, and electrical switchgear personal safety mat requirements.',
      evidence: [
        { source: 'datab/is.15652.2006.pdf', section: 'Clause 5.1 Dielectric Proof', text: 'Class 0, 1, 2 elastomeric insulating mats with 50kV breakdown test compliance.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 694:2010', title: 'PVC Insulated Cables', relationship: 'Power Systems' },
      { code: 'IS 2925:1984', title: 'Industrial Safety Helmets', relationship: 'Personnel Safety' }
    ]
  },
  {
    id: 'IS-302-1-2008',
    code: 'IS 302 (Part 1):2008',
    isNumber: 'IS 302 (Part 1):2008',
    title: 'Safety of Household and Similar Electrical Appliances — General Requirements',
    category: 'Electrical & Consumer Safety',
    department: 'Electrotechnical Department (ETD)',
    committee: 'ETD 32 (Electrical Appliances)',
    status: 'Active',
    revision: 'Sixth Revision',
    year: '2008',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    sourcePdfs: ['is.302.1.2008.pdf', 'zIS302_Part1Amd.3_2014.pdf', 'zIS302_Part1Amd.4_2015.pdf'],
    amendments: [
      { number: 3, year: 2014, description: 'Updated creepage distances and insulation requirements' },
      { number: 4, year: 2015, description: 'Revised abnormal operation test limits' }
    ],
    certification: 'Mandatory ISI Mark',
    ministry: 'Ministry of Heavy Industries (Household Electrical Appliances QCO)',
    scope: 'Deals with the safety of electrical appliances for household, commercial, and institutional procurement with rated voltage not exceeding 250V for single phase and 480V for other appliances.',
    keyRequirements: [
      'Protection against access to live parts with standard test probe',
      'Heating and temperature rise tests under continuous duty',
      'Leakage current <= 0.75 mA and dielectric strength 1500V AC test',
      'Moisture resistance and IP protection grade verification',
      'Mechanical strength impact drop test with spring-operated hammer'
    ],
    clauses: [
      { number: 'Clause 8.1', title: 'Protection Against Shock', summary: 'Live parts inaccessible with standard jointed test finger.' },
      { number: 'Clause 11.1', title: 'Heating Test', summary: 'Appliance operated under normal use without exceeding permissible temperature limits.' },
      { number: 'Clause 13.1', title: 'Electric Strength at Operating Temp', summary: 'Withstand 1500V AC test without insulation breakdown.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 91,
    coverageScore: 90,
    technicalScore: 92,
    appScore: 91,
    criteriaScores: {
      requirement: '91%',
      product: '92%',
      application: '91%',
      evidence: '90%'
    },
    whyRecommended: {
      summary: 'General baseline safety standard for all commercial and institutional electrical appliance procurements.',
      evidence: [
        { source: 'datab/is.302.1.2008.pdf', section: 'Clause 8 & Clause 13', text: 'Prescribes mandatory electric shock protection and dielectric safety benchmarks.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 1293:2019', title: 'Plugs and Socket-Outlets', relationship: 'Power Inlets' },
      { code: 'IS 694:2010', title: 'PVC Insulated Flexible Cords', relationship: 'Supply Cords' }
    ]
  },
  {
    id: 'IS-12-2005',
    code: 'IS 12:2005',
    isNumber: 'IS 12:2005 (Amd 1:2014)',
    title: 'Guide on Methods of Test for Rubber and Rubber Products',
    category: 'Manufacturing & Materials',
    department: 'Petroleum, Coal & Related Products Department (PCD)',
    committee: 'PCD 13 (Rubber and Rubber Products)',
    status: 'Active',
    revision: 'Third Revision',
    year: '2005',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    sourcePdfs: ['zIS12Amd.1_2014.pdf'],
    amendments: [
      { number: 1, year: 2014, description: 'Updated cross-references and test apparatus calibration guidelines' }
    ],
    certification: 'Testing Standard / Reference',
    ministry: 'Ministry of Commerce & Industry',
    scope: 'Provides guidance on selection of methods of test for vulcanized, synthetic, and thermoplastic rubbers for industrial products, safety gear, and gaskets.',
    keyRequirements: [
      'Tensile stress-strain properties and modulus determination',
      'Accelerated aging and heat resistance testing protocols',
      'Compression set at ambient and elevated temperatures',
      'Hardness testing (IRHD and Shore A scales)',
      'Tear strength and resistance to liquids/chemicals'
    ],
    clauses: [
      { number: 'Clause 3.1', title: 'Tensile Testing Methods', summary: 'Standard dumbbell specimen test protocols for tensile strength and elongation.' },
      { number: 'Clause 4.2', title: 'Accelerated Aging Test', summary: 'Air oven aging at elevated temperatures to evaluate compound degradation.' }
    ],
    demo: true,
    relevance: 'Strong Match',
    matchScore: 89,
    coverageScore: 88,
    technicalScore: 90,
    appScore: 89,
    criteriaScores: {
      requirement: '89%',
      product: '90%',
      application: '89%',
      evidence: '88%'
    },
    whyRecommended: {
      summary: 'Testing reference standard for elastomeric parts, safety mats, PPE sole components, and rubber seals.',
      evidence: [
        { source: 'datab/zIS12Amd.1_2014.pdf', section: 'Amd 1 Calibration Norms', text: 'Prescribes precise testing methods for rubber components.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 15652:2006', title: 'Insulating Mats for Electrical Purposes', relationship: 'Material Testing' },
      { code: 'IS 15298 (Part 2):2011', title: 'Safety Footwear Outsole Norms', relationship: 'Compound Testing' }
    ]
  }
];

export const sampleStandards = mockStandards;
