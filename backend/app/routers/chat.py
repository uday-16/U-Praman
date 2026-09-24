from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from app.services.corpus import get_corpus
from app.services.standards_db import evidence
from app.services.gemini_service import grounded_reply
import re

router = APIRouter(prefix='/chat', tags=['chat'])

class ChatMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str = Field(max_length=12000)

class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    standard_id: str | None = Field(default=None, max_length=100)
    history: list[ChatMessage] = Field(default_factory=list, max_length=8)

@router.post('')
@router.post('/')
def chat_with_knowledge_base(request: ChatRequest):
    query = request.query.strip()
    if not query: raise HTTPException(422, 'Please enter a question.')
    if query.lower().strip('!?. ') in {'hi', 'hello', 'hey', 'help', 'namaste'}:
        return {'answer': 'Namaste! Ask about a product, IS number or requirement. I will retrieve passages from the local standards and show their PDF page references.', 'citations': [], 'generation_mode': 'greeting'}
    # Resolve short follow-ups against the last user topic; assistant prose is not retrieval evidence.
    retrieval_query = query
    if not re.search(r'\bIS\s*\d+', query, re.I) and re.search(r'\b(it|its|that|those|these|this standard)\b|^(and|what about)\b', query, re.I):
        previous = next((m.content for m in reversed(request.history) if m.role == 'user'), '')
        if previous: retrieval_query = previous + '\n' + query
    try:
        corpus = get_corpus()
        hits = corpus.search(retrieval_query, limit=6, standard_id=request.standard_id)
    except (ValueError, OSError): raise HTTPException(503, 'Standards documents are unavailable. Check corpus ingestion.')
    citations = [{**evidence(c).model_dump(), 'is_number': c['is_number'], 'chunk_index': c['chunk_index']} for c in hits]
    answer, mode = grounded_reply(query, citations, [m.model_dump() for m in request.history])
    return {'answer': answer, 'citations': citations, 'generation_mode': mode, 'retrieval_mode': corpus.mode}
