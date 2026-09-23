import uuid
from datetime import datetime
from app.schemas.reports import ProcurementReport, ReportCreateRequest
from app.schemas.analysis import AnalysisResult

# In-memory storage for generated reports
REPORTS_DB: dict[str, ProcurementReport] = {}

def generate_procurement_report(req: ReportCreateRequest, analysis: AnalysisResult) -> ProcurementReport:
    report_id = f"rpt-{uuid.uuid4().hex[:8]}"
    created_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    
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
    
    REPORTS_DB[report_id] = report
    return report

def get_report_by_id(report_id: str) -> ProcurementReport | None:
    return REPORTS_DB.get(report_id)

def list_all_reports() -> list[ProcurementReport]:
    return list(REPORTS_DB.values())
