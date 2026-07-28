import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from groq import Groq
from ..core.config import settings
from ..core.supabase_client import supabase

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
3. Each key result must have a specific 'suggested_metric' (e.g. 'Reduce latency to 200ms').
4. 'aligned_pillar' must be EXACTLY ONE of these titles: {pillar_titles}, or 'none' if it doesn't fit any.
5. You MUST return ONLY a raw JSON array of objects. No markdown formatting, no code blocks, no preamble, no explanations.

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

    # 3. Call Groq with retry logic for JSON parsing
    max_retries = 1
    for attempt in range(max_retries + 1):
        try:
            messages = [{"role": "system", "content": system_prompt}]
            if attempt > 0:
                messages.append({"role": "user", "content": "Your previous response was not valid JSON. Please fix it and return ONLY the raw JSON array without markdown formatting."})
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
            
            parsed_json = json.loads(raw_content)
            
            # Validate with Pydantic
            # We parse a raw list into the wrapper object to validate each element
            validated = SuggestionResponse(suggestions=parsed_json)
            return validated.suggestions
            
        except (json.JSONDecodeError, ValueError) as e:
            if attempt == max_retries:
                raise HTTPException(status_code=502, detail="Failed to parse AI response into valid goals after retries.")
            continue
