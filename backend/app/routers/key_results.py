from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..core.supabase_client import supabase
from ..core.auth import get_current_user

router = APIRouter(prefix="/api/key-results", tags=["key-results"])

class KeyResultUpdate(BaseModel):
    current_value: Optional[float] = None
    progress_pct: Optional[float] = None
    note: Optional[str] = None

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
    # We log progress_pct changes, but fall back to current_value if progress_pct is not updated
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
        "note": update_data.note
    }
    supabase.table("progress_logs").insert(log_data).execute()
        
    return updated_kr
