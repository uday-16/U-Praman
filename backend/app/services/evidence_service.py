"""Assess supplied input completeness, not product conformity."""
import re
from app.schemas.analysis import SpecificationCompleteness, SpecificationCheckItem
from app.services.requirement_text import labelled_value


def evaluate_specification_completeness(extracted):
    text = '\n'.join([extracted.source_text, *extracted.key_requirements,
                      *[f'{k}: {v}' for k, v in extracted.technical_parameters.items()]])
    checks = [
        ('Product', bool(extracted.product_name.strip()), 'Specify the product being procured.'),
        ('Application', bool(extracted.application.strip()), 'Describe the operating environment and intended application.'),
        ('Purpose', bool(extracted.purpose.strip()), 'Describe the intended purpose.'),
        ('Technical parameters', bool(extracted.technical_parameters), 'Provide measurable performance limits, materials and dimensions.'),
        ('Safety requirements', bool(extracted.safety_parameters), 'Identify relevant hazards and safety requirements, if applicable.'),
        ('Testing', bool(re.search(r'\btest|inspection|sampling|acceptance', text, re.I)), 'Specify testing and acceptance criteria.'),
        ('Quantity', bool(extracted.quantity or re.search(r'\d[\d,.]*\s*(?:metric\s+)?(?:tonnes|tons|kg|units|pieces|nos)\b', text, re.I)), 'Specify the procurement quantity.')]
    # Presence is not completeness: retain explicit deferrals as clarification
    # prompts, with the tender's own wording rather than invented numeric limits.
    grade = labelled_value(extracted.source_text, 'Grade') or next(
        (v for k, v in extracted.technical_parameters.items() if k.lower() == 'grade'), '')
    if grade and re.search(r'to be (?:proposed|specified|confirmed)|by (?:the )?bidder|\bTBD\b', grade, re.I):
        checks.append(('Grade selection', False, f'Confirm the proposed grade and its applicable performance limits before approval. Tender states: "{grade}"'))
    if re.search(r'(?:as per|specified in)\s+(?:the\s+)?approved drawings', text, re.I):
        checks.append(('Drawing-dependent details', False,
            'Review the approved drawings for final quantities, dimensions and fabrication details; these details are deferred to drawings in the supplied text.'))
    return SpecificationCompleteness(score=round(100 * sum(present for _, present, _ in checks) / len(checks)),
        items=[SpecificationCheckItem(category=label, label=label, status='pass' if present else 'warning',
            details='Present in reviewed input; adequacy requires review.' if present else missing) for label, present, missing in checks],
        recommendations_to_improve=[missing for _, present, missing in checks if not present])
