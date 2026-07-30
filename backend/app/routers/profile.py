from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from ..core.supabase_client import supabase, supabase_admin
from ..core.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

class ChangeRequestCreate(BaseModel):
    field_name: str
    requested_value: str

class ChangeRequestReview(BaseModel):
    status: str  # 'approved' or 'rejected'
    reviewer_note: Optional[str] = None

@router.post("/change-request")
async def create_change_request(
    data: ChangeRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    valid_fields = ["full_name", "email", "job_title", "department"]
    if data.field_name not in valid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid field_name. Must be one of {valid_fields}"
        )
        
    user_id = current_user["id"]
    current_value = None

    # Get current value
    if data.field_name == "email":
        try:
            auth_user = supabase_admin.auth.admin.get_user(user_id)
            current_value = auth_user.user.email
        except Exception as e:
            current_value = ""
    else:
        current_value = current_user.get(data.field_name, "")

    insert_data = {
        "user_id": user_id,
        "requested_by": user_id,
        "field_name": data.field_name,
        "current_value": current_value,
        "requested_value": data.requested_value,
        "status": "pending"
    }

    try:
        res = supabase.table("profile_change_requests").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create change request")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/change-requests")
async def get_change_requests(
    user_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    caller_id = current_user["id"]
    caller_role = current_user["role"]

    # Non-managers/non-admins can only query their own requests
    target_user_id = user_id or caller_id
    if target_user_id != caller_id and caller_role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view other users' change requests."
        )

    try:
        res = supabase.table("profile_change_requests")\
            .select("*")\
            .eq("user_id", target_user_id)\
            .order("created_at", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/change-requests/pending")
async def get_pending_change_requests(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    caller_role = current_user["role"]
    caller_id = current_user["id"]

    if caller_role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can review pending requests."
        )

    try:
        # Fetch all pending requests first
        res = supabase.table("profile_change_requests")\
            .select("*")\
            .eq("status", "pending")\
            .order("created_at", desc=True)\
            .execute()
        
        pending_requests = res.data

        if not pending_requests:
            return []

        # If manager, filter by team members
        if caller_role == "manager":
            # Get the manager's team
            team_res = supabase.table("teams").select("id").eq("manager_id", caller_id).execute()
            team_ids = [t["id"] for t in team_res.data]
            
            if not team_ids:
                return []

            # Get users belonging to these teams
            users_res = supabase.table("users").select("id").in_("team_id", team_ids).execute()
            team_user_ids = [u["id"] for u in users_res.data]
            
            pending_requests = [r for r in pending_requests if r["user_id"] in team_user_ids]

        # Enforce company filtering if company_id is provided or default to current user's company
        comp_id = company_id or current_user.get("company_id")
        if comp_id:
            # Get all users of this company
            users_res = supabase.table("users").select("id").eq("company_id", comp_id).execute()
            company_user_ids = {u["id"] for u in users_res.data}
            pending_requests = [r for r in pending_requests if r["user_id"] in company_user_ids]

        if not pending_requests:
            return []

        # Fetch user names to append for requester details
        requester_ids = list({r["user_id"] for r in pending_requests})
        users_profile_res = supabase.table("users").select("id, full_name, role").in_("id", requester_ids).execute()
        user_map = {u["id"]: u for u in users_profile_res.data}

        # Merge requester details
        for r in pending_requests:
            u_info = user_map.get(r["user_id"], {})
            r["requester_name"] = u_info.get("full_name", "Unknown User")
            r["requester_role"] = u_info.get("role", "employee")

        return pending_requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/change-requests/{request_id}")
async def review_change_request(
    request_id: str,
    data: ChangeRequestReview,
    current_user: dict = Depends(get_current_user)
):
    caller_role = current_user["role"]
    caller_id = current_user["id"]

    if caller_role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and admins can review change requests."
        )

    if data.status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'approved' or 'rejected'"
        )

    # 1. Fetch the request details
    req_res = supabase.table("profile_change_requests").select("*").eq("id", request_id).execute()
    if not req_res.data:
        raise HTTPException(status_code=404, detail="Change request not found")
    
    change_req = req_res.data[0]
    if change_req["status"] != "pending":
        raise HTTPException(status_code=400, detail="This request has already been reviewed")

    target_user_id = change_req["user_id"]

    # 2. If manager, verify that target user is on manager's team
    if caller_role == "manager":
        team_res = supabase.table("teams").select("id").eq("manager_id", caller_id).execute()
        team_ids = [t["id"] for t in team_res.data]
        if not team_ids:
            raise HTTPException(status_code=403, detail="You do not manage any team.")
        
        target_user_res = supabase.table("users").select("team_id").eq("id", target_user_id).execute()
        if not target_user_res.data or target_user_res.data[0]["team_id"] not in team_ids:
            raise HTTPException(status_code=403, detail="This user is not on your managed team.")

    # 3. If approved, apply the changes
    if data.status == "approved":
        field = change_req["field_name"]
        val = change_req["requested_value"]

        if field == "email":
            try:
                # Update auth email
                supabase_admin.auth.admin.update_user_by_id(
                    target_user_id,
                    {"email": val, "email_confirm": True}
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to update auth email: {str(e)}"
                )
        else:
            # Update public users table
            try:
                update_res = supabase.table("users").update({field: val}).eq("id", target_user_id).execute()
                if not update_res.data:
                    raise HTTPException(status_code=500, detail="Failed to update user profile in database")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")

    # 4. Update the request status
    update_request = {
        "status": data.status,
        "reviewer_note": data.reviewer_note,
        "reviewed_by": caller_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }

    try:
        res = supabase.table("profile_change_requests").update(update_request).eq("id", request_id).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
