"""Durable, owner-scoped jobs executing the existing extraction and retrieval services."""
import json
import logging
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional
from filelock import FileLock
from app.schemas.analysis import AnalysisJobState, AnalysisStageInfo, AnalysisResult, RequirementInput
from app.schemas.standards import StandardGraph
from app.services.ai_extractor import extract_requirements_from_input, validate_requirement
from app.services.document_reader import read_document
from app.services.corpus import get_corpus, atomic_json, BACKEND
from app.services.evidence_service import evaluate_specification_completeness
from app.services.standards_db import get_standard_by_id, get_standard_graph
from app.services.vector_engine import rank_standards_for_requirement
from app.services.analysis_findings import select_mappings, verify_evidence, traceability, version_findings, applicability

logger = logging.getLogger('praman.jobs')
JOB_STORE = BACKEND / 'data' / 'analyses'
JOB_LOCK = FileLock(str(BACKEND / 'data' / 'analysis_jobs.lock'), timeout=15)
EXECUTOR = ThreadPoolExecutor(max_workers=3, thread_name_prefix='analysis-job')
ORDERED_STAGES = [
    ('VALIDATING', 'Validating input', 'Checking the supplied requirement or document.'),
    ('EXTRACTING', 'Understanding requirement', 'Extracting product, domain and technical specifications.'),
    ('RETRIEVING', 'Searching standards knowledge base', 'Retrieving candidate standards from the existing source index.'),
    ('REASONING', 'Evaluating relevance', 'Locating passages that address individual requirements.'),
    ('ANALYZING_EVIDENCE', 'Checking evidence', 'Checking citation identifiers, source pages and quoted text.'),
    ('RELATIONSHIPS', 'Checking relationships', 'Reading explicit references in the retrieved standards.'),
    ('VERSIONS', 'Checking versions and amendments', 'Reviewing indexed editions; current BIS status requires verification.'),
    ('ANALYZING_GAPS', 'Detecting specification gaps', 'Identifying missing input and incomplete evidence coverage.'),
    ('TRACEABILITY', 'Building traceability', 'Connecting requirements to source-validated passages.'),
    ('FINALIZING', 'Preparing results', 'Saving the analysis and its supporting findings.')
]
STAGE_KEYS = [s[0] for s in ORDERED_STAGES]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _build_stages_list(active_stage, completed_stages, failed=False):
    return [AnalysisStageInfo(id=key, label=label, description=desc,
        status='failed' if failed and key == active_stage else 'completed' if key in completed_stages else 'active' if key == active_stage else 'pending')
        for key, label, desc in ORDERED_STAGES]


def save_job(job):
    JOB_STORE.mkdir(parents=True, exist_ok=True)
    with JOB_LOCK:
        atomic_json(JOB_STORE / f'job-{job.id}.json', job.model_dump())


def load_job(job_id, user_id=None):
    if not re.fullmatch(r'[a-z0-9-]{1,80}', job_id):
        return None
    try:
        job = AnalysisJobState.model_validate_json((JOB_STORE / f'job-{job_id}.json').read_text(encoding='utf-8'))
        return job if user_id is None or job.user_id == user_id else None
    except (OSError, ValueError):
        return None


def create_analysis_job(user_id, input_type='text', filename=None, requirement_title='Procurement Requirement',
                        extracted=None, raw_input=None, document=None):
    if raw_input:
        validate_requirement('\n'.join(v for v in [raw_input.text, raw_input.product_name] if v))
    if extracted:
        validate_requirement(' '.join([extracted.product_name, *extracted.key_requirements]))
    now = _now()
    job = AnalysisJobState(id='job-' + uuid.uuid4().hex, user_id=user_id, input_type=input_type,
        filename=filename, requirement_title=requirement_title, status='QUEUED', current_stage='QUEUED',
        current_stage_label='Waiting to begin', total_stages=len(ORDERED_STAGES),
        stages=_build_stages_list('QUEUED', []), created_at=now, updated_at=now)
    save_job(job)
    EXECUTOR.submit(_execute_job_pipeline, job.id, user_id, extracted, raw_input, document)
    return job


def build_analysis(extracted, stage=lambda key: None):
    stage('RETRIEVING')
    corpus = get_corpus()
    recommendations = rank_standards_for_requirement(extracted)
    stage('REASONING')
    mappings, mode = select_mappings(extracted, recommendations)
    stage('ANALYZING_EVIDENCE')
    verify_evidence(recommendations, corpus)
    available = {ev.citation_id for rec in recommendations for ev in rec.evidence}
    mappings = [m for m in mappings if m.citation_id in available]
    stage('RELATIONSHIPS')
    records = {r.id: get_standard_by_id(r.id) for r in recommendations}
    related = {r.id: r for record in records.values() if record for r in record.related_standards}
    nodes, edges = {}, []
    for rec in recommendations:
        graph = get_standard_graph(rec.id)
        nodes.update({n.id: n for n in graph.nodes})
        edges.extend(graph.edges)
    stage('VERSIONS')
    versions = version_findings(recommendations, records)
    applicability_rows = applicability(extracted, recommendations)
    stage('ANALYZING_GAPS')
    completeness = evaluate_specification_completeness(extracted)
    gaps = completeness.recommendations_to_improve
    stage('TRACEABILITY')
    trace = traceability(extracted, mappings, recommendations)
    flags = []
    if recommendations:
        flags.append('Current versions and amendment applicability require authoritative BIS verification.')
    if any(row.status != 'Supported' for row in trace):
        flags.append('Requirement coverage needs officer review; retrieved passages do not establish compliance.')
    if extracted.warning or mode == 'source-review-required':
        flags.append('Requirement reasoning could not be completed. Source retrieval is available; review the evidence or try again.')
    if not recommendations:
        flags.append('No sufficiently relevant standard was identified in the available knowledge base.')
    stage('FINALIZING')
    return AnalysisResult(id='anl-' + uuid.uuid4().hex, status='Completed' if recommendations else 'Needs Review',
        extracted=extracted, recommendations=recommendations, related_standards=list(related.values()),
        completeness=completeness, graph=StandardGraph(nodes=list(nodes.values()), edges=edges),
        summary_notice='PRAMAN provides decision support. Verify applicable standards against authoritative BIS records before final procurement approval.',
        explanation=f'{len(recommendations)} candidate standards retrieved. {len(mappings)} requirement-to-source links located for officer review.',
        generation_mode=mode, retrieval_mode=corpus.mode, corpus_fingerprint=corpus.fingerprint,
        analyzed_at=_now(), source_name=extracted.source_name, category=extracted.category,
        traceability=trace, version_findings=versions, applicability=applicability_rows, gaps=gaps, review_flags=flags)


def _execute_job_pipeline(job_id, user_id, extracted, raw_input, document=None):
    job = load_job(job_id, user_id)
    if not job:
        return
    completed = []
    def stage(key):
        if job.current_stage in STAGE_KEYS and job.current_stage not in completed:
            completed.append(job.current_stage)
        job.status = 'PROCESSING'
        job.current_stage = key
        job.current_stage_label = next(s[1] for s in ORDERED_STAGES if s[0] == key)
        job.completed_stages = list(completed)
        job.progress_percent = len(completed) * 100 // len(ORDERED_STAGES)
        job.stages = _build_stages_list(key, completed)
        job.updated_at = _now()
        save_job(job)
    try:
        stage('VALIDATING')
        if extracted is None and raw_input is None and document is None:
            raise ValueError('Enter a procurement requirement or upload a document to continue.')
        stage('EXTRACTING')
        if document is not None:
            pages = read_document(document, job.filename or '')
            raw_input = RequirementInput(text='\n'.join(p['text'] for p in pages))
        if extracted is None:
            extracted = extract_requirements_from_input(raw_input)
        extracted.source_name = job.filename or extracted.source_name
        job.requirement_title = extracted.product_name
        result = build_analysis(extracted, stage)
        atomic_json(JOB_STORE / f'extraction-{extracted.id}.json', {'owner': user_id, 'data': extracted.model_dump()})
        atomic_json(JOB_STORE / f'analysis-{result.id}.json', {'owner': user_id, 'data': result.model_dump()})
        completed.append('FINALIZING')
        job.status = 'COMPLETED'
        job.current_stage = 'COMPLETED'
        job.current_stage_label = 'Analysis completed'
        job.completed_stages = completed
        job.progress_percent = 100
        job.stages = _build_stages_list('COMPLETED', completed)
        job.result = result
    except Exception as error:
        logger.exception('Analysis job %s failed', job_id)
        job.status = 'FAILED'
        if job.current_stage == 'RETRIEVING':
            job.error = 'Standards knowledge base is temporarily unavailable. Please try again.'
        elif job.current_stage in ('VALIDATING', 'EXTRACTING') and isinstance(error, ValueError):
            job.error = str(error)
        else:
            job.error = 'The analysis could not be completed at this stage. Please try again.'
        job.stages = _build_stages_list(job.current_stage, completed, failed=True)
    job.updated_at = _now()
    save_job(job)
