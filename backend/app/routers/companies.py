from fastapi import APIRouter, HTTPException
from ..core.supabase_client import supabase

router = APIRouter(prefix="/api/companies", tags=["companies"])

@router.get("/current")
async def get_current_company():
    # Simply return the first company for demo purposes
    response = supabase.table("companies").select("*").limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="No company found")
    return response.data[0]
