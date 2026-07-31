import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from groq import Groq
from ..core.supabase_client import supabase
from ..core.auth import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

# Initialize Groq client
groq_client = Groq(api_key=settings.GROQ_API_KEY)

class FeedbackCreate(BaseModel):
    subject_user_id: str
    feedback_type: str  # 'self', 'peer', 'manager'
    cycle: str
    content_text: str

class FeedbackSummaryRequest(BaseModel):
    subject_user_id: str
    cycle: str

class FeedbackSummaryAIResponse(BaseModel):
    strengths: str
    improvement_areas: str
    recurring_themes: str
    overall_tone: str

async def check_is_manager(manager_id: str, subject_user_id: str) -> bool:
    """Helper to check if manager_id is the manager of subject_user_id"""
    try:
        subject_res = supabase.table("users").select("team_id").eq("id", subject_user_id).execute()
        if not subject_res.data:
            return False
        team_id = subject_res.data[0].get("team_id")
        if not team_id:
            return False
        
        team_res = supabase.table("teams").select("manager_id").eq("id", team_id).execute()
        if not team_res.data:
            return False
        
        return team_res.data[0].get("manager_id") == manager_id
    except Exception:
        return False

@router.post("")
async def create_feedback(data: FeedbackCreate, current_user: dict = Depends(get_current_user)):
    # 1. Validation based on feedback_type
    f_type = data.feedback_type.lower()
    if f_type not in ["self", "peer", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid feedback_type. Must be 'self', 'peer', or 'manager'."
        )

    author_id = current_user["id"]
    subject_id = data.subject_user_id

    if f_type == "self":
        if subject_id != author_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="For self-feedback, the subject_user_id must match the authenticated user."
            )
    elif f_type == "manager":
        is_mgr = await check_is_manager(author_id, subject_id)
        if not is_mgr and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be the manager of the subject to submit manager feedback."
            )
    elif f_type == "peer":
        if subject_id == author_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot submit peer feedback for yourself. Use self-feedback instead."
            )

    # 2. Insert feedback entry
    insert_data = {
        "subject_user_id": subject_id,
        "author_user_id": author_id,
        "feedback_type": f_type,
        "cycle": data.cycle,
        "content_text": data.content_text
    }

    try:
        res = supabase.table("feedback_entries").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to insert feedback entry."
            )
        return res.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("")
async def list_feedback(subject_user_id: str, cycle: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user["id"]
    caller_role = current_user["role"]

    # 1. Authorize access
    # Only visible to subject themselves, their manager, or admin
    is_subject = (caller_id == subject_user_id)
    is_mgr = await check_is_manager(caller_id, subject_user_id)
    is_admin = (caller_role == "admin")

    if not (is_subject or is_mgr or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view feedback entries for this user."
        )

    # 2. Fetch feedback entries
    try:
        res = supabase.table("feedback_entries")\
            .select("*")\
            .eq("subject_user_id", subject_user_id)\
            .eq("cycle", cycle)\
            .execute()
        entries = res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    # 3. Retrieve and join author names
    # We collect all author IDs
    author_ids = list(set([entry["author_user_id"] for entry in entries]))
    authors_map = {}
    if author_ids:
        try:
            authors_res = supabase.table("users").select("id, full_name").in_("id", author_ids).execute()
            authors_map = {u["id"]: u["full_name"] for u in authors_res.data}
        except Exception as e:
            # Fallback if users lookup fails
            authors_map = {}

    # 4. Map names and apply anonymity
    processed_entries = []
    for entry in entries:
        author_id = entry["author_user_id"]
        f_type = entry["feedback_type"]

        # Anonymize peer feedback if requested by the subject themselves
        if is_subject and f_type == "peer":
            entry["author_user_id"] = None
            entry["author_name"] = "Anonymous Peer"
        else:
            entry["author_name"] = authors_map.get(author_id, "Unknown User")

        processed_entries.append(entry)

    return processed_entries

@router.post("/summarize")
async def generate_summary(data: FeedbackSummaryRequest, current_user: dict = Depends(get_current_user)):
    caller_id = current_user["id"]
    caller_role = current_user["role"]
    subject_id = data.subject_user_id
    cycle = data.cycle

    # 1. Authorize: Only manager of subject or admin
    is_mgr = await check_is_manager(caller_id, subject_id)
    is_admin = (caller_role == "admin")

    if not (is_mgr or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can generate performance feedback summaries."
        )

    # 2. Fetch feedback entries
    try:
        entries_res = supabase.table("feedback_entries")\
            .select("*")\
            .eq("subject_user_id", subject_id)\
            .eq("cycle", cycle)\
            .execute()
        entries = entries_res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    if len(entries) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough feedback collected yet to generate a summary"
        )

    # 3. Formulate text for Groq synthesis
    feedback_corpus = []
    for idx, entry in enumerate(entries, 1):
        feedback_corpus.append(
            f"--- Feedback Entry #{idx} ---\n"
            f"Type: {entry['feedback_type'].capitalize()}\n"
            f"Feedback Content:\n{entry['content_text']}\n"
        )
    
    combined_feedback = "\n".join(feedback_corpus)

    system_prompt = (
        "You are an expert performance coach and HR summary assistant. Your task is to analyze multiple performance feedback entries for an employee and synthesize them into a coherent, professional performance feedback summary.\n\n"
        "You must output a raw JSON object with the following fields:\n"
        "- strengths: A markdown-formatted bulleted list summarizing the key strengths highlighted in the feedback.\n"
        "- improvement_areas: A markdown-formatted bulleted list summarizing areas of growth, improvements, or recommendations.\n"
        "- recurring_themes: A markdown-formatted bulleted list highlighting common themes, behaviors, or patterns noticed across multiple feedback entries.\n"
        "- overall_tone: A professional, supportive, and objective 1-2 sentence summary of the overall tone and status of the feedback.\n\n"
        "Ensure all output values are professionally written, constructive, and use proper markdown formatting (e.g. asterisks for bullets).\n"
        "You MUST return ONLY valid JSON. No markdown code blocks, no preamble, no explanations."
    )

    user_prompt = (
        f"Here are the feedback entries to analyze for the cycle '{cycle}':\n\n"
        f"{combined_feedback}\n\n"
        f"Please generate the performance summary JSON now."
    )

    # 4. Call Groq API
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=2048
        )
        raw_content = completion.choices[0].message.content.strip()

        # Clean JSON formatting
        if raw_content.startswith("```json"):
            raw_content = raw_content.replace("```json", "", 1)
        if raw_content.endswith("```"):
            raw_content = raw_content.rsplit("```", 1)[0]
        raw_content = raw_content.strip()

        ai_data = json.loads(raw_content)

        # Validate with Pydantic
        summary_response = FeedbackSummaryAIResponse(
            strengths=ai_data.get("strengths", ""),
            improvement_areas=ai_data.get("improvement_areas", ""),
            recurring_themes=ai_data.get("recurring_themes", ""),
            overall_tone=ai_data.get("overall_tone", "")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI summarization failed to produce valid content: {str(e)}"
        )

    # 5. Upsert into database
    summary_data = {
        "subject_user_id": subject_id,
        "cycle": cycle,
        "strengths": summary_response.strengths,
        "improvement_areas": summary_response.improvement_areas,
        "recurring_themes": summary_response.recurring_themes,
        "overall_tone": summary_response.overall_tone,
        "source_entry_count": len(entries),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

    try:
        # Check if already exists to perform manual update or insert
        existing_res = supabase.table("feedback_summaries")\
            .select("id")\
            .eq("subject_user_id", subject_id)\
            .eq("cycle", cycle)\
            .execute()
        
        if existing_res.data:
            summary_id = existing_res.data[0]["id"]
            res = supabase.table("feedback_summaries").update(summary_data).eq("id", summary_id).execute()
        else:
            res = supabase.table("feedback_summaries").insert(summary_data).execute()

        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save feedback summary."
            )
        return res.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during save: {str(e)}"
        )

@router.get("/summary")
async def get_summary(subject_user_id: str, cycle: str, current_user: dict = Depends(get_current_user)):
    caller_id = current_user["id"]
    caller_role = current_user["role"]

    # 1. Authorize: subject themselves, their manager, or admin
    is_subject = (caller_id == subject_user_id)
    is_mgr = await check_is_manager(caller_id, subject_user_id)
    is_admin = (caller_role == "admin")

    if not (is_subject or is_mgr or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view the summary for this user."
        )

    # 2. Fetch cached summary
    try:
        res = supabase.table("feedback_summaries")\
            .select("*")\
            .eq("subject_user_id", subject_user_id)\
            .eq("cycle", cycle)\
            .execute()
        
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No feedback summary generated for this user and cycle yet."
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
