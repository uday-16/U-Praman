"""Assess supplied input completeness, not product conformity."""
import re
from app.schemas.analysis import SpecificationCompleteness, SpecificationCheckItem


def evaluate_specification_completeness(extracted):
    text = '\n'.join(extracted.key_requirements)
    checks = [
        ('Product', bool(extracted.product_name.strip()), 'Specify the product being procured.'),
        ('Application', bool(extracted.application.strip()), 'Describe the operating environment and intended application.'),
        ('Purpose', bool(extracted.purpose.strip()), 'Describe the intended purpose.'),
        ('Technical parameters', bool(extracted.technical_parameters), 'Provide measurable performance limits, materials and dimensions.'),
        ('Safety requirements', bool(extracted.safety_parameters), 'Identify relevant hazards and safety requirements, if applicable.'),
        ('Testing', bool(re.search(r'\btest|inspection|sampling|acceptance', text, re.I)), 'Specify testing and acceptance criteria.'),
        ('Quantity', bool(extracted.quantity or re.search(r'\bquantity\b|\d+\s*(?:units|pieces|nos)\b', text, re.I)), 'Specify the procurement quantity.')]
    return SpecificationCompleteness(score=round(100 * sum(present for _, present, _ in checks) / len(checks)),
        items=[SpecificationCheckItem(category=label, label=label, status='pass' if present else 'warning',
            details='Present in reviewed input; adequacy requires review.' if present else missing) for label, present, missing in checks],
        recommendations_to_improve=[missing for _, present, missing in checks if not present])
