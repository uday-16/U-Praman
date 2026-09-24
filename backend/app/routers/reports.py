from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.routers.auth import require_session
from fastapi.responses import JSONResponse
from app.schemas.reports import ProcurementReport, ReportCreateRequest
from app.services.report_generator import (
    generate_procurement_report, get_report_by_id, list_all_reports
)
from app.routers.analysis import ANALYSIS_STORE, get_analysis_result

router = APIRouter(prefix="/reports", tags=["Procurement Reports"])

@router.post("", response_model=ProcurementReport)
def create_report(req: ReportCreateRequest, user=Depends(require_session)):
    analysis = get_analysis_result(req.analysis_id, user)
    return generate_procurement_report(req, analysis)

@router.get("", response_model=List[ProcurementReport])
def list_reports(user=Depends(require_session)):
    results = []
    for report in list_all_reports():
        try:
            get_analysis_result(report.analysis.id, user)
            results.append(report)
        except HTTPException:
            pass
    return results

@router.get("/{report_id}", response_model=ProcurementReport)
def get_report_detail(report_id: str, user=Depends(require_session)):
    report = get_report_by_id(report_id)
    if not report:
        raise HTTPException(404, 'Report not found.')
    get_analysis_result(report.analysis.id, user)
    return report

@router.get("/{report_id}/download")
def download_pdf_report(report_id: str, user=Depends(require_session)):
    report = get_report_detail(report_id, user)
        
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
