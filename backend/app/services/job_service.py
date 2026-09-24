"""Persistent Analysis Job state management and background RAG execution."""
import json
import logging
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

from filelock import FileLock

from app.schemas.analysis import (
    AnalysisJobState,
    AnalysisStageInfo,
    AnalysisResult,
    ExtractedRequirement,
    ExtractionReviewRequest,
    RequirementInput
)
from app.services.ai_extractor import extract_requirements_from_input
from app.services.corpus import get_corpus, atomic_json, BACKEND
from app.services.evidence_service import evaluate_specification_completeness
from app.services.gemini_service import grounded_reply
from app.services.standards_db import get_standard_by_id, get_standard_graph
from app.services.vector_engine import rank_standards_for_requirement

logger = logging.getLogger("praman.jobs")
JOB_STORE = BACKEND / "data" / "analyses"
JOB_LOCK = FileLock(str(BACKEND / "data" / "analysis_jobs.lock"), timeout=15)
EXECUTOR = ThreadPoolExecutor(max_workers=3, thread_name_prefix="analysis-job")

ORDERED_STAGES = [
    ("VALIDATING", "Requirement validation", "Validating input parameters, document structure, and integrity"),
    ("EXTRACTING", "Requirement extraction", "Extracting technical parameters, specifications, and scope"),
    ("IDENTIFYING_DOMAIN", "Domain identification", "Determining procurement category and engineering discipline"),
    ("RETRIEVING", "Standards retrieval", "Searching official BIS standards corpus for relevant specifications"),
    ("REASONING", "Standards reasoning", "Analyzing requirement conformity with retrieved standard clauses"),
    ("ANALYZING_EVIDENCE", "Evidence verification", "Verifying source clauses, amendments, and page citations"),
    ("ANALYZING_GAPS", "Gap analysis", "Evaluating specification completeness and compliance gaps"),
    ("FINALIZING", "Recommendation compilation", "Compiling final recommendations, related standards, and traceability")
]

STAGE_KEYS = [s[0] for s in ORDERED_STAGES]


def _build_stages_list(active_stage: str, completed_stages: List[str], failed: bool = False) -> List[AnalysisStageInfo]:
    items = []
    for key, label, desc in ORDERED_STAGES:
        if failed and key == active_stage:
            status = "failed"
        elif key in completed_stages:
            status = "completed"
        elif key == active_stage:
            status = "active"
        else:
            status = "pending"
        items.append(AnalysisStageInfo(id=key, label=label, status=status, description=desc))
    return items


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_job(job: AnalysisJobState) -> None:
    JOB_STORE.mkdir(parents=True, exist_ok=True)
    job_file = JOB_STORE / f"job-{job.id}.json"
    with JOB_LOCK:
        atomic_json(job_file, job.model_dump())


def load_job(job_id: str, user_id: Optional[str] = None) -> Optional[AnalysisJobState]:
    if not re.fullmatch(r"[a-z0-9-]{1,80}", job_id):
        return None
    job_file = JOB_STORE / f"job-{job_id}.json"
    if not job_file.exists():
        return None
    try:
        data = json.loads(job_file.read_text(encoding="utf-8"))
        job = AnalysisJobState.model_validate(data)
        if user_id and job.user_id != user_id:
            return None
        return job
    except Exception as err:
        logger.error(f"Error loading job {job_id}: {err}")
        return None


def create_analysis_job(
    user_id: str,
    input_type: str = "text",
    filename: Optional[str] = None,
    requirement_title: str = "Procurement Requirement",
    extracted: Optional[ExtractedRequirement] = None,
    raw_input: Optional[RequirementInput] = None
) -> AnalysisJobState:
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    now = _now()
    initial_stage = "VALIDATING"
    
    stages = _build_stages_list(initial_stage, [])
    job = AnalysisJobState(
        id=job_id,
        user_id=user_id,
        input_type=input_type,
        filename=filename,
        requirement_title=requirement_title or (extracted.product_name if extracted else "Procurement Requirement"),
        status="PROCESSING",
        current_stage=initial_stage,
        current_stage_label=ORDERED_STAGES[0][1],
        completed_stages=[],
        total_stages=len(ORDERED_STAGES),
        progress_percent=0,
        stages=stages,
        result=None,
        error=None,
        created_at=now,
        updated_at=now
    )
    save_job(job)
    
    # Launch background processing
    EXECUTOR.submit(_execute_job_pipeline, job.id, user_id, extracted, raw_input)
    return job


def _update_stage(job: AnalysisJobState, stage_key: str, completed: Optional[List[str]] = None) -> None:
    job.current_stage = stage_key
    stage_idx = STAGE_KEYS.index(stage_key) if stage_key in STAGE_KEYS else 0
    job.current_stage_label = ORDERED_STAGES[stage_idx][1] if stage_idx < len(ORDERED_STAGES) else stage_key
    if completed is not None:
        job.completed_stages = completed
    job.progress_percent = int((len(job.completed_stages) / len(ORDERED_STAGES)) * 100)
    job.stages = _build_stages_list(stage_key, job.completed_stages)
    job.updated_at = _now()
    save_job(job)


def _execute_job_pipeline(
    job_id: str,
    user_id: str,
    extracted: Optional[ExtractedRequirement],
    raw_input: Optional[RequirementInput]
) -> None:
    job = load_job(job_id)
    if not job:
        return

    completed: List[str] = []

    try:
        # STAGE 1: VALIDATING
        _update_stage(job, "VALIDATING", completed)
        if not extracted and not raw_input:
            raise ValueError("No requirement text or extracted parameters supplied.")
        completed.append("VALIDATING")

        # STAGE 2: EXTRACTING
        _update_stage(job, "EXTRACTING", completed)
        if not extracted:
            if not raw_input:
                raise ValueError("Requirement input missing.")
            extracted = extract_requirements_from_input(raw_input)
        if not extracted.product_name.strip():
            extracted.product_name = "Industrial Procurement Requirement"
        job.requirement_title = extracted.product_name
        completed.append("EXTRACTING")

        # STAGE 3: IDENTIFYING_DOMAIN
        _update_stage(job, "IDENTIFYING_DOMAIN", completed)
        # Classify domain and preserve categories
        corpus = get_corpus()
        completed.append("IDENTIFYING_DOMAIN")

        # STAGE 4: RETRIEVING
        _update_stage(job, "RETRIEVING", completed)
        recommendations = rank_standards_for_requirement(extracted)
        completed.append("RETRIEVING")

        # STAGE 5: REASONING
        _update_stage(job, "REASONING", completed)
        citations = []
        for rec in recommendations:
            for source in rec.evidence:
                citations.append({**source.model_dump(), "is_number": rec.is_number})

        query_summary = "\n".join([
            extracted.product_name,
            extracted.application,
            extracted.purpose,
            *extracted.key_requirements
        ])
        explanation, mode = grounded_reply(
            f"Explain the relevance and specification gaps for this procurement requirement:\n{query_summary}",
            citations
        )
        completed.append("REASONING")

        # STAGE 6: ANALYZING_EVIDENCE
        _update_stage(job, "ANALYZING_EVIDENCE", completed)
        standard = get_standard_by_id(recommendations[0].id) if recommendations else None
        completed.append("ANALYZING_EVIDENCE")

        # STAGE 7: ANALYZING_GAPS
        _update_stage(job, "ANALYZING_GAPS", completed)
        completeness = evaluate_specification_completeness(extracted)
        completed.append("ANALYZING_GAPS")

        # STAGE 8: FINALIZING
        _update_stage(job, "FINALIZING", completed)
        analysis_id = f"anl-{uuid.uuid4().hex}"
        result = AnalysisResult(
            id=analysis_id,
            status="Completed" if recommendations else "Needs Review",
            extracted=extracted,
            recommendations=recommendations,
            related_standards=standard.related_standards if standard else [],
            completeness=completeness,
            graph=get_standard_graph(standard.id if standard else ""),
            summary_notice=(
                "Retrieval relevance is not a compliance score. Editions and amendments refer to local files only. "
                "Current BIS validity, supersession and mandatory certification require official verification."
            ),
            explanation=explanation,
            generation_mode=mode,
            retrieval_mode=corpus.mode,
            corpus_fingerprint=corpus.fingerprint
        )

        # Save durable analysis and extraction files for backwards compatibility
        atomic_json(JOB_STORE / f"extraction-{extracted.id}.json", {"owner": user_id, "data": extracted.model_dump()})
        atomic_json(JOB_STORE / f"analysis-{result.id}.json", {"owner": user_id, "data": result.model_dump()})

        completed.append("FINALIZING")

        # Mark COMPLETED
        job.status = "COMPLETED"
        job.current_stage = "COMPLETED"
        job.current_stage_label = "Analysis completed"
        job.completed_stages = completed
        job.progress_percent = 100
        job.stages = _build_stages_list("COMPLETED", completed)
        job.result = result
        job.updated_at = _now()
        save_job(job)
        logger.info(f"Analysis job {job_id} successfully completed for user {user_id}")

    except Exception as err:
        logger.error(f"Analysis job {job_id} failed: {err}", exc_info=True)
        job.status = "FAILED"
        job.error = str(err) or "Analysis could not be completed."
        job.stages = _build_stages_list(job.current_stage, completed, failed=True)
        job.updated_at = _now()
        save_job(job)
