from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..core.supabase_client import supabase
from ..core.auth import get_current_user
from .key_results import recalculate_kr_progress

router = APIRouter(prefix="/api/subtasks", tags=["subtasks"])

class SubtaskUpdate(BaseModel):
    is_complete: bool

@router.patch("/{subtask_id}")
async def update_subtask(subtask_id: str, data: SubtaskUpdate, current_user: dict = Depends(get_current_user)):
    # 1. Fetch subtask
    subtask_res = supabase.table("kr_subtasks").select("*").eq("id", subtask_id).execute()
    if not subtask_res.data:
        raise HTTPException(status_code=404, detail="Subtask not found")
    subtask = subtask_res.data[0]
    kr_id = subtask["key_result_id"]

    # 2. Update subtask
    completed_at = datetime.utcnow().isoformat() if data.is_complete else None
    update_data = {
        "is_complete": data.is_complete,
        "completed_at": completed_at
    }
    update_res = supabase.table("kr_subtasks").update(update_data).eq("id", subtask_id).execute()
    if not update_res.data:
        raise HTTPException(status_code=500, detail="Failed to update subtask")
    
    # 3. Recalculate parent progress_pct and log to progress_logs
    recalculate_kr_progress(kr_id, current_user["id"], subtask["title"], data.is_complete)

    return update_res.data[0]

@router.delete("/{subtask_id}", status_code=204)
async def delete_subtask(subtask_id: str, current_user: dict = Depends(get_current_user)):
    # 1. Fetch subtask
    subtask_res = supabase.table("kr_subtasks").select("*").eq("id", subtask_id).execute()
    if not subtask_res.data:
        raise HTTPException(status_code=404, detail="Subtask not found")
    subtask = subtask_res.data[0]
    kr_id = subtask["key_result_id"]

    # 2. Delete subtask
    delete_res = supabase.table("kr_subtasks").delete().eq("id", subtask_id).execute()
    if not delete_res.data:
        raise HTTPException(status_code=500, detail="Failed to delete subtask")

    # 3. Recalculate parent progress_pct
    recalculate_kr_progress(kr_id, current_user["id"])

    return None
