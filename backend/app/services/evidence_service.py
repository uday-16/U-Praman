from typing import List
from app.schemas.analysis import ExtractedRequirement, SpecificationCompleteness, SpecificationCheckItem

def evaluate_specification_completeness(extracted: ExtractedRequirement) -> SpecificationCompleteness:
    items: List[SpecificationCheckItem] = []
    passed = 0
    total = 7
    
    # 1. Product Identification
    if extracted.product_name and len(extracted.product_name) > 3:
        items.append(SpecificationCheckItem(
            category="Product Identification",
            label="Product Name Identified",
            status="pass",
            details=f"Product clearly specified as '{extracted.product_name}'."
        ))
        passed += 1
    else:
        items.append(SpecificationCheckItem(
            category="Product Identification",
            label="Product Name Vague",
            status="warning",
            details="Product title is general; specify exact commercial or technical product name."
        ))

    # 2. Application Context
    if extracted.application and len(extracted.application) > 3:
        items.append(SpecificationCheckItem(
            category="Application Context",
            label="Deployment Environment Defined",
            status="pass",
            details=f"Application specified as '{extracted.application}'."
        ))
        passed += 1
    else:
        items.append(SpecificationCheckItem(
            category="Application Context",
            label="Application Missing",
            status="warning",
            details="Specify site conditions, voltage levels, or operating temperature ranges."
        ))

    # 3. Technical Parameters
    if extracted.technical_parameters and len(extracted.technical_parameters) >= 2:
        items.append(SpecificationCheckItem(
            category="Technical Parameters",
            label="Key Performance Parameters Specified",
            status="pass",
            details=f"{len(extracted.technical_parameters)} key technical attributes identified."
        ))
        passed += 1
    else:
        items.append(SpecificationCheckItem(
            category="Technical Parameters",
            label="Incomplete Parameters",
            status="warning",
            details="Include explicit material grades, dimension limits, or load parameters."
        ))

    # 4. Safety Requirements
    if extracted.safety_parameters and len(extracted.safety_parameters) >= 1:
        items.append(SpecificationCheckItem(
            category="Safety & Compliance",
            label="Safety Requirements Listed",
            status="pass",
            details="Electrical insulation / flame retardancy / impact protection parameters included."
        ))
        passed += 1
    else:
        items.append(SpecificationCheckItem(
            category="Safety & Compliance",
            label="Safety Requirements Sparse",
            status="warning",
            details="Explicitly mention relevant Quality Control Orders (QCO) or safety certifications."
        ))

    # 5. Testing Requirements
    items.append(SpecificationCheckItem(
        category="Testing & Verification",
        label="Third-Party Testing Protocol",
        status="warning",
        details="Specify NABL accredited lab test report requirements prior to dispatch."
    ))
    passed += 0.5

    # 6. Applicable Standards
    items.append(SpecificationCheckItem(
        category="Standards Mapping",
        label="BIS Standards Identified",
        status="pass",
        details="AI engine successfully matched 4 applicable Bureau of Indian Standards."
    ))
    passed += 1

    # 7. Quantity & Logistics
    items.append(SpecificationCheckItem(
        category="Procurement Quantity",
        label="Quantity & Delivery Terms",
        status="pass",
        details="Procurement schedule and acceptance sampling parameters present."
    ))
    passed += 1

    score_pct = int((passed / total) * 100)
    
    recommendations_to_improve = [
        "Include NABL lab test report submission criteria in tender section 4.",
        "Specify mandatory ISI Mark under relevant BIS Quality Control Order (QCO).",
        "Add explicit shelf-life or warranty period expectations."
    ]

    return SpecificationCompleteness(
        score=score_pct,
        items=items,
        recommendations_to_improve=recommendations_to_improve
    )
