import json
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from groq import Groq
from ..core.config import settings
from ..core.supabase_client import supabase
from ..core.auth import get_current_user

class KeyResultCreate(BaseModel):
    kr_text: str
    target_value: Optional[float] = None
    unit: Optional[str] = None
    suggested_metric_text: Optional[str] = None

class GoalCreate(BaseModel):
    user_id: str
    cycle: str
    objective_text: str
    pillar_id: Optional[str] = None
    key_results: List[KeyResultCreate]
    ai_generated: bool = False

router = APIRouter(prefix="/api/goals", tags=["goals"])

# Initialize Groq client
groq_client = Groq(api_key=settings.GROQ_API_KEY)

class SuggestionRequest(BaseModel):
    job_title: str
    department: str
    focus_area: str
    company_id: str

class KeyResultSuggestion(BaseModel):
    text: str
    suggested_metric: str

class GoalSuggestion(BaseModel):
    objective: str
    key_results: List[KeyResultSuggestion] = Field(..., min_length=2, max_length=4)
    aligned_pillar: str

class SuggestionResponse(BaseModel):
    suggestions: List[GoalSuggestion]

@router.post("", response_model=dict)
async def create_goal(goal_data: GoalCreate, current_user: dict = Depends(get_current_user)):
    if goal_data.user_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create goals for this user")
    goal_insert_data = {
        "user_id": goal_data.user_id,
        "cycle": goal_data.cycle,
        "objective_text": goal_data.objective_text,
        "pillar_id": goal_data.pillar_id,
        "status": "active",
        "ai_generated": goal_data.ai_generated
    }
    goal_res = supabase.table("goals").insert(goal_insert_data).execute()
    if not goal_res.data:
        raise HTTPException(status_code=500, detail="Failed to create goal")
    created_goal = goal_res.data[0]
    
    kr_insert_data = []
    for kr in goal_data.key_results:
        kr_insert_data.append({
            "goal_id": created_goal["id"],
            "kr_text": kr.kr_text,
            "target_value": kr.target_value,
            "unit": kr.unit,
            "current_value": 0,
            "progress_pct": 0
        })
        
    if kr_insert_data:
        kr_res = supabase.table("key_results").insert(kr_insert_data).execute()
        created_goal["key_results"] = kr_res.data
    else:
        created_goal["key_results"] = []
        
    return created_goal

@router.get("")
async def get_goals(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view goals for this user")
    goals_res = supabase.table("goals").select("*, key_results(*)").eq("user_id", user_id).order("created_at", desc=True).execute()
    return goals_res.data

@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    # Simple check for demo purposes
    if current_user["role"] == "employee":
        # Check if they own the goal
        goal_res = supabase.table("goals").select("user_id").eq("id", goal_id).execute()
        if not goal_res.data or goal_res.data[0]["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
    res = supabase.table("goals").delete().eq("id", goal_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None

@router.get("/team")
async def get_team_goals(team_id: str, current_user: dict = Depends(get_current_user)):
    requester_role = current_user.get("role")
    requester_id = current_user.get("id")

    if requester_role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access restricted — this page is only available to managers and admins")
    
    # Check if the team exists and if the requester is the manager (defense in depth)
    team_res = supabase.table("teams").select("*").eq("id", team_id).execute()
    if not team_res.data:
        raise HTTPException(status_code=404, detail="Team not found")
        
    team = team_res.data[0]
    # Optionally, restrict if they are a manager but not THIS team's manager, though for demo admin/manager is enough
    if requester_role == "manager" and team.get("manager_id") != requester_id:
        raise HTTPException(status_code=403, detail="You are not the manager of this team")

    # Fetch users in the team
    users_res = supabase.table("users").select("id").eq("team_id", team_id).execute()
    user_ids = [u["id"] for u in users_res.data]
    
    if not user_ids:
        return []
        
    # Fetch goals for those users
    goals_res = supabase.table("goals").select("*, key_results(*)").in_("user_id", user_ids).order("created_at", desc=True).execute()
    return goals_res.data

@router.post("/suggest", response_model=List[GoalSuggestion])
async def suggest_goals(request: SuggestionRequest):
    # TODO: Add rate limiting here (e.g. max 5 requests per minute per user)
    
    # 1. Fetch company pillars for context
    pillars_response = supabase.table("strategic_pillars").select("title, description").eq("company_id", request.company_id).execute()
    pillars = pillars_response.data
    
    pillar_titles = [p["title"] for p in pillars]
    pillar_context = "\n".join([f"- {p['title']}: {p['description']}" for p in pillars]) if pillars else "No specific strategic pillars defined."
    
    # 2. Prepare prompt
    system_prompt = f"""You are an OKR-writing expert. Your task is to generate 3 to 5 SMART goals (Objectives and Key Results) for a user based on their input.
    
User Profile:
- Job Title: {request.job_title}
- Department: {request.department}
- Focus Area: {request.focus_area}

Company Strategic Pillars:
{pillar_context}

Rules:
1. Each objective must follow SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound).
2. Each objective must have 2 to 4 key results.
3. Each key result must have a specific 'suggested_metric' that INCLUDES A CONCRETE QUANTIFIABLE TARGET (a percentage, number, time duration, or count). Vague phrases without numbers will be rejected.
4. 'aligned_pillar' must be EXACTLY ONE of these titles: {pillar_titles}, or 'none' if it doesn't fit any.
5. You MUST return ONLY a raw JSON array of objects. No markdown formatting, no code blocks, no preamble, no explanations.

Examples of GOOD suggested_metric values:
- "Reduce average query latency from 450ms to under 150ms"
- "Increase automated test coverage to 85%"
- "Ship 3 new features by end of Q3"

Examples of BAD suggested_metric values (missing numbers):
- "Optimize database queries to reduce latency"
- "Improve performance"
- "Launch new features"

Expected JSON schema:
[
  {{
    "objective": "...",
    "key_results": [
      {{"text": "...", "suggested_metric": "..."}}
    ],
    "aligned_pillar": "..."
  }}
]"""

    # 3. Call Groq with retry logic for JSON parsing and metrics validation
    max_retries = 2
    last_error_message = "Your previous response was not valid JSON. Please fix it and return ONLY the raw JSON array without markdown formatting."
    
    for attempt in range(max_retries + 1):
        try:
            messages = [{"role": "system", "content": system_prompt}]
            if attempt > 0:
                messages.append({"role": "user", "content": f"Your previous response failed validation: {last_error_message}. Please fix it and ensure you return ONLY the raw JSON array."})
            else:
                messages.append({"role": "user", "content": "Generate the OKRs based on the provided profile and focus area."})
                
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            
            raw_content = completion.choices[0].message.content.strip()
            
            # Clean up potential markdown formatting if the model still returns it
            if raw_content.startswith("```json"):
                raw_content = raw_content.replace("```json", "", 1)
            if raw_content.endswith("```"):
                raw_content = raw_content.rsplit("```", 1)[0]
                
            raw_content = raw_content.strip()
            
            try:
                parsed_json = json.loads(raw_content)
            except json.JSONDecodeError as je:
                last_error_message = "Invalid JSON format. Do not use markdown blocks."
                raise ValueError(last_error_message)
            
            # Custom validation: ensure every suggested_metric has a numeric value
            for goal in parsed_json:
                for kr in goal.get("key_results", []):
                    metric = kr.get("suggested_metric", "")
                    if not re.search(r'\d', metric):
                        last_error_message = f"The suggested_metric '{metric}' is missing a numeric value. It MUST contain a concrete number."
                        raise ValueError(last_error_message)
            
            # Validate with Pydantic
            # We parse a raw list into the wrapper object to validate each element
            validated = SuggestionResponse(suggestions=parsed_json)
            return validated.suggestions
            
        except ValueError as e:
            if attempt == max_retries:
                raise HTTPException(status_code=502, detail=f"Failed to generate valid goals after retries. Last error: {str(e)}")
            continue
