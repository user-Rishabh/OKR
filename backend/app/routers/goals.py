import json
import re
from datetime import datetime, date
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
    subtasks: Optional[List[str]] = Field(default_factory=list)

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
    suggested_subtasks: List[str] = Field(default_factory=list)

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
        
        # Save suggested subtasks into kr_subtasks
        subtasks_to_insert = []
        for i, kr in enumerate(goal_data.key_results):
            if kr.subtasks:
                db_kr = kr_res.data[i]
                for idx, st_title in enumerate(kr.subtasks):
                    subtasks_to_insert.append({
                        "key_result_id": db_kr["id"],
                        "title": st_title,
                        "is_complete": False,
                        "order_index": idx
                    })
        if subtasks_to_insert:
            supabase.table("kr_subtasks").insert(subtasks_to_insert).execute()
    else:
        created_goal["key_results"] = []
        
    return created_goal

@router.get("")
async def get_goals(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view goals for this user")
    goals_res = supabase.table("goals").select("*, key_results(*, kr_subtasks(*), progress_logs(*, users(full_name)))").eq("user_id", user_id).order("created_at", desc=True).execute()
    goals_data = goals_res.data
    for goal in goals_data:
        for kr in goal.get("key_results", []):
            # Sort progress logs
            if "progress_logs" in kr and kr["progress_logs"]:
                kr["progress_logs"] = sorted(
                    kr["progress_logs"],
                    key=lambda x: x.get("created_at", ""),
                    reverse=True
                )
            else:
                kr["progress_logs"] = []
            
            # Sort subtasks
            if "kr_subtasks" in kr and kr["kr_subtasks"]:
                kr["kr_subtasks"] = sorted(
                    kr["kr_subtasks"],
                    key=lambda x: x.get("order_index", 0)
                )
            else:
                kr["kr_subtasks"] = []
    return goals_data


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
    if requester_role == "manager" and team.get("manager_id") != requester_id:
        raise HTTPException(status_code=403, detail="You are not the manager of this team")

    # Fetch users in the team with their goals, key results, and nested subtasks
    res = supabase.table("users").select("*, goals(*, key_results(*, kr_subtasks(*)))").eq("team_id", team_id).execute()
    users_data = res.data
    for u in users_data:
        for g in u.get("goals", []):
            for kr in g.get("key_results", []):
                if "kr_subtasks" in kr and kr["kr_subtasks"]:
                    kr["kr_subtasks"] = sorted(
                        kr["kr_subtasks"],
                        key=lambda x: x.get("order_index", 0)
                    )
                else:
                    kr["kr_subtasks"] = []
    return users_data

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
4. Each key result must have a 'suggested_subtasks' list containing 2 to 4 relevant, actionable subtasks/milestones (as strings) to complete that key result.
5. 'aligned_pillar' must be EXACTLY ONE of these titles: {pillar_titles}, or 'none' if it doesn't fit any.
6. You MUST return ONLY a raw JSON array of objects. No markdown formatting, no code blocks, no preamble, no explanations.

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
      {{
        "text": "...",
        "suggested_metric": "...",
        "suggested_subtasks": ["subtask 1", "subtask 2"]
      }}
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
                max_tokens=2048,
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

class AlignmentCheckRequest(BaseModel):
    team_id: str

class AlignmentFlagResponse(BaseModel):
    id: str
    goal_id_a: str
    goal_id_b: str
    reason: str
    created_at: str
    employee_name_a: str
    employee_name_b: str
    objective_text_a: str
    objective_text_b: str

class AIAlignmentFlag(BaseModel):
    goal_id_a: str
    goal_id_b: str
    reason: str

@router.post("/check-alignment", response_model=List[AlignmentFlagResponse])
async def check_goals_alignment(payload: AlignmentCheckRequest, current_user: dict = Depends(get_current_user)):
    team_id = payload.team_id
    requester_role = current_user.get("role")
    requester_id = current_user.get("id")

    if requester_role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access restricted — this endpoint is only available to managers and admins")
        
    # Check if the team exists
    team_res = supabase.table("teams").select("*").eq("id", team_id).execute()
    if not team_res.data:
        raise HTTPException(status_code=404, detail="Team not found")
        
    team = team_res.data[0]
    if requester_role == "manager" and team.get("manager_id") != requester_id:
        raise HTTPException(status_code=403, detail="You are not the manager of this team")

    # Fetch team members
    users_res = supabase.table("users").select("id, full_name").eq("team_id", team_id).execute()
    if not users_res.data:
        return []
        
    user_ids = [u["id"] for u in users_res.data]
    users_map = {u["id"]: u["full_name"] for u in users_res.data}
    
    # Fetch all goals for users in the team (needed for resolving flags)
    all_goals_res = supabase.table("goals").select("id, user_id, objective_text, status").in_("user_id", user_ids).execute()
    goals_map = {g["id"]: g for g in all_goals_res.data}
    
    # Identify active goals to run check on
    active_goals = [g for g in all_goals_res.data if g["status"] == "active"]
    
    # Fetch all existing flags to clean up database duplicates (self-healing)
    flags_res = supabase.table("alignment_flags").select("*").execute()
    
    # Identify duplicates database-wide
    seen_global = set()
    duplicates_to_delete = []
    for f in flags_res.data:
        g_a = f["goal_id_a"]
        g_b = f["goal_id_b"]
        pair = (g_a, g_b) if g_a < g_b else (g_b, g_a)
        if pair in seen_global:
            duplicates_to_delete.append(f["id"])
        else:
            seen_global.add(pair)
            
    # Delete duplicates from database
    for flag_id in duplicates_to_delete:
        try:
            supabase.table("alignment_flags").delete().eq("id", flag_id).execute()
        except Exception as delete_err:
            print(f"Failed to delete duplicate flag {flag_id}: {delete_err}")
            
    # Filter to get team-specific, clean existing flags
    clean_flags = [f for f in flags_res.data if f["id"] not in duplicates_to_delete]
    existing_flags = [
        f for f in clean_flags
        if f["goal_id_a"] in goals_map and f["goal_id_b"] in goals_map
    ]
        
    existing_pairs = set()
    for f in existing_flags:
        g_a = f["goal_id_a"]
        g_b = f["goal_id_b"]
        pair = (g_a, g_b) if g_a < g_b else (g_b, g_a)
        existing_pairs.add(pair)
        
    if len(active_goals) >= 2:
        # Prepare goals list for prompt
        goals_payload = []
        for g in active_goals:
            goals_payload.append({
                "id": g["id"],
                "user_name": users_map.get(g["user_id"], "Unknown"),
                "objective_text": g["objective_text"]
            })
            
        # Construct prompt
        system_prompt = (
            "You are an expert OKR coach and database analyst. Your task is to analyze a list of active goals (Objectives) for a team and identify pairs of goals that have genuine semantic overlaps or are duplicates.\n\n"
            "Definition of Overlap/Duplicate:\n"
            "- The two goals are substantively working on the same thing or have significant redundancy.\n"
            "- Example of OVERLAP: \"Improve API response time\" and \"Reduce backend latency\" (both target backend performance/speed).\n"
            "- Example of NOT AN OVERLAP: \"Improve API response time\" and \"Improve frontend load time\" (one is backend API, the other is frontend UI performance; different scopes and implementation teams).\n"
            "- Example of NOT AN OVERLAP: \"Increase sales by 10%\" and \"Hire 2 new sales reps\" (one is an outcome goal, the other is a hiring target; they are related but not duplicates).\n\n"
            "Input Format:\n"
            "A JSON list of goals, where each goal has:\n"
            "- id: The unique identifier of the goal (UUID).\n"
            "- user_name: The name of the employee who owns the goal.\n"
            "- objective_text: The statement of the objective.\n\n"
            "Output Format:\n"
            "You must identify and return any overlapping/duplicate goal pairs.\n"
            "To ensure consistency, always order the pair so that goal_id_a comes lexicographically before goal_id_b.\n"
            "Return a JSON object containing a list of overlapping pairs under the key \"overlaps\".\n"
            "Expected JSON schema:\n"
            "{\n"
            "  \"overlaps\": [\n"
            "    {\n"
            "      \"goal_id_a\": \"<UUID of goal A>\",\n"
            "      \"goal_id_b\": \"<UUID of goal B>\",\n"
            "      \"reason\": \"<A clear explanation of why these goals overlap and what can be done to align or consolidate them>\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "If no overlapping pairs are found, return:\n"
            "{\n"
            "  \"overlaps\": []\n"
            "}\n\n"
            "Rules:\n"
            "1. Do not flag goals that just share common terms (like \"improve\", \"increase\", etc.) but address entirely different areas.\n"
            "2. Only flag goals that are substantively redundant or overlapping.\n"
            "3. You MUST return ONLY valid JSON. No markdown code blocks, no preamble, no explanations."
        )
        
        user_prompt = f"Here is the list of active team goals to analyze:\n{json.dumps(goals_payload, indent=2)}"
        
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=1024,
            )
            raw_content = completion.choices[0].message.content.strip()
            
            # Clean JSON formatting
            if raw_content.startswith("```json"):
                raw_content = raw_content.replace("```json", "", 1)
            if raw_content.endswith("```"):
                raw_content = raw_content.rsplit("```", 1)[0]
            raw_content = raw_content.strip()
            
            ai_data = json.loads(raw_content)
            overlaps = ai_data.get("overlaps", [])
            
            # Validate with Pydantic
            validated_overlaps = []
            for item in overlaps:
                try:
                    flag = AIAlignmentFlag(
                        goal_id_a=item["goal_id_a"],
                        goal_id_b=item["goal_id_b"],
                        reason=item["reason"]
                    )
                    validated_overlaps.append(flag)
                except Exception as ve:
                    print(f"Skipping invalid AI overlap item: {item}. Error: {ve}")
                    
            # Insert new flags
            new_inserted_flags = []
            for flag in validated_overlaps:
                g_a = flag.goal_id_a
                g_b = flag.goal_id_b
                reason = flag.reason
                
                # Check if these goals exist in the team goals to avoid hallucinations
                if g_a not in goals_map or g_b not in goals_map:
                    continue
                    
                # Normalize order
                normalized_pair = (g_a, g_b) if g_a < g_b else (g_b, g_a)
                
                if normalized_pair not in existing_pairs:
                    # Insert into DB
                    insert_payload = {
                        "goal_id_a": normalized_pair[0],
                        "goal_id_b": normalized_pair[1],
                        "reason": reason
                    }
                    insert_res = supabase.table("alignment_flags").insert(insert_payload).execute()
                    if insert_res.data:
                        new_flag = insert_res.data[0]
                        new_inserted_flags.append(new_flag)
                        existing_pairs.add(normalized_pair)
                        
            # Add newly inserted flags to our existing_flags list
            existing_flags.extend(new_inserted_flags)
            
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI alignment check failed: {str(e)}")
            
    # Resolve details for existing_flags
    resolved = []
    for f in existing_flags:
        g_a = goals_map.get(f["goal_id_a"])
        g_b = goals_map.get(f["goal_id_b"])
        if not g_a or not g_b:
            continue
        resolved.append({
            "id": f["id"],
            "goal_id_a": f["goal_id_a"],
            "goal_id_b": f["goal_id_b"],
            "reason": f["reason"],
            "created_at": f["created_at"],
            "employee_name_a": users_map.get(g_a["user_id"], "Unknown"),
            "employee_name_b": users_map.get(g_b["user_id"], "Unknown"),
            "objective_text_a": g_a["objective_text"],
            "objective_text_b": g_b["objective_text"]
        })
        
    return resolved

@router.get("/alignment-flags", response_model=List[AlignmentFlagResponse])
async def get_team_alignment_flags(team_id: str, current_user: dict = Depends(get_current_user)):
    requester_role = current_user.get("role")
    requester_id = current_user.get("id")

    if requester_role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access restricted — this endpoint is only available to managers and admins")
        
    # Check if the team exists
    team_res = supabase.table("teams").select("*").eq("id", team_id).execute()
    if not team_res.data:
        raise HTTPException(status_code=404, detail="Team not found")
        
    team = team_res.data[0]
    if requester_role == "manager" and team.get("manager_id") != requester_id:
        raise HTTPException(status_code=403, detail="You are not the manager of this team")

    # Fetch team members
    users_res = supabase.table("users").select("id, full_name").eq("team_id", team_id).execute()
    if not users_res.data:
        return []
        
    user_ids = [u["id"] for u in users_res.data]
    users_map = {u["id"]: u["full_name"] for u in users_res.data}
    
    # Fetch all goals for users in the team
    all_goals_res = supabase.table("goals").select("id, user_id, objective_text, status").in_("user_id", user_ids).execute()
    goals_map = {g["id"]: g for g in all_goals_res.data}
    
    # Fetch all existing flags to clean up database duplicates (self-healing)
    flags_res = supabase.table("alignment_flags").select("*").execute()
    
    # Identify duplicates database-wide
    seen_global = set()
    duplicates_to_delete = []
    for f in flags_res.data:
        g_a = f["goal_id_a"]
        g_b = f["goal_id_b"]
        pair = (g_a, g_b) if g_a < g_b else (g_b, g_a)
        if pair in seen_global:
            duplicates_to_delete.append(f["id"])
        else:
            seen_global.add(pair)
            
    # Delete duplicates from database
    for flag_id in duplicates_to_delete:
        try:
            supabase.table("alignment_flags").delete().eq("id", flag_id).execute()
        except Exception as delete_err:
            print(f"Failed to delete duplicate flag {flag_id}: {delete_err}")
            
    # Filter to get team-specific, clean existing flags
    clean_flags = [f for f in flags_res.data if f["id"] not in duplicates_to_delete]
    existing_flags = [
        f for f in clean_flags
        if f["goal_id_a"] in goals_map and f["goal_id_b"] in goals_map
    ]
        
    # Resolve details
    resolved = []
    for f in existing_flags:
        g_a = goals_map.get(f["goal_id_a"])
        g_b = goals_map.get(f["goal_id_b"])
        if not g_a or not g_b:
            continue
        resolved.append({
            "id": f["id"],
            "goal_id_a": f["goal_id_a"],
            "goal_id_b": f["goal_id_b"],
            "reason": f["reason"],
            "created_at": f["created_at"],
            "employee_name_a": users_map.get(g_a["user_id"], "Unknown"),
            "employee_name_b": users_map.get(g_b["user_id"], "Unknown"),
            "objective_text_a": g_a["objective_text"],
            "objective_text_b": g_b["objective_text"]
        })
        
    return resolved
