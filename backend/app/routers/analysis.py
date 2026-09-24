"""Persistent, owner-scoped requirement analysis workflow."""
import json
import re
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.routers.auth import require_session
from app.schemas.analysis import RequirementInput, ExtractedRequirement, ExtractionReviewRequest, AnalysisResult
from app.services.ai_extractor import extract_requirements_from_input
from app.services.document_reader import read_document, MAX_UPLOAD_BYTES
from app.services.vector_engine import rank_standards_for_requirement
from app.services.evidence_service import evaluate_specification_completeness
from app.services.standards_db import get_standard_graph, get_standard_by_id
from app.services.corpus import get_corpus, BACKEND, atomic_json
from app.services.gemini_service import grounded_reply

router = APIRouter(prefix='/analysis', tags=['Requirement Analysis'])
STORE = BACKEND / 'data' / 'analyses'
ANALYSIS_STORE = {}  # Compatibility for report imports; durable records live on disk.


def owner_id(user):
    return str(user.get('id', user.get('_id', '')))


def save(kind, value, user):
    atomic_json(STORE / f'{kind}-{value.id}.json', {'owner': owner_id(user), 'data': value.model_dump()})


def load(kind, identifier, user, schema):
    if not re.fullmatch(r'[a-z0-9-]{1,80}', identifier): raise HTTPException(404, 'Record not found.')
    try:
        record = json.loads((STORE / f'{kind}-{identifier}.json').read_text(encoding='utf-8'))
    except (OSError, ValueError): raise HTTPException(404, 'Record not found. Start a new analysis.')
    if record['owner'] != owner_id(user): raise HTTPException(404, 'Record not found.')
    return schema.model_validate(record['data'])


@router.post('/extract', response_model=ExtractedRequirement)
def extract_requirements(req: RequirementInput, user=Depends(require_session)):
    try: extracted = extract_requirements_from_input(req)
    except ValueError as error: raise HTTPException(422, str(error))
    save('extraction', extracted, user)
    return extracted


@router.post('/upload', response_model=ExtractedRequirement)
def upload_tender_document(file: UploadFile = File(...), user=Depends(require_session)):
    try:
        contents = file.file.read(MAX_UPLOAD_BYTES + 1)
        pages = read_document(contents, file.filename or '')
        extracted = extract_requirements_from_input(RequirementInput(text='\n'.join(p['text'] for p in pages)))
    except ValueError as error: raise HTTPException(422, str(error))
    save('extraction', extracted, user)
    return extracted


@router.get('/extractions/{extraction_id}', response_model=ExtractedRequirement)
def get_extraction(extraction_id: str, user=Depends(require_session)):
    return load('extraction', extraction_id, user, ExtractedRequirement)


@router.post('/confirm', response_model=AnalysisResult)
def confirm_and_analyze(extraction_id: str, review: ExtractionReviewRequest, user=Depends(require_session)):
    extracted = load('extraction', extraction_id, user, ExtractedRequirement)
    if not review.product_name.strip(): raise HTTPException(422, 'Product name is required.')
    for key, value in review.model_dump(exclude_none=True).items(): setattr(extracted, key, value)
    try:
        corpus = get_corpus()
        recommendations = rank_standards_for_requirement(extracted)
    except (ValueError, OSError): raise HTTPException(503, 'Standards corpus is unavailable. Run the ingestion command and check its report.')
    citations = []
    for rec in recommendations:
        for source in rec.evidence:
            citations.append({**source.model_dump(), 'is_number': rec.is_number})
    explanation, mode = grounded_reply('Explain the relevance and specification gaps for this procurement requirement: ' +
        '\n'.join([extracted.product_name, extracted.application, extracted.purpose, *extracted.key_requirements]), citations)
    standard = get_standard_by_id(recommendations[0].id) if recommendations else None
    result = AnalysisResult(id='anl-' + uuid.uuid4().hex, status='Completed' if recommendations else 'Needs Review',
        extracted=extracted, recommendations=recommendations, related_standards=standard.related_standards if standard else [],
        completeness=evaluate_specification_completeness(extracted), graph=get_standard_graph(standard.id if standard else ''),
        summary_notice='Retrieval relevance is not a compliance score. Editions and amendments refer to local files only. Current BIS validity, supersession and mandatory certification require official verification.',
        explanation=explanation, generation_mode=mode, retrieval_mode=corpus.mode, corpus_fingerprint=corpus.fingerprint)
    save('extraction', extracted, user)
    save('analysis', result, user)
    return result


from app.schemas.analysis import AnalysisJobState, AnalysisJobCreateRequest
from app.services.job_service import create_analysis_job, load_job


@router.post('/jobs', response_model=AnalysisJobState)
def create_job_endpoint(payload: AnalysisJobCreateRequest, user=Depends(require_session)):
    uid = owner_id(user)
    if payload.extraction_id:
        extracted = load('extraction', payload.extraction_id, user, ExtractedRequirement)
        if payload.review:
            for key, value in payload.review.model_dump(exclude_none=True).items():
                setattr(extracted, key, value)
        job = create_analysis_job(
            user_id=uid,
            input_type='review',
            requirement_title=extracted.product_name,
            extracted=extracted
        )
        return job
    elif payload.text:
        req = RequirementInput(text=payload.text, product_name=payload.product_name)
        job = create_analysis_job(
            user_id=uid,
            input_type='text',
            requirement_title=payload.product_name or 'Procurement Requirement',
            raw_input=req
        )
        return job
    else:
        raise HTTPException(422, 'Provide either an extraction_id with review or requirement text.')


@router.post('/jobs/upload', response_model=AnalysisJobState)
def upload_for_job_endpoint(file: UploadFile = File(...), user=Depends(require_session)):
    uid = owner_id(user)
    try:
        contents = file.file.read(MAX_UPLOAD_BYTES + 1)
        pages = read_document(contents, file.filename or '')
        raw_text = '\n'.join(p['text'] for p in pages)
        req = RequirementInput(text=raw_text)
        job = create_analysis_job(
            user_id=uid,
            input_type=Path(file.filename or '').suffix.lower().lstrip('.') or 'pdf',
            filename=file.filename,
            requirement_title=file.filename or 'Tender Document',
            raw_input=req
        )
        return job
    except ValueError as error:
        raise HTTPException(422, str(error))


@router.get('/jobs/{job_id}', response_model=AnalysisJobState)
def get_job_status(job_id: str, user=Depends(require_session)):
    uid = owner_id(user)
    job = load_job(job_id, uid)
    if not job:
        raise HTTPException(404, 'Analysis job not found.')
    return job


@router.get('/{analysis_id}', response_model=AnalysisResult)
def get_analysis_result(analysis_id: str, user=Depends(require_session)):
    return load('analysis', analysis_id, user, AnalysisResult)

