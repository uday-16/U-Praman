from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import Response
from app.routers.auth import require_session
from app.schemas.reports import ProcurementReport, ReportCreateRequest
from app.services.report_generator import (
    generate_procurement_report, get_report_by_id, list_all_reports
)
from app.services.pdf_service import build_pdf_document
from app.routers.analysis import get_analysis_result

router = APIRouter(prefix="/reports", tags=["Procurement Reports"])


@router.post("", response_model=ProcurementReport)
def create_report(req: ReportCreateRequest, user=Depends(require_session)):
    analysis = get_analysis_result(req.analysis_id, user)
    officer_name = req.officer_name or user.get("full_name") or user.get("name") or "Procurement Officer"
    req.officer_name = officer_name
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
        # Check if report_id was actually passed as an analysis_id (e.g. anl-...)
        try:
            analysis = get_analysis_result(report_id, user)
            # Find existing report for this analysis or generate one on the fly
            for r in list_all_reports():
                if r.analysis.id == analysis.id:
                    return r
            req = ReportCreateRequest(
                analysis_id=analysis.id,
                officer_name=user.get("full_name") or user.get("name") or "Procurement Officer"
            )
            return generate_procurement_report(req, analysis)
        except HTTPException:
            raise HTTPException(404, 'Report not found.')
    get_analysis_result(report.analysis.id, user)
    return report


@router.get("/{report_id}/download")
def download_pdf_report(report_id: str, user=Depends(require_session)):
    report = get_report_detail(report_id, user)
    pdf_bytes = build_pdf_document(report)
    filename = f"PRAMAN_Procurement_Report_{report.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )


@router.get("/{report_id}/pdf")
def view_pdf_inline(report_id: str, user=Depends(require_session)):
    report = get_report_detail(report_id, user)
    pdf_bytes = build_pdf_document(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="PRAMAN_Procurement_Report_{report.id}.pdf"',
            "Cache-Control": "no-cache"
        }
    )
