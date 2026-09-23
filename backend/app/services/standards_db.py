from typing import List, Optional
from app.schemas.standards import IndianStandard, ClauseInfo, VersionItem, CertificationItem, SourceEvidence, RelatedStandardItem, StandardGraph, GraphNode, GraphEdge

STANDARDS_KNOWLEDGE_BASE: List[IndianStandard] = [
    IndianStandard(
        id="is-2925-1984",
        is_number="IS 2925 : 1984",
        title="Industrial Safety Helmets",
        category="Personal Protective Equipment",
        status="Active",
        year="1984",
        scope="Specifies physical, performance, and testing requirements for industrial safety helmets for construction, mining, and industrial personnel protection against impact and electrical shock.",
        key_requirements=[
            "Shock absorption performance tests (max force transmission <= 5.0 kN)",
            "Penetration resistance with 3kg drop weight",
            "Flame resistance and lateral rigidity",
            "Electrical insulation up to 1.2 kV for electrical hazards",
            "Adjustable chin strap retaining system (release force 150N - 250N)"
        ],
        clauses=[
            ClauseInfo(number="Clause 4.1", title="Materials & Construction", summary="Shell must be smooth, impact resistant HDPE, ABS or fiberglass with non-irritating harness.", is_mandatory=True),
            ClauseInfo(number="Clause 5.2", title="Shock Absorption Test", summary="Deceleration of headform shall not exceed 50g acceleration equivalent.", is_mandatory=True),
            ClauseInfo(number="Clause 6.1", title="Electrical Insulation", summary="Leaking current shall not exceed 3mA under 1200V AC test.", is_mandatory=True),
            ClauseInfo(number="Clause 7.4", title="Marking & BIS Logo", summary="Must carry IS number, Manufacturer trademark, Year of manufacture and ISI mark.", is_mandatory=True),
        ],
        related_standards=[
            RelatedStandardItem(id="is-4681-1981", is_number="IS 4681 : 1981", title="Method of Testing Safety Helmets", relationship="testing", description="Detailed laboratory impact and penetration test protocols."),
            RelatedStandardItem(id="is-4707-2020", is_number="IS 4707 : 2020", title="Safety Standards for Personal Protective Clothing", relationship="safety", description="Guidelines on integrated safety gear and high-visibility apparel."),
            RelatedStandardItem(id="is-2062-2011", is_number="IS 2062 : 2011", title="Hot Rolled Medium and High Tensile Structural Steel", relationship="normative-reference", description="Reference for structural scaffolding and head impact hazard environments."),
            RelatedStandardItem(id="is-14489-1998", is_number="IS 14489 : 1998", title="Code of Practice for Occupational Safety Audits", relationship="installation", description="Audit protocols for personal protective equipment deployment.")
        ],
        versions=[
            VersionItem(year="1964", title="First Publication", type="original", description="Initial specification for head protection in industrial sites."),
            VersionItem(year="1984", title="Second Revision (Current)", type="revision", description="Incorporated ergonomic harness design and high voltage electrical insulation."),
            VersionItem(year="2018", title="Amendment 1", type="amendment", description="Updated chin strap tension test limits."),
            VersionItem(year="2024", title="Reaffirmed 2024 (Latest)", type="latest", description="Reaffirmed by BIS technical committee without structural changes.")
        ],
        certifications=[
            CertificationItem(scheme="BIS Product Certification Scheme (ISI Mark)", status="Information Available", details="Mandatory ISI Mark certification required for public procurement under Quality Control Order.", is_mandatory=True),
            CertificationItem(scheme="CRS (Compulsory Registration Scheme)", status="Not Applicable", details="CRS applies to electronic items; IS 2925 falls under ISI Mark scheme.", is_mandatory=False),
            CertificationItem(scheme="Hallmarking", status="Not Applicable", details="Not applicable to industrial headwear.", is_mandatory=False)
        ],
        sources=[
            SourceEvidence(section="Section 4 - Performance Requirements", clause="Clause 4.2.1", text="Industrial safety helmets shall provide adequate protection to the crown against falling objects and impact shocks.", confidence=0.98, verified=True),
            SourceEvidence(section="Section 6 - Electrical Tests", clause="Clause 6.1", text="Helmets for electrical utility workers must satisfy 1.2 kV dielectric voltage test without breakdown.", confidence=0.95, verified=True)
        ]
    ),
    IndianStandard(
        id="is-2062-2011",
        is_number="IS 2062 : 2011",
        title="Hot Rolled Medium and High Tensile Structural Steel",
        category="Civil & Structural Materials",
        status="Active",
        year="2011",
        scope="Covers requirements for structural steel sections, plates, flats, and bars suitable for welded, bolted, and riveted structural fabrication.",
        key_requirements=[
            "Minimum Yield Strength E250 / E350 / E450 grade classifications",
            "Tensile strength testing range 410 - 630 MPa",
            "Charpy V-notch impact toughness test at 0°C and -20°C",
            "Carbon Equivalent (CE) limitation <= 0.42% for weldability",
            "Bend test without fracture on inner bend radius"
        ],
        clauses=[
            ClauseInfo(number="Clause 6.1", title="Chemical Composition", summary="Specifies strict limits on Sulphur (<= 0.045%) and Phosphorus (<= 0.045%).", is_mandatory=True),
            ClauseInfo(number="Clause 8.3", title="Tensile Test Requirements", summary="Specifies yield stress, tensile strength, and percentage elongation.", is_mandatory=True),
            ClauseInfo(number="Clause 12.1", title="Tolerance on Dimensions", summary="Dimensions shall conform to IS 1852 standards.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-1608-2018", is_number="IS 1608 : 2018", title="Metallic Materials Tensile Testing", relationship="testing", description="Test procedure for yield and tensile strength."),
            RelatedStandardItem(id="is-800-2007", is_number="IS 800 : 2007", title="Code of Practice for General Construction in Steel", relationship="installation", description="Design and installation standards for structural steelwork.")
        ],
        versions=[
            VersionItem(year="1999", title="Fifth Revision", type="original", description="Consolidated grade specifications."),
            VersionItem(year="2011", title="Seventh Revision (Current)", type="revision", description="Introduced sub-quality classifications (A, BR, BO, C) based on impact energy."),
            VersionItem(year="2019", title="Amendment 2", type="amendment", description="Revised carbon equivalent calculation formulas for ultra-high strength grades."),
            VersionItem(year="2025", title="Latest Available", type="latest", description="Reaffirmed active standard by Bureau of Indian Standards.")
        ],
        certifications=[
            CertificationItem(scheme="BIS ISI Mark Scheme", status="Information Available", details="Mandatory certification for steel plates and structural shapes under Steel and Steel Products QCO.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 8 - Mechanical Properties", clause="Clause 8.1", text="Steel shall conform to mechanical property requirements for grades E250 to E650.", confidence=0.96, verified=True)
        ]
    ),
    IndianStandard(
        id="is-15652-2006",
        is_number="IS 15652 : 2006",
        title="Insulating Mats for Electrical Purposes",
        category="Electrical Safety Equipment",
        status="Active",
        year="2006",
        scope="Specifies characteristics for elastomer insulating mats used as floor covering for personal protection of workers on AC and DC high voltage electrical installations.",
        key_requirements=[
            "Class 0 (up to 3.3 kV), Class 1 (11 kV), Class 2 (33 kV) rating insulation",
            "Dielectric strength testing with 50 kV proof voltage",
            "Flame retardancy and self-extinguishing properties",
            "Acid, alkali, oil, and low-temperature resistant elastomeric compound",
            "Anti-skid texture surface with minimum thickness 2.0 mm to 3.5 mm"
        ],
        clauses=[
            ClauseInfo(number="Clause 5.1", title="Dielectric Proof Test", summary="No electrical puncture or breakdown at specified proof voltage for 1 minute.", is_mandatory=True),
            ClauseInfo(number="Clause 6.3", title="Tensile Strength & Elongation", summary="Tensile strength >= 15 N/mm2, elongation at break >= 250%.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-2071-2014", is_number="IS 2071 : 2014", title="High Voltage Test Techniques", relationship="testing", description="High voltage breakdown test procedures."),
            RelatedStandardItem(id="is-5216-1982", is_number="IS 5216 : 1982", title="Recommendations on Safety Procedures in Electrical Work", relationship="safety", description="Safety guidelines for electrical switchgear rooms.")
        ],
        versions=[
            VersionItem(year="2006", title="First Edition", type="revision", description="Replaced legacy rubber mat standard IS 5424 with synthetic elastomeric specifications."),
            VersionItem(year="2023", title="Reaffirmed (Latest)", type="latest", description="Reaffirmed active standard.")
        ],
        certifications=[
            CertificationItem(scheme="BIS ISI Mark Scheme", status="Information Available", details="Mandatory certification for electrical safety mats under Electrical Equipment QCO.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 5 - Electrical Requirements", clause="Clause 5.1", text="Insulating mats shall withstand specified withstand voltage without flashover.", confidence=0.99, verified=True)
        ]
    ),
    IndianStandard(
        id="is-302-2-3-2007",
        is_number="IS 302 (Part 2/Sec 3) : 2007",
        title="Safety of Household and Similar Electrical Appliances - Electric Irons",
        category="Electrical & Electronics",
        status="Active",
        year="2007",
        scope="Deals with safety of electric dry irons and steam irons for household and commercial procurement.",
        key_requirements=[
            "Protection against access to live parts",
            "Heating element insulation resistance > 2 Mohm under humid conditions",
            "Thermostatic cutoff temperature limit compliance",
            "Mechanical strength drop test from 400mm height"
        ],
        clauses=[
            ClauseInfo(number="Clause 8", title="Protection against Electric Shock", summary="Live parts shall not be accessible with standard test finger.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-302-1-2008", is_number="IS 302 (Part 1) : 2008", title="General Safety Requirements for Electrical Appliances", relationship="normative-reference", description="General appliance safety code.")
        ],
        versions=[
            VersionItem(year="2007", title="Current Revision", type="latest", description="Active published standard.")
        ],
        certifications=[
            CertificationItem(scheme="BIS Product Certification", status="Information Available", details="Mandatory ISI marking required under Household Electrical Appliances Quality Order.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 8 - Insulation", clause="Clause 8.1", text="Electric irons shall provide double or reinforced insulation for safety.", confidence=0.94, verified=True)
        ]
    ),
    IndianStandard(
        id="is-10500-2012",
        is_number="IS 10500 : 2012",
        title="Drinking Water — Specification",
        category="Civil, Public Health & Environment",
        status="Active",
        year="2012",
        scope="Prescribes the quality limits for physical, chemical, and bacteriological parameters of drinking water supplied for public consumption and institutional procurement.",
        key_requirements=[
            "Turbidity acceptable limit <= 1 NTU (max permissible 5 NTU)",
            "pH range acceptable 6.5 to 8.5 (no relaxation)",
            "Total Dissolved Solids (TDS) acceptable limit 500 mg/l (max permissible 2000 mg/l)",
            "Total Hardness (as CaCO3) acceptable limit 200 mg/l (max 600 mg/l)",
            "E. coli or thermotolerant coliform bacteria: Shall not be detectable in any 100 ml sample",
            "Toxic heavy metals limits: Arsenic <= 0.01 mg/l, Lead <= 0.01 mg/l, Chromium <= 0.05 mg/l"
        ],
        clauses=[
            ClauseInfo(number="Clause 3", title="Sampling Procedures", summary="Samples shall be taken as per IS 1622 and IS 3025 guidelines.", is_mandatory=True),
            ClauseInfo(number="Clause 4.1", title="Physical & Chemical Requirements", summary="Table 1 & Table 2 parameters must meet acceptable limits.", is_mandatory=True),
            ClauseInfo(number="Clause 4.2", title="Bacteriological Quality", summary="Water must be free from coliform organisms and microbial pathogens.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-3025-methods", is_number="IS 3025", title="Methods of Sampling and Test for Water and Wastewater", relationship="testing", description="Testing methods for physical and chemical parameters."),
            RelatedStandardItem(id="is-1622-1981", is_number="IS 1622 : 1981", title="Methods of Sampling and Microbiological Examination of Water", relationship="testing", description="Bacteriological testing protocols.")
        ],
        versions=[
            VersionItem(year="1991", title="First Revision", type="original", description="Established baseline chemical limits for drinking water."),
            VersionItem(year="2012", title="Second Revision (Current)", type="revision", description="Aligned heavy metal limits with WHO international guidelines."),
            VersionItem(year="2021", title="Amendment 1", type="amendment", description="Updated pesticide residue testing methods and limits.")
        ],
        certifications=[
            CertificationItem(scheme="BIS Product Certification (ISI Mark)", status="Information Available", details="Mandatory ISI Mark certification required for packaged and bottled drinking water under FSSAI / BIS regulations.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 4 - Requirements", clause="Clause 4.1", text="Drinking water shall comply with the limits specified in Table 1, Table 2 and Table 3.", confidence=0.99, verified=True)
        ]
    ),
    IndianStandard(
        id="is-694-2010",
        is_number="IS 694 : 2010",
        title="PVC Insulated Cables for Working Voltages up to and including 1100 V",
        category="Electrical Safety & Distribution",
        status="Active",
        year="2010",
        scope="Covers requirements for single core, twin core, and multicore PVC insulated unsheathed and sheathed electric cables for fixed wiring and flexible cords.",
        key_requirements=[
            "Working voltage rating up to and including 1100 V AC / DC",
            "High conductivity annealed bare or tinned copper / aluminium conductors",
            "Insulation resistance at 70°C conforming to Class 1 / Class 2 limits",
            "Spark test and high voltage AC immersion test (3 kV for 5 minutes)",
            "Flame retardant low smoke (FRLS) insulation jacket options"
        ],
        clauses=[
            ClauseInfo(number="Clause 5", title="Conductor Materials", summary="Conductors shall conform to IS 8130 requirements for purity and electrical resistance.", is_mandatory=True),
            ClauseInfo(number="Clause 6", title="Insulation", summary="Type A PVC compound insulation as per IS 5831 applied by extrusion.", is_mandatory=True),
            ClauseInfo(number="Clause 14", title="High Voltage Test", summary="Completed cable must withstand 3000V AC without insulation puncture.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-8130-2013", is_number="IS 8130 : 2013", title="Conductors for Insulated Electric Cables and Flexible Cords", relationship="normative-reference", description="Conductor specifications."),
            RelatedStandardItem(id="is-5831-1984", is_number="IS 5831 : 1984", title="PVC Insulation and Sheath of Electric Cables", relationship="testing", description="Compound physical and thermal test specifications.")
        ],
        versions=[
            VersionItem(year="1990", title="Third Revision", type="original", description="Standard PVC cable specifications."),
            VersionItem(year="2010", title="Fourth Revision (Current)", type="revision", description="Introduced heat resistant and halogen-free low smoke fire variants."),
            VersionItem(year="2020", title="Amendment 4", type="amendment", description="Updated marking and ISI certification compliance requirements.")
        ],
        certifications=[
            CertificationItem(scheme="BIS ISI Mark Scheme", status="Information Available", details="Mandatory ISI Mark certification under Electrical Wires, Cables and Appliances QCO.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 14 - Electrical Tests", clause="Clause 14.1", text="Cables shall withstand specified AC voltage test without breakdown.", confidence=0.98, verified=True)
        ]
    ),
    IndianStandard(
        id="is-1489-1-2015",
        is_number="IS 1489 (Part 1) : 2015",
        title="Portland Pozzolana Cement — Specification (Part 1: Flyash based)",
        category="Civil & Structural Materials",
        status="Active",
        year="2015",
        scope="Covers manufacture and chemical and physical requirements of flyash-based Portland Pozzolana Cement for structural concrete and civil works.",
        key_requirements=[
            "Compressive strength: 72h >= 16 MPa, 168h >= 22 MPa, 672h >= 33 MPa",
            "Initial setting time not less than 30 minutes; Final setting time not more than 600 minutes",
            "Soundness: Le-Chatelier expansion <= 10 mm; Autoclave expansion <= 0.8%",
            "Fineness: Specific surface not less than 300 m2/kg (Blaine method)",
            "Flyash constituent percentage: Minimum 15%, Maximum 35% by mass"
        ],
        clauses=[
            ClauseInfo(number="Clause 6", title="Chemical Requirements", summary="Insoluble residue max 4.0% + 0.99(100 - X)/100; Magnesia max 6.0%.", is_mandatory=True),
            ClauseInfo(number="Clause 7", title="Physical Requirements", summary="Compressive strength, setting time, fineness, and soundness compliance.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-4031-tests", is_number="IS 4031", title="Methods of Physical Tests for Hydraulic Cement", relationship="testing", description="Physical testing procedures for strength and setting."),
            RelatedStandardItem(id="is-3812-flyash", is_number="IS 3812", title="Pulverized Fuel Ash for Use in Cement Concrete", relationship="normative-reference", description="Quality criteria for pozzolanic flyash constituent.")
        ],
        versions=[
            VersionItem(year="1991", title="Third Revision", type="original", description="Separated flyash based (Part 1) from calcined clay (Part 2)."),
            VersionItem(year="2015", title="Fourth Revision (Current)", type="revision", description="Raised flyash upper limit to 35% with enhanced strength benchmarks.")
        ],
        certifications=[
            CertificationItem(scheme="BIS Mandatory ISI Mark", status="Information Available", details="Mandatory certification under Cement Quality Control Order.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 7 - Physical Requirements", clause="Clause 7.2", text="The compressive strength of mortar cubes shall be not less than 33 MPa at 28 days.", confidence=0.99, verified=True)
        ]
    ),
    IndianStandard(
        id="is-15298-2-2011",
        is_number="IS 15298 (Part 2) : 2011",
        title="Personal Protective Equipment — Safety Footwear",
        category="Personal Protective Equipment",
        status="Active",
        year="2011",
        scope="Specifies basic and additional requirements for safety footwear used in industrial, construction, and mining applications.",
        key_requirements=[
            "Toe protection: Impact resistance of 200 Joules and compression resistance under 15 kN load",
            "Outsole slip resistance on ceramic tile with NaLS and steel floor with glycerol",
            "Penetration resistance of outsole >= 1100 N (P category)",
            "Antistatic resistance between 100 kOhm and 1000 MOhm (A category)",
            "Upper leather tear strength >= 120 N and water resistance"
        ],
        clauses=[
            ClauseInfo(number="Clause 5", title="Basic Requirements", summary="Toe impact, compression, upper thickness, and sole adhesion strength.", is_mandatory=True),
            ClauseInfo(number="Clause 6", title="Additional Requirements", summary="Slip resistance, electrical properties, thermal insulation.", is_mandatory=False)
        ],
        related_standards=[
            RelatedStandardItem(id="is-15298-1-2011", is_number="IS 15298 (Part 1) : 2011", title="PPE Footwear Test Methods", relationship="testing", description="Testing procedures for safety shoes."),
            RelatedStandardItem(id="is-2925-1984", is_number="IS 2925 : 1984", title="Industrial Safety Helmets", relationship="safety", description="Coordinated PPE site safety standard.")
        ],
        versions=[
            VersionItem(year="2002", title="First Publication", type="original", description="Aligned Indian safety shoe standard with ISO 20345."),
            VersionItem(year="2011", title="Second Revision (Current)", type="revision", description="Updated slip resistance and antistatic footwear test criteria.")
        ],
        certifications=[
            CertificationItem(scheme="BIS ISI Mark Scheme", status="Information Available", details="Mandatory ISI Mark certification under Footwear Quality Control Order.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 5 - Basic Requirements", clause="Clause 5.3.2", text="Safety footwear toecaps shall withstand an impact of at least 200 J without crushing.", confidence=0.98, verified=True)
        ]
    ),
    IndianStandard(
        id="is-15328-2003",
        is_number="IS 15328 : 2003",
        title="Plastics Piping Systems for Non-Pressure Underground Drainage and Sewerage",
        category="Civil & Municipal Infrastructure",
        status="Active",
        year="2003",
        scope="Specifies requirements for unplasticized polyvinyl chloride (PVC-U) pipes for non-pressure underground drainage and sewerage systems.",
        key_requirements=[
            "Ring stiffness nominal classes SN2, SN4, SN8 for burial load stability",
            "Ring flexibility test without cracking or debonding under 30% diametric deflection",
            "Impact strength at 0°C (true impact rate <= 10%)",
            "Resistance to internal hydrostatic pressure (4.2 MPa at 20°C for 1 hour)",
            "Elastomeric ring seal joint tightness under negative and positive hydrostatic pressure"
        ],
        clauses=[
            ClauseInfo(number="Clause 4", title="Material Specification", summary="Raw PVC resin with necessary additives without recycled scrap fillers.", is_mandatory=True),
            ClauseInfo(number="Clause 7", title="Mechanical Characteristics", summary="Ring stiffness, impact resistance, and elongation tests.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-4985-2000", is_number="IS 4985 : 2000", title="Unplasticized PVC Pipes for Potable Water Supplies", relationship="normative-reference", description="PVC pipe pressure rating standards.")
        ],
        versions=[
            VersionItem(year="2003", title="First Publication", type="original", description="Initial specification for non-pressure underground PVC pipes."),
            VersionItem(year="2021", title="Amendment 7", type="amendment", description="Updated joint testing protocols and stiffness classification.")
        ],
        certifications=[
            CertificationItem(scheme="BIS ISI Mark Scheme", status="Information Available", details="Mandatory BIS certification for municipal and CPWD infrastructure procurement.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 7 - Mechanical Properties", clause="Clause 7.1", text="Pipes shall satisfy nominal ring stiffness SN4 or SN8 for underground burial.", confidence=0.97, verified=True)
        ]
    ),
    IndianStandard(
        id="is-1293-2019",
        is_number="IS 1293 : 2019",
        title="Plugs and Socket-Outlets for Household and Similar Purposes of Rated Voltage up to 250V",
        category="Electrical Safety & Distribution",
        status="Active",
        year="2019",
        scope="Applies to plugs and fixed or portable socket-outlets for AC only, with or without earthing contact, with a rated voltage greater than 50 V but not exceeding 250 V.",
        key_requirements=[
            "Rated voltage 250 V AC, rated current 6A, 10A, 16A",
            "Shuttered socket-outlets for child safety and accidental contact prevention",
            "Insulation resistance not less than 5 MOhm at 500 V DC",
            "Electric strength 2000 V AC test for 1 minute without flashover",
            "Temperature rise test: Max 45°C rise on terminals under rated load"
        ],
        clauses=[
            ClauseInfo(number="Clause 9", title="Protection against Electric Shock", summary="Live parts inaccessible when plug is partially or fully inserted.", is_mandatory=True),
            ClauseInfo(number="Clause 19", title="Temperature Rise Test", summary="Terminals shall not exceed 45 K temperature rise at rated current.", is_mandatory=True)
        ],
        related_standards=[
            RelatedStandardItem(id="is-302-1-2008", is_number="IS 302 (Part 1) : 2008", title="Appliance Safety Code", relationship="normative-reference", description="General electrical safety code.")
        ],
        versions=[
            VersionItem(year="2005", title="Third Revision", type="original", description="Established 6A and 16A configurations."),
            VersionItem(year="2019", title="Fourth Revision (Current)", type="revision", description="Introduced 10A rating and mandatory safety shutter requirement."),
            VersionItem(year="2020", title="Amendment 1", type="amendment", description="Extension of transition period and terminal dimensions.")
        ],
        certifications=[
            CertificationItem(scheme="BIS Mandatory ISI Mark", status="Information Available", details="Mandatory certification under Electrical Equipment Quality Control Order.", is_mandatory=True)
        ],
        sources=[
            SourceEvidence(section="Section 9 - Shock Protection", clause="Clause 9.1", text="Plugs and socket-outlets shall be constructed to prevent accidental contact with live parts.", confidence=0.98, verified=True)
        ]
    )
]

def get_all_standards() -> List[IndianStandard]:
    return STANDARDS_KNOWLEDGE_BASE

import re

def get_standard_by_id(std_id: str) -> Optional[IndianStandard]:
    clean_target = re.sub(r'[^a-zA-Z0-9]', '', std_id).lower()
    for std in STANDARDS_KNOWLEDGE_BASE:
        clean_id = re.sub(r'[^a-zA-Z0-9]', '', std.id).lower()
        clean_num = re.sub(r'[^a-zA-Z0-9]', '', std.is_number).lower()
        if clean_target == clean_id or clean_target == clean_num:
            return std
    # Partial prefix match fallback (e.g. is10500 matches is-10500-2012)
    for std in STANDARDS_KNOWLEDGE_BASE:
        clean_id = re.sub(r'[^a-zA-Z0-9]', '', std.id).lower()
        clean_num = re.sub(r'[^a-zA-Z0-9]', '', std.is_number).lower()
        if clean_target in clean_id or clean_target in clean_num:
            return std
    return None

def get_standard_graph(std_id: str) -> StandardGraph:
    std = get_standard_by_id(std_id)
    if not std:
        # Fallback default graph for industrial head protection / standard
        std = STANDARDS_KNOWLEDGE_BASE[0]
        
    nodes: List[GraphNode] = [
        GraphNode(id=std.id, is_number=std.is_number, title=std.title, type="main", category=std.category)
    ]
    edges: List[GraphEdge] = []
    
    for rel in std.related_standards:
        node_type = "reference"
        if rel.relationship == "testing":
            node_type = "testing"
        elif rel.relationship == "safety":
            node_type = "safety"
        elif rel.relationship == "installation":
            node_type = "installation"
            
        nodes.append(GraphNode(
            id=rel.id,
            is_number=rel.is_number,
            title=rel.title,
            type=node_type,
            category=std.category
        ))
        edges.append(GraphEdge(
            source=std.id,
            target=rel.id,
            relationship=rel.relationship
        ))
        
    return StandardGraph(nodes=nodes, edges=edges)
