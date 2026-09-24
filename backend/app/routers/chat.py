import logging
from typing import List, Optional, Literal
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator
from app.services.chat_assistant import chat_reply, LANGUAGES
from app.services.chat_audio import transcribe_audio, synthesize_speech

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/chat', tags=['chat'])


class ChatTurn(BaseModel):
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    standard_id: Optional[str] = Field(default=None, max_length=100)
    history: List[ChatTurn] = Field(default_factory=list, max_length=12)
    language: str = Field(default='auto', max_length=12)
    web_enabled: bool = True

    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Query cannot be blank.')
        return v


class Citation(BaseModel):
    source: str
    is_number: str
    chunk_index: int
    page: int
    text: str


class WebSource(BaseModel):
    title: str
    url: str


class ChatResponse(BaseModel):
    answer: str
    language: str
    standards_note: str = ''
    citations: List[Citation] = Field(default_factory=list)
    web_sources: List[WebSource] = Field(default_factory=list)
    web_status: Literal['verified', 'unavailable', 'not_needed', 'off'] = 'not_needed'
    search_suggestions: str = ''


@router.post('', response_model=ChatResponse)
@router.post('/', response_model=ChatResponse)
def chat_with_knowledge_base(request: ChatRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(422, 'Please enter a message.')
    if request.language not in LANGUAGES | {'auto'}:
        raise HTTPException(422, 'Unsupported language selection.')
    return chat_reply(query, [turn.model_dump() for turn in request.history], request.language,
                      request.web_enabled, request.standard_id)


@router.post('/transcribe')
async def transcribe(audio: UploadFile = File(...), language: str = Form('auto')):
    mime = (audio.content_type or '').split(';')[0]
    if mime not in {'audio/webm','audio/ogg','audio/wav','audio/mp4','audio/mpeg','audio/x-wav'}:
        raise HTTPException(415, 'Unsupported recording format.')
    if language not in LANGUAGES | {'auto'}:
        raise HTTPException(422, 'Unsupported language selection.')
    data = await audio.read(8 * 1024 * 1024 + 1)
    await audio.close()
    if not data or len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, 'Use a recording shorter than 45 seconds (maximum 8 MB).')
    try:
        text = await run_in_threadpool(transcribe_audio, data, mime, language)
        return {'text': text}
    except Exception as exc:
        logger.warning('Transcription failed: %s', type(exc).__name__)
        raise HTTPException(503, 'Could not transcribe the recording. Please retry or type your message.')


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    language: str = Field(default='en', max_length=12)


@router.post('/speak')
def speak(request: SpeechRequest):
    if request.language not in LANGUAGES:
        raise HTTPException(422, 'Unsupported language selection.')
    if not request.text.strip():
        raise HTTPException(422, 'Please provide text to read.')
    try:
        return Response(synthesize_speech(request.text, request.language), media_type='audio/wav',
                        headers={'Cache-Control':'no-store'})
    except Exception as exc:
        logger.warning('Speech output failed: %s', type(exc).__name__)
        raise HTTPException(503, 'Voice is temporarily unavailable. You can still read the reply.')
