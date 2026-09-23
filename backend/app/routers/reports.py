from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.schemas.reports import ProcurementReport, ReportCreateRequest
from app.services.report_generator import (
    generate_procurement_report, get_report_by_id, list_all_reports
)
from app.routers.analysis import ANALYSIS_STORE, get_analysis_result

router = APIRouter(prefix="/reports", tags=["Procurement Reports"])

@router.post("", response_model=ProcurementReport)
def create_report(req: ReportCreateRequest):
    analysis = get_analysis_result(req.analysis_id)
    return generate_procurement_report(req, analysis)

@router.get("", response_model=List[ProcurementReport])
def list_reports():
    return list_all_reports()

@router.get("/{report_id}", response_model=ProcurementReport)
def get_report_detail(report_id: str):
    report = get_report_by_id(report_id)
    if not report:
        # Fallback dummy report for direct URL navigation in demo mode
        analysis = get_analysis_result(f"anl-demo-{report_id}")
        report = generate_procurement_report(ReportCreateRequest(analysis_id=analysis.id), analysis)
    return report

@router.get("/{report_id}/download")
def download_pdf_report(report_id: str):
    report = get_report_by_id(report_id)
    if not report:
        analysis = get_analysis_result(f"anl-demo-{report_id}")
        report = generate_procurement_report(ReportCreateRequest(analysis_id=analysis.id), analysis)
        
    content = {
        "report_id": report.id,
        "title": report.title,
        "created_at": report.created_at,
        "officer": report.officer_name,
        "product_name": report.product_name,
        "recommendations": [
            {
                "is_number": r.is_number,
                "title": r.title,
                "relevance": r.relevance,
                "score": r.score
            }
            for r in report.analysis.recommendations
        ],
        "completeness_score": report.analysis.completeness.score,
        "disclaimer": report.analysis.summary_notice
    }
    
    return JSONResponse(
        content=content,
        headers={"Content-Disposition": f"attachment; filename=Procurement_Report_{report_id}.json"}
    )
