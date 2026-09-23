export const mockStandards = [
  {
    id: 'IS-2062-2025',
    code: 'IS 2062 (Part 1):2025',
    isNumber: 'IS 2062 (Part 1):2025',
    title: 'Structural Steel - Part 1 - Hot Rolled Medium and High Tensile Steel',
    category: 'Steel & Construction',
    department: 'Civil Engineering Department (CED)',
    committee: 'CED 7 (Structural Engineering & Structural Sections)',
    status: 'Current',
    revision: 'Seventh Revision',
    year: '2025',
    reviewedYear: 2025,
    reaffirmedYear: 2025,
    amendments: [
      { number: 1, year: 2025 }
    ],
    certification: 'Mandatory Certification',
    ministry: 'Ministry of Steel / MoRTH',
    scope: 'Covers requirements for hot-rolled medium and high tensile structural steel plates, shapes, and sections used in structural steelwork, bridges, buildings, and infrastructure projects.',
    demo: true,
    relevance: 'Strong Match',
    matchScore: 96,
    coverageScore: 96,
    technicalScore: 98,
    appScore: 94,
    criteriaScores: {
      requirement: '96%',
      product: '98%',
      application: '94%',
      evidence: '91%'
    },
    whyRecommended: {
      summary: 'Matches structural steel requirement for hot-rolled medium and high tensile steel in bridge and building construction.',
      evidence: [
        { source: 'Tender Spec Sec 3.1', section: 'Steel Grade & Specification', text: 'Structural steel members must comply with Fe 410 / Fe 540 grade hot-rolled steel.', status: 'Verified Match' },
        { source: 'Tender Spec Sec 3.4', section: 'Yield Stress & Elongation', text: 'Minimum yield strength 350 MPa with minimum 20% elongation required.', status: 'Verified Match' },
        { source: 'BIS Catalogue Record', section: 'Current Status Verification', text: 'IS 2062 (Part 1):2025 confirmed as current active edition (7th Revision).', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 800:2007', title: 'General Construction in Steel — Code of Practice', relationship: 'References' },
      { code: 'IS 875 (Part 3):2021', title: 'Code of Practice for Design Loads (Wind Loads)', relationship: 'Related' },
      { code: 'IS 1893 (Part 1):2025', title: 'Criteria for Earthquake Resistant Design of Structures', relationship: 'Referenced By' },
      { code: 'IS 9595:2018', title: 'Recommendation for Metal Arc Welding of Carbon Steel', relationship: 'Testing' }
    ]
  },
  {
    id: 'IS-456-2000',
    code: 'IS 456:2000',
    isNumber: 'IS 456:2000',
    title: 'Plain and Reinforced Concrete - Code of Practice',
    category: 'Civil & Construction',
    department: 'Civil Engineering Department (CED)',
    committee: 'CED 2 (Cement and Concrete)',
    status: 'Current',
    revision: 'Fourth Revision',
    year: '2000',
    reviewedYear: 2025,
    reaffirmedYear: 2026,
    amendments: [
      { number: 1, year: 2001 },
      { number: 2, year: 2005 },
      { number: 3, year: 2007 },
      { number: 4, year: 2013 },
      { number: 5, year: 2019 },
      { number: 6, year: 2024 }
    ],
    certification: 'Code of Practice / Voluntary',
    ministry: 'Ministry of Housing and Urban Affairs',
    scope: 'Deals with the general structural use of plain and reinforced concrete in buildings and civil engineering structures, specifying design methods, durability criteria, and quality control.',
    demo: true,
    relevance: 'Strong Match',
    matchScore: 94,
    coverageScore: 94,
    technicalScore: 95,
    appScore: 93,
    criteriaScores: {
      requirement: '94%',
      product: '96%',
      application: '93%',
      evidence: '92%'
    },
    whyRecommended: {
      summary: 'Matches structural concrete requirements for mix design, compressive strength, and durability standards.',
      evidence: [
        { source: 'Civil Tender Spec Clause 4.1', section: 'Concrete Grade', text: 'Minimum characteristic compressive strength of M30 grade concrete required.', status: 'Verified Match' },
        { source: 'Civil Tender Spec Clause 5.2', section: 'Cover & Durability', text: '50mm clear cover specified for severe exposure conditions.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 1786:2008', title: 'High Strength Deformed Steel Bars for Concrete Reinforcement', relationship: 'References' },
      { code: 'IS 383:2016', title: 'Coarse and Fine Aggregate for Concrete', relationship: 'References' },
      { code: 'IS 10262:2019', title: 'Concrete Mix Proportioning — Guidelines', relationship: 'Related' },
      { code: 'IS 13920:2016', title: 'Ductile Design and Detailing of Reinforced Concrete', relationship: 'Referenced By' }
    ]
  },
  {
    id: 'IS-1786-2008',
    code: 'IS 1786:2008',
    isNumber: 'IS 1786:2008',
    title: 'High Strength Deformed Steel Bars and Wires for Concrete Reinforcement',
    category: 'Steel & Construction',
    department: 'Civil Engineering Department (CED)',
    committee: 'CED 54 (Concrete Reinforcement)',
    status: 'Current',
    revision: 'Fourth Revision',
    year: '2008',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    amendments: [
      { number: 1, year: 2010 },
      { number: 2, year: 2013 },
      { number: 3, year: 2019 }
    ],
    certification: 'Mandatory Certification',
    ministry: 'Ministry of Steel',
    scope: 'Covers physical, chemical, and mechanical requirements for high strength deformed TMT steel bars and wires (Fe 500D, Fe 550D) used as reinforcement in concrete.',
    demo: true,
    relevance: 'Strong Match',
    matchScore: 92,
    coverageScore: 90,
    technicalScore: 94,
    appScore: 92,
    criteriaScores: {
      requirement: '92%',
      product: '94%',
      application: '92%',
      evidence: '90%'
    },
    whyRecommended: {
      summary: 'Matches structural steel grade, yield stress specifications, and tensile strength standards for concrete reinforcement.',
      evidence: [
        { source: 'Civil Tender Spec Sec 3', section: 'Tensile Strength', text: 'Minimum yield strength Fe 500D with 16% elongation mandatory.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 456:2000', title: 'Plain and Reinforced Concrete — Code of Practice', relationship: 'Referenced By' },
      { code: 'IS 2062 (Part 1):2025', title: 'Structural Steel Specification', relationship: 'Related' },
      { code: 'IS 13920:2016', title: 'Ductile Detailing of Concrete Structures', relationship: 'Related' }
    ]
  },
  {
    id: 'IS-694-2010',
    code: 'IS 694:2010',
    isNumber: 'IS 694:2010',
    title: 'Polyvinyl Chloride Insulated Cables/Cords for Working Voltages Up to and Including 1100 V',
    category: 'Electrical Distribution',
    department: 'Electrotechnical Department (ETD)',
    committee: 'ETD 9 (Power Cables)',
    status: 'Current',
    revision: 'Fourth Revision',
    year: '2010',
    reviewedYear: 2023,
    reaffirmedYear: 2023,
    amendments: [
      { number: 1, year: 2012 },
      { number: 2, year: 2014 },
      { number: 3, year: 2017 },
      { number: 4, year: 2021 }
    ],
    certification: 'Mandatory Certification',
    ministry: 'Ministry of Power',
    scope: 'Covers single-core and multi-core PVC insulated cables for electric power, lighting, and internal wiring in commercial and industrial installations.',
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
      evidence: '89%'
    },
    whyRecommended: {
      summary: 'Matches low-voltage insulated copper/aluminum cabling specifications for building power distribution.',
      evidence: [
        { source: 'Electrical Tender Spec 2.1', section: 'Cable Insulation', text: '1100V grade FRLS PVC insulated copper wiring required.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 732:2019', title: 'Electrical Wiring Installations Code of Practice', relationship: 'References' },
      { code: 'IS 8130:2013', title: 'Conductors for Insulated Electric Cables', relationship: 'References' },
      { code: 'IS 5831:1984', title: 'PVC Insulation and Sheath of Electric Cables', relationship: 'Testing' }
    ]
  },
  {
    id: 'IS-10500-2012',
    code: 'IS 10500:2012',
    isNumber: 'IS 10500:2012',
    title: 'Drinking Water Specification',
    category: 'Water & Environmental',
    department: 'Chemical Department (CHD)',
    committee: 'CHD 13 (Water Quality)',
    status: 'Current',
    revision: 'Second Revision',
    year: '2012',
    reviewedYear: 2023,
    reaffirmedYear: 2023,
    amendments: [
      { number: 1, year: 2015 },
      { number: 2, year: 2018 },
      { number: 3, year: 2020 },
      { number: 4, year: 2021 }
    ],
    certification: 'Mandatory Certification',
    ministry: 'Ministry of Jal Shakti / FSSAI',
    scope: 'Prescribes physical, chemical, biological, and bacteriological requirements and permissible limits for drinking water quality across India.',
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
      evidence: '93%'
    },
    whyRecommended: {
      summary: 'Matches municipal and packaged drinking water quality parameters including TDS, pH, turbidity, and coliform limits.',
      evidence: [
        { source: 'Water Supply Spec Sec 1', section: 'Potability Parameters', text: 'TDS < 500 mg/l, pH 6.5-8.5, zero coliform organisms per 100ml.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 3025 (Part 32):2025', title: 'Methods of Water Testing — Chloride', relationship: 'Testing' },
      { code: 'IS 1622:2026', title: 'Sampling and Microbiological Examination of Water', relationship: 'References' },
      { code: 'IS 15185:2016', title: 'Detection of E. coli and Coliform Bacteria', relationship: 'Testing' }
    ]
  },
  {
    id: 'IS-17017-2021',
    code: 'IS 17017 (Part 1):2021',
    isNumber: 'IS 17017 (Part 1):2021',
    title: 'Electric Vehicle Conductive Charging System - Part 1: General Requirements',
    category: 'EV & Smart Mobility',
    department: 'Electrotechnical Department (ETD)',
    committee: 'ETD 69 (EV Charging Infrastructure)',
    status: 'Current',
    revision: 'First Edition',
    year: '2021',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    amendments: [
      { number: 1, year: 2023 }
    ],
    certification: 'Mandatory Certification',
    ministry: 'Ministry of Heavy Industries / Ministry of Power',
    scope: 'Specifies general requirements for conductive charging of electric road vehicles, AC/DC supply voltages up to 1000V AC and 1500V DC, and safety protocols.',
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
      evidence: '87%'
    },
    whyRecommended: {
      summary: 'Matches public EV charging station tender specifications for CCS2 / Type 2 AC connector compliance and safety.',
      evidence: [
        { source: 'EV Station RFP Clause 3.2', section: 'Charger Compliance', text: 'Dual-gun EVSE charger complying with IS 17017 Part 1 mandatory.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 694:2010', title: 'PVC Insulated Cables Specification', relationship: 'Related' },
      { code: 'IS 732:2019', title: 'Electrical Wiring Installations Code', relationship: 'References' },
      { code: 'IS/IEC 60947:2020', title: 'Low Voltage Switchgear General Rules', relationship: 'Related' }
    ]
  },
  {
    id: 'IS-1893-2025',
    code: 'IS 1893 (Part 1):2025',
    isNumber: 'IS 1893 (Part 1):2025',
    title: 'Criteria for Earthquake Resistant Design of Structures - Part 1: General Provisions',
    category: 'Civil & Construction',
    department: 'Civil Engineering Department (CED)',
    committee: 'CED 39 (Earthquake Engineering)',
    status: 'Current',
    revision: 'Seventh Revision',
    year: '2025',
    reviewedYear: 2025,
    reaffirmedYear: 2025,
    amendments: [],
    certification: 'Code of Practice / Mandatory for High-Rise',
    ministry: 'Ministry of Earth Sciences',
    scope: 'Specifies seismic design forces, zone factors (Zones II to V), response spectrum curves, and structural design criteria for earthquake resistance in India.',
    demo: true,
    relevance: 'Strong Match',
    matchScore: 88,
    coverageScore: 87,
    technicalScore: 89,
    appScore: 88,
    criteriaScores: {
      requirement: '88%',
      product: '89%',
      application: '88%',
      evidence: '86%'
    },
    whyRecommended: {
      summary: 'Matches seismic zone IV structural load specifications and dynamic earthquake analysis parameters.',
      evidence: [
        { source: 'Structural Design Report Sec 2', section: 'Seismic Zone Factor', text: 'Structure located in Zone IV (Z = 0.24) requiring modal dynamic analysis.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 456:2000', title: 'Plain and Reinforced Concrete Code', relationship: 'References' },
      { code: 'IS 13920:2016', title: 'Ductile Detailing of Concrete Structures', relationship: 'References' },
      { code: 'IS 875 (Part 3):2021', title: 'Design Loads for Buildings (Wind Loads)', relationship: 'Related' }
    ]
  },
  {
    id: 'IS-732-2019',
    code: 'IS 732:2019',
    isNumber: 'IS 732:2019',
    title: 'Code of Practice for Electrical Wiring Installations',
    category: 'Electrical Distribution',
    department: 'Electrotechnical Department (ETD)',
    committee: 'ETD 20 (Electrical Installations)',
    status: 'Current',
    revision: 'Fourth Revision',
    year: '2019',
    reviewedYear: 2024,
    reaffirmedYear: 2024,
    amendments: [
      { number: 1, year: 2021 }
    ],
    certification: 'Code of Practice / Voluntary',
    ministry: 'Ministry of Power',
    scope: 'Specifies safety requirements, conductor sizing, earthing, isolation, and protection for low-voltage electrical installations in residential and commercial buildings.',
    demo: true,
    relevance: 'Strong Match',
    matchScore: 87,
    coverageScore: 86,
    technicalScore: 88,
    appScore: 87,
    criteriaScores: {
      requirement: '87%',
      product: '88%',
      application: '87%',
      evidence: '85%'
    },
    whyRecommended: {
      summary: 'Matches building internal wiring, distribution board earthing, and protection circuit specifications.',
      evidence: [
        { source: 'Building Electrical Spec 1.2', section: 'Earthing & Wiring', text: 'Copper tape earthing with TN-S system complying with IS 732 mandatory.', status: 'Verified Match' }
      ]
    },
    relatedStandards: [
      { code: 'IS 694:2010', title: 'PVC Insulated Cables Specification', relationship: 'References' },
      { code: 'IS 3043:2018', title: 'Code of Practice for Earthing', relationship: 'References' },
      { code: 'IS 12640:2016', title: 'Residual Current Circuit Breakers (RCCBs)', relationship: 'Related' }
    ]
  }
];

export const sampleStandards = mockStandards;
