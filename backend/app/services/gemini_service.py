import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("praman.gemini")

# Priority list of modern Gemini models
CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-1.5-flash",
    "gemini-pro"
]

_gemini_available = False
_model: Optional[Any] = None
_active_model_name: Optional[str] = None

def _init_gemini():
    global _gemini_available, _model, _active_model_name
    if _model is not None:
        return _model

    try:
        from app.config import settings
        api_key = (settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    except Exception:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key:
        logger.info("GEMINI_API_KEY not configured. Deterministic grounded fallback active.")
        _gemini_available = False
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)  # type: ignore[attr-defined]
        # Directly instantiate primary supported model (no network latency on startup)
        _active_model_name = "gemini-3.8-flash"
        _model = genai.GenerativeModel(_active_model_name)  # type: ignore[attr-defined]
        _gemini_available = True
        logger.info(f"Gemini AI initialized with model {_active_model_name}")
        return _model
    except ImportError:
        logger.warning("google-generativeai package not installed. Grounded fallback active.")
        _gemini_available = False
        return None
    except Exception as e:
        logger.error(f"Error configuring Gemini client: {e}")
        _gemini_available = False
        return None

# Attempt initial setup
_init_gemini()


def is_gemini_active() -> bool:
    """Return whether Gemini API is configured and operational."""
    global _model
    if _model is None:
        _init_gemini()
    return _gemini_available and _model is not None


def generate_dynamic_chat_reply(query: str, citations: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Generate an intelligent, beautifully formatted response to a user query.
    If citations from BIS standards are provided, grounds strictly on them.
    If citations are not available, uses Gemini's deep knowledge of Indian Standards
    and public procurement (BIS, GeM, QCOs, GFR 2017) to provide an authoritative answer.
    """
    model = _init_gemini() if _model is None else _model
    citations = citations or []

    if model is not None:
        try:
            # Build context string if citations exist
            if citations:
                context_blocks = []
                for i, c in enumerate(citations, 1):
                    is_num = c.get("is_number", "Indian Standard")
                    source = c.get("source", "Standards Database")
                    text = c.get("text", "").strip()
                    context_blocks.append(f"[Excerpt {i} | {is_num} ({source})]\n{text}")
                context_str = "\n\n".join(context_blocks)

                prompt = (
                    "You are PRAMAN AI (प्रमाण), the official intelligent assistant for Indian Public Procurement and Bureau of Indian Standards (BIS) compliance.\n"
                    "You are answering a question from a procurement officer, tender evaluator, or vendor.\n\n"
                    "VERIFIED STANDARDS EXCERPTS:\n"
                    f"{context_str}\n\n"
                    f"USER QUESTION: {query}\n\n"
                    "INSTRUCTIONS:\n"
                    "1. Provide a direct, authoritative, and helpful answer grounded in the verified excerpts.\n"
                    "2. Explicitly cite the standard code (e.g. IS 10500, IS 2925, IS 694) and key parameters or test criteria.\n"
                    "3. Format your reply with clean Markdown: use clear headings (###), bold for key values and requirements, and bullet points for lists.\n"
                    "4. If relevant, mention compliance verification tips (e.g. BIS ISI mark, NABL test certificates, Quality Control Orders).\n"
                    "5. Keep the tone professional, concise, and structured for easy reading.\n\n"
                    "ANSWER:"
                )
            else:
                prompt = (
                    "You are PRAMAN AI (प्रमाण), the official intelligent assistant for Indian Public Procurement and Bureau of Indian Standards (BIS) compliance.\n"
                    "You assist public procurement officers, vendors, and engineers with Indian Standards (IS codes), Quality Control Orders (QCOs), GeM tender specifications, and compliance rules.\n\n"
                    f"USER QUERY: {query}\n\n"
                    "INSTRUCTIONS:\n"
                    "1. Provide an informative, accurate, and structured response using your knowledge of Indian Standards and public procurement.\n"
                    "2. If the user asks about a specific product or standard (e.g. drinking water, cement, cables, safety helmets), cite the applicable Indian Standard numbers (such as IS 10500, IS 269, IS 694, IS 2925) and mandatory quality parameters.\n"
                    "3. If the user is greeting you or asking about your capabilities, introduce PRAMAN (प्रमाण) as India's procurement standards verification engine, explaining how it verifies tender specifications against BIS standards.\n"
                    "4. Format your reply with clean Markdown: use bolding, concise bullet points, and brief section headers.\n"
                    "5. Keep the response crisp, professional, and directly actionable.\n\n"
                    "ANSWER:"
                )

            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini chat reply generation failed, using fallback: {e}")

    # Fallback if Gemini unavailable or fails
    if citations:
        top_cite = citations[0]
        is_num = top_cite.get("is_number", "Indian Standard")
        source = top_cite.get("source", "Standards Database")
        lines = [l.strip() for l in top_cite.get("text", "").split("\n") if len(l.strip()) > 30]
        highlight = lines[0] if lines else top_cite.get("text", "")[:260]

        all_standards = [str(c.get("is_number")) for c in citations if c.get("is_number") and str(c.get("is_number")) != "Unknown"]
        all_standards = list(dict.fromkeys(all_standards))
        standards_list = ", ".join(all_standards) if all_standards else str(is_num)

        answer = f"### Standards Compliance Summary ({standards_list})\n\n"
        answer += f"According to verified specifications under **{is_num}** (`{source}`):\n\n"
        answer += f"> *\"{highlight}\"*\n\n"
        
        if len(citations) > 1:
            answer += "**Key Verified Clauses:**\n"
            for c in citations[:3]:
                txt = c.get('text', '').replace('\n', ' ').strip()
                if len(txt) > 150:
                    txt = txt[:150] + "..."
                answer += f"- **{c.get('is_number', 'IS')}**: {txt}\n"
        
        answer += "\n*Note: Verified against indexed Bureau of Indian Standards (BIS) documents.*"
        return answer
    else:
        return (
            "### PRAMAN AI Assistant (प्रमाण)\n\n"
            "I am ready to assist you with Indian Standards (BIS) specifications, tender compliance verification, and Quality Control Orders.\n\n"
            "- **Drinking Water**: IS 10500\n"
            "- **Industrial Safety Helmets**: IS 2925\n"
            "- **PVC Insulated Cables**: IS 694\n"
            "- **HDPE Pipes for Water Supply**: IS 4984\n\n"
            "Please ask any specific question regarding standard limits, test methods, or mandatory certifications."
        )


def generate_grounded_answer(query: str, citations: List[Dict[str, Any]]) -> str:
    """Wrapper for backward compatibility."""
    return generate_dynamic_chat_reply(query, citations)


def extract_requirements_with_gemini(text: str, product_hint: str = "") -> Optional[Dict[str, Any]]:
    """
    Extract structured procurement requirements using Gemini JSON mode if active.
    Returns None if Gemini is unconfigured so generic NLP can handle it.
    """
    model = _init_gemini() if _model is None else _model
    if model is None:
        return None

    try:
        prompt = (
            "You are PRAMAN AI. Analyze this procurement tender or requirement text and extract structured technical specifications.\n"
            "Return a strictly valid JSON object with EXACTLY this structure:\n"
            "{\n"
            '  "product_name": "string (clear name of the product or item)",\n'
            '  "application": "string (where it will be used, e.g. construction, electrical, water supply)",\n'
            '  "purpose": "string (primary function or objective)",\n'
            '  "key_requirements": ["list", "of", "4 to 6 specific key requirements"],\n'
            '  "technical_parameters": {"ParamName": "Value", "ParamName2": "Value"},\n'
            '  "safety_parameters": ["list", "of", "2 to 4 safety or regulatory standards required"]\n'
            "}\n\n"
            f"PRODUCT HINT: {product_hint}\n"
            f"INPUT TENDER TEXT:\n{text[:4000]}\n\n"
            "Return JSON only, no markdown wrapping, no extra comments."
        )
        response = model.generate_content(prompt)
        if response and response.text:
            cleaned = response.text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
            return data
    except Exception as e:
        logger.warning(f"Gemini structured extraction failed, falling back to NLP: {e}")
        return None

