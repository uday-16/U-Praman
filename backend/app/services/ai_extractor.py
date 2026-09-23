import uuid
import re
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.schemas.analysis import RequirementInput, ExtractedRequirement
from app.services.gemini_service import extract_requirements_with_gemini

def _clean_text(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()

def _extract_product_from_text(text: str, fallback: str = "Procurement Item") -> str:
    if not text:
        return fallback
        
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return fallback

    # Look for procurement tender headers
    patterns = [
        r'(?:procurement|supply|purchase|tender|specification|requirement)s?\s+(?:for|of|towards)\s+([^,.\n;]{3,60})',
        r'(?:item description|product name|work name|scope of supply)\s*[:\-]\s*([^,.\n;]{3,60})',
        r'(?:invites tenders for)\s+([^,.\n;]{3,60})'
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            # Clean up common trailing words
            candidate = re.sub(r'\s+(as per|conforming to|in accordance|at|for|with).*$', '', candidate, flags=re.IGNORECASE)
            if len(candidate) > 2:
                return candidate.title()

    # Look at first non-empty line
    first_line = lines[0]
    if len(first_line) < 60 and not any(k in first_line.lower() for k in ["tender notice", "notice inviting", "page ", "government of"]):
        return first_line.title()

    return fallback


def _extract_bullet_requirements(text: str) -> List[str]:
    """Extract bulleted or numbered specifications from text."""
    reqs = []
    # Match bullet points, dashes, numbers: "1.", "1)", "-", "*", "•"
    lines = text.split('\n')
    for line in lines:
        l = line.strip()
        if not l:
            continue
        # Check for bullet / number prefix
        m = re.match(r'^(?:[0-9]+[\.\)]|[\-\*•–])\s+(.+)$', l)
        if m:
            content = m.group(1).strip()
            if len(content) > 15:
                reqs.append(content)
        elif any(modal in l.lower() for modal in [" shall ", " must be ", " required to ", " should have ", " conforming to "]):
            if len(l) > 20 and len(l) < 200:
                reqs.append(l)

    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for r in reqs:
        c = r.lower()
        if c not in seen:
            seen.add(c)
            deduped.append(r)

    return deduped[:6]


def _extract_key_values(text: str) -> Dict[str, str]:
    """Extract parameter: value or parameter = value pairs from text."""
    params = {}
    patterns = [
        r'([A-Za-z\s]{3,25})\s*[:=]\s*([0-9A-Za-z\s\.\-\/\%\°\±\<\>\=]{2,40})',
    ]
    for line in text.split('\n'):
        for pat in patterns:
            for m in re.finditer(pat, line):
                key = m.group(1).strip()
                val = m.group(2).strip()
                # Exclude false positives like http, time, tender numbers
                if key.lower() not in ["http", "https", "note", "date", "time", "ref", "sl", "no", "page", "tel", "email"]:
                    if len(val) > 1 and not val.endswith(':'):
                        params[key.title()] = val
    return dict(list(params.items())[:8])


def extract_requirements_from_input(req_input: RequirementInput) -> ExtractedRequirement:
    text = (req_input.text or "").strip()
    prod_hint = (req_input.product_name or "").strip()

    # 1. Try Gemini AI structured extraction if active
    if text:
        gemini_result = extract_requirements_with_gemini(text, prod_hint)
        if gemini_result and isinstance(gemini_result, dict):
            p_name = gemini_result.get("product_name") or prod_hint or "Procurement Item"
            return ExtractedRequirement(
                id=f"req-{uuid.uuid4().hex[:8]}",
                product_name=p_name,
                application=gemini_result.get("application") or req_input.application or "General Public Procurement",
                purpose=gemini_result.get("purpose") or req_input.purpose or "Institutional Supply & Works",
                key_requirements=gemini_result.get("key_requirements") or ["Compliance with applicable Indian Standards"],
                technical_parameters=gemini_result.get("technical_parameters") or {},
                safety_parameters=gemini_result.get("safety_parameters") or ["Mandatory BIS / Quality Control Order compliance"],
                extracted_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            )

    # 2. Dynamic Generic NLP Extraction (Grounds on user input, not hardcoded templates)
    corpus = f"{text} {prod_hint} {req_input.purpose or ''} {req_input.application or ''} {req_input.technical_specs or ''} {req_input.safety_specs or ''}"
    
    # Determine product name
    if prod_hint:
        product_name = prod_hint
    else:
        product_name = _extract_product_from_text(text, fallback="Procurement Specification")

    # Determine application & purpose
    application = req_input.application or ""
    if not application:
        # Detect industry / operational environment
        app_candidates = []
        if any(w in corpus.lower() for w in ["water", "drinking", "pipeline", "potable", "turbidity"]):
            app_candidates.append("Municipal Water Supply & Distribution")
        if any(w in corpus.lower() for w in ["cable", "conductor", "voltage", "switchgear", "electric", "substation", "wire"]):
            app_candidates.append("Electrical Power & Infrastructure Installation")
        if any(w in corpus.lower() for w in ["cement", "concrete", "structural", "steel", "bridge", "building"]):
            app_candidates.append("Civil Construction & Structural Works")
        if any(w in corpus.lower() for w in ["footwear", "shoe", "boot", "protective", "safety shoe"]):
            app_candidates.append("Occupational Safety & Industrial Protective Equipment")
        if any(w in corpus.lower() for w in ["pipe", "sewerage", "drainage", "pvc", "underground"]):
            app_candidates.append("Underground Drainage & Sewerage Infrastructure")
        
        application = app_candidates[0] if app_candidates else "Industrial & Institutional Operations"

    purpose = req_input.purpose or f"Operational procurement and standard compliance for {product_name}"

    # Extract requirements from text or input fields
    key_reqs = _extract_bullet_requirements(text)
    if req_input.technical_specs:
        key_reqs.extend([s.strip() for s in req_input.technical_specs.split(';') if s.strip()])
    
    # If no requirements detected, build grounded summaries from text
    if not key_reqs:
        sentences = [s.strip() for s in re.split(r'[\.\n]', text) if len(s.strip()) > 25]
        if sentences:
            key_reqs = sentences[:4]
        else:
            key_reqs = [
                f"Specification and testing conforming to relevant Bureau of Indian Standards",
                f"Material composition, durability and quality inspection requirements for {product_name}",
                "Submission of manufacturer test certificates and third-party NABL test reports",
                "Compliance with statutory Public Procurement (Preference to Make in India) orders"
            ]

    # Extract technical parameters
    tech_params = _extract_key_values(text)
    if req_input.technical_specs and not tech_params:
        tech_params["Specification"] = req_input.technical_specs[:80]
    if not tech_params:
        tech_params = {
            "Specification Status": "Under Review",
            "Target Compliance": "Bureau of Indian Standards (BIS)",
            "Quality Assurance": "ISO / NABL Certified Laboratory Test"
        }

    # Extract safety parameters
    safety_params = []
    for line in text.split('\n'):
        l = line.strip()
        if any(w in l.lower() for w in ["safety", "hazard", "protection", "flame", "insulation", "toxic", "leakage", "pressure test"]):
            if len(l) > 15 and len(l) < 160:
                safety_params.append(l)

    if req_input.safety_specs:
        safety_params.extend([s.strip() for s in req_input.safety_specs.split(';') if s.strip()])

    if not safety_params:
        safety_params = [
            "Mandatory Bureau of Indian Standards (BIS) Quality Control Order (QCO) verification",
            "Third-party laboratory testing against specified environmental and physical parameters",
            "Manufacturer guarantee/warranty certificate and traceability marking"
        ]

    return ExtractedRequirement(
        id=f"req-{uuid.uuid4().hex[:8]}",
        product_name=product_name,
        application=application,
        purpose=purpose,
        key_requirements=key_reqs[:6],
        technical_parameters=tech_params,
        safety_parameters=safety_params[:4],
        extracted_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    )
