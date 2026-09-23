from pydantic import BaseModel
from typing import List, Optional, Literal

class ClauseInfo(BaseModel):
    number: str
    title: str
    summary: str
    is_mandatory: bool = True

class VersionItem(BaseModel):
    year: str
    title: str
    type: Literal["original", "revision", "amendment", "latest"]
    description: str

class CertificationItem(BaseModel):
    scheme: str
    status: str
    details: str
    is_mandatory: bool = False

class SourceEvidence(BaseModel):
    section: str
    clause: str
    text: str
    confidence: float
    verified: bool = True

class RelatedStandardItem(BaseModel):
    id: str
    is_number: str
    title: str
    relationship: Literal["testing", "safety", "installation", "normative-reference", "related"]
    description: str

class GraphNode(BaseModel):
    id: str
    is_number: str
    title: str
    type: Literal["main", "testing", "safety", "reference", "installation"]
    category: str

class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str

class StandardGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class IndianStandard(BaseModel):
    id: str
    is_number: str
    title: str
    category: str
    status: Literal["Active", "Under Revision", "Reaffirmed", "Withdrawn"]
    year: str
    scope: str
    key_requirements: List[str]
    clauses: List[ClauseInfo]
    related_standards: List[RelatedStandardItem]
    versions: List[VersionItem]
    certifications: List[CertificationItem]
    sources: List[SourceEvidence]
