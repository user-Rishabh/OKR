from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from ..core.config import settings
from ..core.supabase_client import supabase
from ..core.auth import get_current_user

router = APIRouter(prefix="/api/key-results", tags=["key-results"])

groq_client = Groq(api_key=settings.GROQ_API_KEY)

class KeyResultUpdate(BaseModel):
    current_value: Optional[float] = None
    progress_pct: Optional[float] = None
    note: Optional[str] = None
    reasoning: Optional[str] = None

class EstimateProgressRequest(BaseModel):
    update_text: str

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
        "note": update_data.note,
        "reasoning": update_data.reasoning
    }
    supabase.table("progress_logs").insert(log_data).execute()
        
    return updated_kr

@router.post("/{kr_id}/estimate-progress")
async def estimate_key_result_progress(kr_id: str, data: EstimateProgressRequest, current_user: dict = Depends(get_current_user)):
    import traceback
    try:
        # 1. Fetch key result details
        kr_res = supabase.table("key_results").select("*").eq("id", kr_id).execute()
        if not kr_res.data:
            raise HTTPException(status_code=404, detail="Key result not found")
        kr = kr_res.data[0]

        # 2. Fetch last 3 progress logs for context
        logs_res = supabase.table("progress_logs").select("*").eq("key_result_id", kr_id).order("created_at", desc=True).limit(3).execute()
        logs = logs_res.data or []
        
        # Format logs for LLM context
        logs_context = ""
        if logs:
            logs_context = "\nRecent progress updates (from newest to oldest):\n"
            for l in logs:
                note_str = f' - Note: "{l["note"]}"' if l.get("note") else ""
                logs_context += f"- Progress changed to {l['new_value']}%{note_str} on {l['created_at']}\n"

        system_prompt = """You are an expert OKR progress estimator. Your task is to estimate a new progress percentage (0 to 100) for a Key Result based on the user's latest update note and previous history.

Rules:
1. Return your response in JSON format containing:
   - "estimated_progress_pct": a number from 0 to 100 representing the new progress percentage.
   - "reasoning": a single, short sentence explaining why you chose this estimate (e.g., "Refactoring is complete but testing is still pending, representing a modest increase.").
2. Never let the estimated progress decrease compared to the current progress unless the update explicitly mentions a setback or rollback.
3. Be realistic: don't make huge jumps (e.g. from 10% to 90%) unless the update text clearly indicates completion or near-completion.
4. Ensure you only return the raw JSON object. Do not include markdown formatting or code blocks."""

        user_prompt = f"""Key Result: "{kr['kr_text']}"
Current Progress: {kr['progress_pct']}%
Target: {kr.get('target_value')} {kr.get('unit') or ''}

Latest Update Note: "{data.update_text}"
{logs_context}

Estimate the new progress percentage and provide your reasoning."""

        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=250,
        )
        raw_content = completion.choices[0].message.content.strip()
        
        # Clean potential markdown wrapping
        if raw_content.startswith("```json"):
            raw_content = raw_content.replace("```json", "", 1)
        if raw_content.endswith("```"):
            raw_content = raw_content.rsplit("```", 1)[0]
        raw_content = raw_content.strip()
        
        import json
        parsed = json.loads(raw_content)
        
        est_pct = float(parsed["estimated_progress_pct"])
        reasoning = parsed["reasoning"]
        
        est_pct = max(0.0, min(100.0, est_pct))

        return {
            "estimated_progress_pct": round(est_pct, 1),
            "reasoning": reasoning
        }
    except Exception as e:
        print("CRITICAL ESTIMATE ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error in estimation: {str(e)}")

