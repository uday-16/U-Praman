"""Persistent, owner-scoped requirement analysis workflow."""
import json
import re
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, Field
from app.routers.auth import require_session
from app.schemas.analysis import RequirementInput, ExtractedRequirement, ExtractionReviewRequest, AnalysisResult, AnalysisJobState, AnalysisJobCreateRequest
from app.services.ai_extractor import extract_requirements_from_input, validate_requirement
from app.services.document_reader import read_document, validate_upload, MAX_UPLOAD_BYTES
from app.services.corpus import BACKEND, atomic_json
from app.services.job_service import create_analysis_job, load_job, build_analysis
from app.services.gemini_service import generate_dynamic_chat_reply, NOT_FOUND

router = APIRouter(prefix='/analysis', tags=['Requirement Analysis'])
STORE = BACKEND / 'data' / 'analyses'
ANALYSIS_STORE = {}


def owner_id(user):
    return str(user.get('id', user.get('_id', '')))


def save(kind, value, user):
    atomic_json(STORE / f'{kind}-{value.id}.json', {'owner': owner_id(user), 'data': value.model_dump()})


def load(kind, identifier, user, schema):
    if not re.fullmatch(r'[a-z0-9-]{1,80}', identifier):
        raise HTTPException(404, 'Record not found.')
    try:
        record = json.loads((STORE / f'{kind}-{identifier}.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        raise HTTPException(404, 'Record not found. Start a new analysis.')
    if record['owner'] != owner_id(user):
        raise HTTPException(404, 'Record not found.')
    return schema.model_validate(record['data'])


@router.post('/extract', response_model=ExtractedRequirement)
def extract_requirements(req: RequirementInput, user=Depends(require_session)):
    try:
        extracted = extract_requirements_from_input(req)
    except ValueError as error:
        raise HTTPException(422, str(error))
    save('extraction', extracted, user)
    return extracted


@router.post('/upload', response_model=ExtractedRequirement)
def upload_tender_document(file: UploadFile = File(...), user=Depends(require_session)):
    try:
        pages = read_document(file.file.read(MAX_UPLOAD_BYTES + 1), file.filename or '')
        extracted = extract_requirements_from_input(RequirementInput(text='\n'.join(p['text'] for p in pages)))
        extracted.source_name = file.filename or 'Uploaded document'
    except ValueError as error:
        raise HTTPException(422, str(error))
    save('extraction', extracted, user)
    return extracted


@router.get('/extractions/{extraction_id}', response_model=ExtractedRequirement)
def get_extraction(extraction_id: str, user=Depends(require_session)):
    return load('extraction', extraction_id, user, ExtractedRequirement)


@router.post('/confirm', response_model=AnalysisResult)
def confirm_and_analyze(extraction_id: str, review: ExtractionReviewRequest, user=Depends(require_session)):
    extracted = load('extraction', extraction_id, user, ExtractedRequirement)
    if not review.product_name.strip():
        raise HTTPException(422, 'Product name is required.')
    for key, value in review.model_dump(exclude_none=True).items():
        setattr(extracted, key, value)
    try:
        result = build_analysis(extracted)
    except (ValueError, OSError):
        raise HTTPException(503, 'Standards knowledge base is temporarily unavailable.')
    save('extraction', extracted, user)
    save('analysis', result, user)
    return result


@router.post('/jobs', response_model=AnalysisJobState)
def create_job_endpoint(payload: AnalysisJobCreateRequest, user=Depends(require_session)):
    try:
        if payload.extraction_id:
            extracted = load('extraction', payload.extraction_id, user, ExtractedRequirement)
            if payload.review:
                for key, value in payload.review.model_dump(exclude_none=True).items():
                    setattr(extracted, key, value)
            return create_analysis_job(owner_id(user), input_type='review', requirement_title=extracted.product_name, extracted=extracted)
        validate_requirement(payload.text)
        return create_analysis_job(owner_id(user), raw_input=RequirementInput(text=payload.text, product_name=payload.product_name),
            requirement_title=payload.product_name or 'Procurement requirement')
    except ValueError as error:
        raise HTTPException(422, str(error))


@router.post('/jobs/upload', response_model=AnalysisJobState)
def upload_for_job_endpoint(file: UploadFile = File(...), user=Depends(require_session)):
    try:
        contents = file.file.read(MAX_UPLOAD_BYTES + 1)
        validate_upload(contents, file.filename or '')
        return create_analysis_job(owner_id(user), input_type=Path(file.filename or '').suffix.lower().lstrip('.'),
            filename=file.filename, requirement_title=file.filename or 'Tender document', document=contents)
    except ValueError as error:
        raise HTTPException(422, str(error))


@router.get('/jobs/{job_id}', response_model=AnalysisJobState)
def get_job_status(job_id: str, user=Depends(require_session)):
    job = load_job(job_id, owner_id(user))
    if not job:
        raise HTTPException(404, 'Analysis job not found.')
    return job


@router.get('')
def list_analyses(user=Depends(require_session)):
    results = {}
    for path in STORE.glob('analysis-*.json'):
        try:
            record = json.loads(path.read_text(encoding='utf-8'))
            if record.get('owner') == owner_id(user):
                a = AnalysisResult.model_validate(record['data'])
                dt = a.analyzed_at or a.extracted.extracted_at or ''
                # Key by normalized product name or analysis ID to avoid repeated duplicates
                key = (a.extracted.product_name or '').strip().lower() if (a.extracted and a.extracted.product_name) else a.id
                entry = {
                    'id': a.id,
                    'product': a.extracted.product_name if a.extracted else 'Procurement Requirement',
                    'requirementText': (a.extracted.source_text if a.extracted else '') or '',
                    'category': a.category or (a.extracted.category if a.extracted else None) or 'General',
                    'status': a.status or 'Completed',
                    'standardsCount': len(a.recommendations or []),
                    'date': dt
                }
                if key not in results or (dt > (results[key].get('date') or '')):
                    results[key] = entry
        except (OSError, ValueError, KeyError):
            continue
    return sorted(list(results.values()), key=lambda a: a['date'] or '', reverse=True)


class CategoryUpdate(BaseModel):
    category: str = Field(max_length=160)


@router.patch('/{analysis_id}/category', response_model=AnalysisResult)
def update_category(analysis_id: str, payload: CategoryUpdate, user=Depends(require_session)):
    result = load('analysis', analysis_id, user, AnalysisResult)
    result.category = result.extracted.category = payload.category.strip()
    save('analysis', result, user)
    return result


class AnalysisQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


@router.post('/{analysis_id}/ask')
def ask_analysis(analysis_id: str, payload: AnalysisQuestion, user=Depends(require_session)):
    result = load('analysis', analysis_id, user, AnalysisResult)
    citations = [{**e.model_dump(), 'is_number': r.is_number} for r in result.recommendations for e in r.evidence]
    context = json.dumps({'analysis_id': result.id, 'requirement': result.extracted.model_dump(),
        'traceability': [r.model_dump() for r in result.traceability],
        'related_standards': [r.model_dump() for r in result.related_standards]}, ensure_ascii=False)
    answer = generate_dynamic_chat_reply(payload.question + '\nAnalysis context: ' + context, citations)
    if answer == NOT_FOUND:
        answer = 'I could not verify that from the standards available in this analysis.'
    return {'answer': answer, 'analysis_id': result.id}


@router.get('/{analysis_id}', response_model=AnalysisResult)
def get_analysis_result(analysis_id: str, user=Depends(require_session)):
    return load('analysis', analysis_id, user, AnalysisResult)
