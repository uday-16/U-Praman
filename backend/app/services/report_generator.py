"""Durable procurement report generator backed by disk storage."""
import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from filelock import FileLock

from app.schemas.reports import ProcurementReport, ReportCreateRequest
from app.schemas.analysis import AnalysisResult
from app.services.corpus import BACKEND, atomic_json

REPORT_STORE = BACKEND / "data" / "analyses"
REPORT_LOCK = FileLock(str(BACKEND / "data" / "reports_store.lock"), timeout=15)
REPORTS_CACHE: dict[str, ProcurementReport] = {}


def generate_procurement_report(req: ReportCreateRequest, analysis: AnalysisResult) -> ProcurementReport:
    REPORT_STORE.mkdir(parents=True, exist_ok=True)
    report_id = f"rpt-{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    title = f"Procurement Standards Report: {analysis.extracted.product_name}"
    
    report = ProcurementReport(
        id=report_id,
        title=title,
        product_name=analysis.extracted.product_name,
        created_at=created_at,
        status="Completed",
        officer_name=req.officer_name or "Procurement Officer",
        analysis=analysis,
        pdf_download_url=f"/api/v1/reports/{report_id}/download"
    )
    
    with REPORT_LOCK:
        atomic_json(REPORT_STORE / f"report-{report_id}.json", report.model_dump())
        REPORTS_CACHE[report_id] = report
    return report


def get_report_by_id(report_id: str) -> Optional[ProcurementReport]:
    if not re.fullmatch(r"[a-z0-9-]{1,80}", report_id):
        return None
    if report_id in REPORTS_CACHE:
        return REPORTS_CACHE[report_id]
    
    report_file = REPORT_STORE / f"report-{report_id}.json"
    if not report_file.exists():
        return None
    try:
        data = json.loads(report_file.read_text(encoding="utf-8"))
        report = ProcurementReport.model_validate(data)
        REPORTS_CACHE[report_id] = report
        return report
    except Exception:
        return None


def list_all_reports() -> List[ProcurementReport]:
    reports = list(REPORTS_CACHE.values())
    if REPORT_STORE.exists():
        for path in REPORT_STORE.glob("report-*.json"):
            rid = path.stem.replace("report-", "")
            if rid not in REPORTS_CACHE:
                try:
                    data = json.loads(path.read_text(encoding="utf-8"))
                    rep = ProcurementReport.model_validate(data)
                    REPORTS_CACHE[rid] = rep
                    reports.append(rep)
                except Exception:
                    pass
    # Deduplicate by id
    unique = {}
    for r in reports:
        unique[r.id] = r
    return list(unique.values())
