from pydantic import BaseModel, Field
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
    category: str = ""
    source_name: str = "Entered requirement"

class ExtractionReviewRequest(BaseModel):
    product_name: str
    application: str
    purpose: str
    key_requirements: List[str]
    technical_parameters: Optional[Dict[str, str]] = None
    safety_parameters: Optional[List[str]] = None
    category: Optional[str] = None

class TraceabilityItem(BaseModel):
    requirement: str
    standard_id: str = ""
    is_number: str = ""
    citation_id: str = ""
    source: str = ""
    page: int = 0
    excerpt: str = ""
    status: Literal["Supported", "Partial", "Review Required", "Not Found"] = "Review Required"
    note: str = ""

class VersionFinding(BaseModel):
    standard_id: str
    is_number: str
    indexed_version: str
    previous_versions: List[str] = Field(default_factory=list)
    amendments: List[str] = Field(default_factory=list)
    source: str = ""
    status: str = "Not verified in the available knowledge base."

class ApplicabilityFinding(BaseModel):
    referenced_standard: str
    standard_id: str = ""
    product_scope: str = "Review Required"
    application: str = "Review Required"
    technical_characteristics: str = "Review Required"
    overall: str = "Requires verification against the source scope."

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
    analyzed_at: str = ""
    source_name: str = "Entered requirement"
    category: str = ""
    traceability: List[TraceabilityItem] = Field(default_factory=list)
    version_findings: List[VersionFinding] = Field(default_factory=list)
    applicability: List[ApplicabilityFinding] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    review_flags: List[str] = Field(default_factory=list)

class AnalysisStageInfo(BaseModel):
    id: str
    label: str
    status: Literal["pending", "active", "completed", "failed"]
    description: str = ""

class AnalysisJobState(BaseModel):
    id: str
    user_id: str
    input_type: str = "text"
    filename: Optional[str] = None
    requirement_title: str = "Procurement Requirement"
    status: Literal["QUEUED", "PROCESSING", "COMPLETED", "FAILED"] = "QUEUED"
    current_stage: str = "QUEUED"
    current_stage_label: str = "Job queued"
    completed_stages: List[str] = []
    total_stages: int = 8
    progress_percent: int = 0
    stages: List[AnalysisStageInfo] = []
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str

class AnalysisJobCreateRequest(BaseModel):
    extraction_id: Optional[str] = None
    review: Optional[ExtractionReviewRequest] = None
    text: Optional[str] = None
    product_name: Optional[str] = None

