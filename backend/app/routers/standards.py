from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Body
from app.routers.auth import require_session, normalize_role
from app.schemas.standards import IndianStandard, StandardGraph, VersionItem
from app.services.standards_db import (
    STANDARDS_KNOWLEDGE_BASE, get_standard_by_id, get_standard_graph
)

router = APIRouter(prefix="/standards", tags=["Indian Standards Knowledge Base"])

def require_admin(user=Depends(require_session)):
    if normalize_role(user.get("role")) != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    return user

@router.get("", response_model=List[IndianStandard])
def search_standards(
    q: Optional[str] = Query(None, description="Search term (IS number, product, or keyword)"),
    category: Optional[str] = Query(None, description="Category filter"),
    status: Optional[str] = Query(None, description="Status filter")
):
    results = STANDARDS_KNOWLEDGE_BASE
    
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

@router.get("/{standard_id}", response_model=IndianStandard)
def get_standard_detail(standard_id: str):
    std = get_standard_by_id(standard_id)
    if not std:
        raise HTTPException(status_code=404, detail=f"Indian Standard '{standard_id}' not found in knowledge base.")
    return std

@router.get("/{standard_id}/graph", response_model=StandardGraph)
def get_relationship_graph(standard_id: str):
    return get_standard_graph(standard_id)

@router.post("", response_model=IndianStandard, status_code=201)
def create_standard(payload: dict = Body(...), _admin=Depends(require_admin)):
    """Create a catalogue record. Admin writes are validated by the same schema used for reads."""
    try:
        standard = IndianStandard.model_validate(payload)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid standard payload: {exc}")
    if any(item.id == standard.id for item in STANDARDS_KNOWLEDGE_BASE):
        raise HTTPException(status_code=409, detail="A standard with this id already exists.")
    STANDARDS_KNOWLEDGE_BASE.insert(0, standard)
    return standard

@router.patch("/{standard_id}", response_model=IndianStandard)
def update_standard(standard_id: str, payload: dict = Body(...), _admin=Depends(require_admin)):
    index = next((i for i, item in enumerate(STANDARDS_KNOWLEDGE_BASE) if item.id == standard_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Standard not found.")
    merged = STANDARDS_KNOWLEDGE_BASE[index].model_dump()
    merged.update(payload)
    merged["id"] = standard_id
    try:
        standard = IndianStandard.model_validate(merged)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid standard payload: {exc}")
    STANDARDS_KNOWLEDGE_BASE[index] = standard
    return standard

@router.delete("/{standard_id}")
def delete_standard(standard_id: str, _admin=Depends(require_admin)):
    index = next((i for i, item in enumerate(STANDARDS_KNOWLEDGE_BASE) if item.id == standard_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Standard not found.")
    STANDARDS_KNOWLEDGE_BASE.pop(index)
    return {"success": True, "id": standard_id}

@router.get("/{standard_id}/versions", response_model=List[VersionItem])
def get_version_timeline(standard_id: str):
    std = get_standard_by_id(standard_id)
    if not std:
        raise HTTPException(status_code=404, detail=f"Indian Standard '{standard_id}' not found.")
    return std.versions
