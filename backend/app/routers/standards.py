from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from app.services.corpus import get_corpus
from app.schemas.standards import IndianStandard, StandardGraph, VersionItem
from app.services.standards_db import (
    get_all_standards, get_standard_by_id, get_standard_graph
)

router = APIRouter(prefix="/standards", tags=["Indian Standards Knowledge Base"])

@router.get("", response_model=List[IndianStandard])
def search_standards(
    q: Optional[str] = Query(None, description="Search term (IS number, product, or keyword)"),
    category: Optional[str] = Query(None, description="Category filter"),
    status: Optional[str] = Query(None, description="Status filter")
):
    results = get_all_standards()
    
    if q:
        query_str = q.lower().strip()
        results = [
            std for std in results
            if query_str in std.is_number.lower()
            or query_str in std.title.lower()
            or query_str in std.scope.lower()
            or query_str in std.category.lower()
            or any(query_str in req.lower() for req in std.key_requirements)
        ]
        
    if category:
        results = [std for std in results if std.category.lower() == category.lower()]
        
    if status:
        results = [std for std in results if std.status.lower() == status.lower()]
        
    return results

@router.get("/source/{filename}")
def get_source(filename: str):
    corpus = get_corpus()
    if filename not in corpus.by_source:
        raise HTTPException(404, 'Source document not found.')
    return FileResponse(corpus.directory / filename, filename=filename, content_disposition_type='inline')


@router.get("/{standard_id}", response_model=IndianStandard)
def get_standard_detail(standard_id: str):
    std = get_standard_by_id(standard_id)
    if not std:
        raise HTTPException(status_code=404, detail=f"Indian Standard '{standard_id}' not found in knowledge base.")
    return std

@router.get("/{standard_id}/graph", response_model=StandardGraph)
def get_relationship_graph(standard_id: str):
    return get_standard_graph(standard_id)

@router.get("/{standard_id}/versions", response_model=List[VersionItem])
def get_version_timeline(standard_id: str):
    std = get_standard_by_id(standard_id)
    if not std:
        raise HTTPException(status_code=404, detail=f"Indian Standard '{standard_id}' not found.")
    return std.versions
