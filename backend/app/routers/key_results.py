from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..core.supabase_client import supabase
from ..core.auth import get_current_user

router = APIRouter(prefix="/api/key-results", tags=["key-results"])

class KeyResultUpdate(BaseModel):
    current_value: Optional[float] = None
    progress_pct: Optional[float] = None

@router.patch("/{kr_id}")
async def update_key_result(kr_id: str, update_data: KeyResultUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {}
    if update_data.current_value is not None:
        update_dict["current_value"] = update_data.current_value
    if update_data.progress_pct is not None:
        update_dict["progress_pct"] = update_data.progress_pct
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Update in DB
    kr_res = supabase.table("key_results").update(update_dict).eq("id", kr_id).execute()
    
    if not kr_res.data:
        raise HTTPException(status_code=404, detail="Key result not found")
        
    return kr_res.data[0]
