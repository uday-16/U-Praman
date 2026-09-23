from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.services.vector_engine import get_collection, get_model
from app.services.gemini_service import generate_dynamic_chat_reply
import logging
import re

logger = logging.getLogger("praman.chat")

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    query: str
    standard_id: Optional[str] = None  # Optional: if querying a specific standard

class Citation(BaseModel):
    source: str
    is_number: str
    chunk_index: int
    text: str

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]

GREETING_WORDS = {"hi", "hii", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "help", "who are you"}

def is_greeting(query: str) -> bool:
    clean = re.sub(r'[^a-zA-Z\s]', '', query).strip().lower()
    return clean in GREETING_WORDS or (len(clean) <= 3 and clean in GREETING_WORDS)

@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
async def chat_with_knowledge_base(request: ChatRequest):
    query = request.query.strip()
    if not query:
        return ChatResponse(
            answer="Please enter a question about Indian Standards (e.g., 'What is the requirement for impact resistance under IS 2925?' or 'Permissible turbidity in IS 10500').",
            citations=[]
        )

    # Check for simple greetings
    if is_greeting(query):
        reply = generate_dynamic_chat_reply(query, citations=[])
        return ChatResponse(
            answer=reply,
            citations=[]
        )
        
    citations: List[Citation] = []
    citations_data = []

    # Attempt to retrieve citations from RAG Chroma collection if available
    try:
        collection = get_collection()
        if collection:
            model = get_model()
            query_embed = model.encode([query])
            if hasattr(query_embed, "tolist"):
                query_embed = query_embed.tolist()
            elif isinstance(query_embed, list) and len(query_embed) > 0 and hasattr(query_embed[0], "tolist"):
                query_embed = [e.tolist() for e in query_embed]
            
            where_clause = None
            if request.standard_id:
                where_clause = {"is_number": request.standard_id}
                
            results = collection.query(
                query_embeddings=query_embed,
                n_results=3,
                where=where_clause  # type: ignore[arg-type]
            )
            
            docs = results.get('documents') if results else None
            metas = results.get('metadatas') if results else None
            
            if docs and metas and len(docs) > 0 and len(metas) > 0 and docs[0] and metas[0]:
                for doc, meta in zip(docs[0], metas[0]):
                    meta_dict = meta if isinstance(meta, dict) else {}
                    raw_idx = meta_dict.get("chunk_index")
                    chunk_idx = int(raw_idx) if isinstance(raw_idx, (int, float)) else 0
                    cit = Citation(
                        source=str(meta_dict.get("source") or "Unknown"),
                        is_number=str(meta_dict.get("is_number") or "Unknown"),
                        chunk_index=chunk_idx,
                        text=doc
                    )
                    citations.append(cit)
                    citations_data.append({
                        "source": cit.source,
                        "is_number": cit.is_number,
                        "chunk_index": cit.chunk_index,
                        "text": cit.text
                    })
    except Exception as e:
        logger.warning(f"Vector search skipped or encountered notice: {e}")

    # Generate dynamic, rich response using Gemini (grounded in citations if available)
    try:
        answer = generate_dynamic_chat_reply(query, citations=citations_data)
        return ChatResponse(
            answer=answer,
            citations=citations
        )
    except Exception as e:
        logger.error(f"Error generating chat answer: {e}", exc_info=True)
        return ChatResponse(
            answer="An error occurred while generating a response. Please verify connection and try again.",
            citations=[]
        )

