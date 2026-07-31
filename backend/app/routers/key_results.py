from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from ..core.supabase_client import supabase
from ..core.auth import get_current_user

router = APIRouter(prefix="/api/key-results", tags=["key-results"])

class KeyResultUpdate(BaseModel):
    current_value: Optional[float] = None
    progress_pct: Optional[float] = None
    note: Optional[str] = None
    reasoning: Optional[str] = None

class SubtaskCreate(BaseModel):
    title: str

def recalculate_kr_progress(kr_id: str, current_user_id: str, subtask_title: Optional[str] = None, is_complete: Optional[bool] = None):
    # Fetch current progress_pct
    kr_res = supabase.table("key_results").select("progress_pct").eq("id", kr_id).execute()
    prev_pct = 0.0
    if kr_res.data:
        prev_pct = kr_res.data[0].get("progress_pct", 0.0) or 0.0

    # Get all subtasks for this KR
    subtasks = supabase.table("kr_subtasks").select("*").eq("key_result_id", kr_id).execute().data or []
    if not subtasks:
        new_pct = 0.0
    else:
        completed = sum(1 for s in subtasks if s["is_complete"])
        new_pct = round((completed / len(subtasks)) * 100.0, 1)

    # Update key_result progress_pct
    supabase.table("key_results").update({"progress_pct": new_pct}).eq("id", kr_id).execute()

    # Only log if the percentage actually changed AND subtask details are provided
    if subtask_title is not None and is_complete is not None and new_pct != prev_pct:
        status_text = "completed" if is_complete else "reopened"
        log_data = {
            "key_result_id": kr_id,
            "updated_by": current_user_id,
            "previous_value": prev_pct,
            "new_value": new_pct,
            "note": f"{subtask_title} ({status_text})",
            "reasoning": None
        }
        supabase.table("progress_logs").insert(log_data).execute()
    
    return new_pct


@router.patch("/{kr_id}")
async def update_key_result(kr_id: str, update_data: KeyResultUpdate, current_user: dict = Depends(get_current_user)):
    # Get current key result to record previous value
    kr_current = supabase.table("key_results").select("*").eq("id", kr_id).execute()
    if not kr_current.data:
        raise HTTPException(status_code=404, detail="Key result not found")
    old_kr = kr_current.data[0]

    update_dict = {}
    if update_data.current_value is not None:
        update_dict["current_value"] = update_data.current_value
    if update_data.progress_pct is not None:
        update_dict["progress_pct"] = update_data.progress_pct
    
    if not update_dict and update_data.note is None:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Update in DB
    kr_res = supabase.table("key_results").update(update_dict).eq("id", kr_id).execute()
    if not kr_res.data:
        raise HTTPException(status_code=404, detail="Key result not found")
    updated_kr = kr_res.data[0]

    # Insert progress log
    prev_val = old_kr.get("progress_pct") if old_kr.get("progress_pct") is not None else 0
    new_val = update_data.progress_pct if update_data.progress_pct is not None else prev_val

    if update_data.current_value is not None and update_data.progress_pct is None:
        prev_val = old_kr.get("current_value") if old_kr.get("current_value") is not None else 0
        new_val = update_data.current_value

    log_data = {
        "key_result_id": kr_id,
        "updated_by": current_user["id"],
        "previous_value": prev_val,
        "new_value": new_val,
        "note": update_data.note,
        "reasoning": update_data.reasoning
    }
    supabase.table("progress_logs").insert(log_data).execute()
        
    return updated_kr

@router.post("/{kr_id}/subtasks")
async def add_subtask(kr_id: str, data: SubtaskCreate, current_user: dict = Depends(get_current_user)):
    # 1. Fetch key result to verify existence
    kr_res = supabase.table("key_results").select("id").eq("id", kr_id).execute()
    if not kr_res.data:
        raise HTTPException(status_code=404, detail="Key result not found")
    
    # 2. Get next order_index
    subtasks_res = supabase.table("kr_subtasks").select("id").eq("key_result_id", kr_id).execute()
    next_index = len(subtasks_res.data or [])

    # 3. Insert subtask
    subtask_data = {
        "key_result_id": kr_id,
        "title": data.title,
        "is_complete": False,
        "order_index": next_index
    }
    insert_res = supabase.table("kr_subtasks").insert(subtask_data).execute()
    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Failed to create subtask")
    
    # 4. Recalculate progress_pct
    recalculate_kr_progress(kr_id, current_user["id"])

    return insert_res.data[0]

@router.get("/{kr_id}/subtasks")
async def get_kr_subtasks(kr_id: str, current_user: dict = Depends(get_current_user)):
    # 1. Fetch key result to verify existence
    kr_res = supabase.table("key_results").select("id").eq("id", kr_id).execute()
    if not kr_res.data:
        raise HTTPException(status_code=404, detail="Key result not found")
    
    # 2. Fetch and order subtasks
    subtasks_res = supabase.table("kr_subtasks").select("*").eq("key_result_id", kr_id).order("order_index").execute()
    return subtasks_res.data or []
