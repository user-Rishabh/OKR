from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from ..core.supabase_client import supabase
from ..core.auth import get_current_user

router = APIRouter(prefix="/api/pillars", tags=["pillars"])

class PillarCreate(BaseModel):
    company_id: str
    title: str
    description: Optional[str] = None

class PillarUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class PillarResponse(BaseModel):
    id: str
    company_id: str
    title: str
    description: Optional[str] = None
    active_goals_count: int
    total_goals_count: int

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access restricted — admin role required")
    return current_user

@router.get("", response_model=List[PillarResponse])
async def get_pillars(company_id: str, current_user: dict = Depends(require_admin)):
    pillars_res = supabase.table("strategic_pillars").select("*").eq("company_id", company_id).execute()
    if not pillars_res.data:
        return []
        
    # Get all goals referencing any pillar to compute counts
    goals_res = supabase.table("goals").select("id, pillar_id, status").execute()
    
    active_counts = {}
    total_counts = {}
    for g in goals_res.data:
        p_id = g.get("pillar_id")
        if p_id:
            total_counts[p_id] = total_counts.get(p_id, 0) + 1
            if g.get("status") == "active":
                active_counts[p_id] = active_counts.get(p_id, 0) + 1
                
    result = []
    for p in pillars_res.data:
        p_id = p["id"]
        result.append({
            "id": p_id,
            "company_id": p["company_id"],
            "title": p["title"],
            "description": p.get("description"),
            "active_goals_count": active_counts.get(p_id, 0),
            "total_goals_count": total_counts.get(p_id, 0)
        })
        
    return result

@router.post("", response_model=dict)
async def create_pillar(pillar_data: PillarCreate, current_user: dict = Depends(require_admin)):
    insert_data = {
        "company_id": pillar_data.company_id,
        "title": pillar_data.title,
        "description": pillar_data.description
    }
    res = supabase.table("strategic_pillars").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create strategic pillar")
        
    created = res.data[0]
    created["active_goals_count"] = 0
    created["total_goals_count"] = 0
    return created

@router.patch("/{pillar_id}", response_model=dict)
async def update_pillar(pillar_id: str, pillar_data: PillarUpdate, current_user: dict = Depends(require_admin)):
    # Check if exists
    existing = supabase.table("strategic_pillars").select("*").eq("id", pillar_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Strategic pillar not found")
        
    update_data = {}
    if pillar_data.title is not None:
        update_data["title"] = pillar_data.title
    if pillar_data.description is not None:
        update_data["description"] = pillar_data.description
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No update fields provided")
        
    res = supabase.table("strategic_pillars").update(update_data).eq("id", pillar_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update strategic pillar")
        
    # Get counts for the response
    goals_res = supabase.table("goals").select("id, status").eq("pillar_id", pillar_id).execute()
    total_count = len(goals_res.data)
    active_count = sum(1 for g in goals_res.data if g.get("status") == "active")
    
    updated = res.data[0]
    updated["active_goals_count"] = active_count
    updated["total_goals_count"] = total_count
    return updated

@router.delete("/{pillar_id}", status_code=204)
async def delete_pillar(pillar_id: str, current_user: dict = Depends(require_admin)):
    # Check if exists
    existing = supabase.table("strategic_pillars").select("*").eq("id", pillar_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Strategic pillar not found")
        
    # Unassign all goals referencing this pillar
    try:
        goals_res = supabase.table("goals").select("id").eq("pillar_id", pillar_id).execute()
        if len(goals_res.data) > 0:
            supabase.table("goals").update({"pillar_id": None}).eq("pillar_id", pillar_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unassign goals: {str(e)}")
        
    # Delete the pillar
    res = supabase.table("strategic_pillars").delete().eq("id", pillar_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to delete strategic pillar")
        
    return None
