"""Requirement extraction retains the original input and never supplies invented defaults."""
import re
import uuid
from datetime import datetime, timezone
from pydantic import ValidationError
from app.schemas.analysis import ExtractedRequirement
from app.services.document_reader import clean_text
from app.services.gemini_service import extract_requirements_with_gemini, GenerationUnavailable

MAX_INPUT_CHARS = 100000


def extract_requirements_from_input(req):
    text = clean_text('\n'.join(str(v) for v in [req.text, req.product_name, req.application, req.purpose,
                                               req.technical_specs, req.safety_specs, req.quantity] if v))
    if len(text) < 10: raise ValueError('Describe the product and requirements in at least 10 characters.')
    if len(text) > MAX_INPUT_CHARS: raise ValueError('Document exceeds 100,000 text characters. Upload the relevant specification sections.')
    lines = [line.strip() for line in re.split(r'\n|(?<=[.!?])\s+', text) if line.strip()]
    params = {}
    for line in lines:
        match = re.match(r'^([A-Za-z][A-Za-z /_-]{2,40})\s*[:=]\s*(.{1,200})$', line)
        if match: params[match[1]] = match[2]
    result = ExtractedRequirement(
        id='req-' + uuid.uuid4().hex, product_name=req.product_name or lines[0][:180],
        application=req.application or '', purpose=req.purpose or '', key_requirements=lines[:40],
        technical_parameters=params, safety_parameters=[line for line in lines if re.search(r'safety|hazard|protect|flame|insulat|toxic', line, re.I)][:20],
        extracted_at=datetime.now(timezone.utc).isoformat(), source_text=text, quantity=req.quantity or '')
    try:
        extracted = extract_requirements_with_gemini(text, req.product_name or '')
        if not isinstance(extracted, dict): raise ValueError('Invalid extraction')
        fields = {k: extracted[k] for k in ('product_name', 'application', 'purpose', 'key_requirements', 'technical_parameters', 'safety_parameters') if k in extracted}
        result = ExtractedRequirement.model_validate({**result.model_dump(), **fields, 'extraction_mode': 'gemini'})
        for key in ('product_name', 'application', 'purpose'):
            if getattr(req, key): setattr(result, key, getattr(req, key))
    except (GenerationUnavailable, ValidationError, ValueError, TypeError) as error:
        reason = str(error) if isinstance(error, GenerationUnavailable) else 'The AI extraction did not match the expected format.'
        result.warning = reason + ' Fields contain source text only; review and edit before searching.'
    return result
