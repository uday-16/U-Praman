from pydantic import BaseModel
from typing import List, Optional
from app.schemas.analysis import AnalysisResult

class ReportCreateRequest(BaseModel):
    analysis_id: str
    notes: Optional[str] = None
    officer_name: Optional[str] = "Procurement Officer"

class ProcurementReport(BaseModel):
    id: str
    title: str
    product_name: str
    created_at: str
    status: str
    officer_name: str
    analysis: AnalysisResult
    pdf_download_url: str
