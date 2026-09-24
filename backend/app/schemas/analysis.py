from pydantic import BaseModel
from typing import List, Optional, Literal, Dict
from app.schemas.standards import IndianStandard, SourceEvidence, StandardGraph, RelatedStandardItem

class RequirementInput(BaseModel):
    text: Optional[str] = None
    product_name: Optional[str] = None
    purpose: Optional[str] = None
    application: Optional[str] = None
    technical_specs: Optional[str] = None
    safety_specs: Optional[str] = None
    quantity: Optional[str] = None

class ExtractedRequirement(BaseModel):
    id: str
    product_name: str
    application: str
    purpose: str
    key_requirements: List[str]
    technical_parameters: Dict[str, str]
    safety_parameters: List[str]
    extracted_at: str
    source_text: str = ""
    extraction_mode: str = "source-text"
    warning: str = ""
    quantity: str = ""

class ExtractionReviewRequest(BaseModel):
    product_name: str
    application: str
    purpose: str
    key_requirements: List[str]
    technical_parameters: Optional[Dict[str, str]] = None
    safety_parameters: Optional[List[str]] = None

class MatchBreakdown(BaseModel):
    product_match: str  # High, Medium, Low
    application_match: str
    safety_match: str
    technical_match: str

class StandardRecommendation(BaseModel):
    id: str
    is_number: str
    title: str
    relevance: Literal["very-high", "high", "medium", "needs-review"]
    score: float
    reasons: List[str]
    breakdown: MatchBreakdown
    evidence: List[SourceEvidence]
    latest_version: str
    status: str
    category: str

class SpecificationCheckItem(BaseModel):
    category: str
    label: str
    status: Literal["pass", "warning", "fail"]
    details: str

class SpecificationCompleteness(BaseModel):
    score: int
    items: List[SpecificationCheckItem]
    recommendations_to_improve: List[str]

class AnalysisResult(BaseModel):
    id: str
    status: Literal["Completed", "Processing", "Needs Review"]
    extracted: ExtractedRequirement
    recommendations: List[StandardRecommendation]
    related_standards: List[RelatedStandardItem]
    completeness: SpecificationCompleteness
    graph: StandardGraph
    summary_notice: str
    explanation: str = ""
    generation_mode: str = "extractive"
    retrieval_mode: str = ""
    corpus_fingerprint: str = ""
