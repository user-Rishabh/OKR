import os
import sys
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client

# Add backend directory to sys.path to allow importing from app if needed
# but we can just initialize our own client here
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env vars from the root .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_uuid():
    return str(uuid.uuid4())

def seed_data():
    print("Starting data seeding...")
    
    # Check if company already exists to prevent duplication
    existing_companies = supabase.table("companies").select("*").eq("name", "Nimbus Technologies").execute()
    if existing_companies.data:
        print("Company 'Nimbus Technologies' already exists. Skipping seed to prevent duplicates.")
        return

    # 1. Create Company
    company_data = {"name": "Nimbus Technologies"}
    company = supabase.table("companies").insert(company_data).execute().data[0]
    company_id = company["id"]
    print(f"Created company: {company['name']} ({company_id})")

    # 2. Create Strategic Pillars
    pillars = [
        {"company_id": company_id, "title": "Improve platform reliability", "description": "Ensure 99.99% uptime and reduce incident resolution time."},
        {"company_id": company_id, "title": "Accelerate customer onboarding", "description": "Make the onboarding process seamless and self-serve."},
        {"company_id": company_id, "title": "Expand into enterprise segment", "description": "Build features required by large enterprise customers."}
    ]
    inserted_pillars = supabase.table("strategic_pillars").insert(pillars).execute().data
    print(f"Created {len(inserted_pillars)} strategic pillars")

    # 3. Create Team (without manager first)
    team_data = {"company_id": company_id, "name": "Platform Engineering"}
    team = supabase.table("teams").insert(team_data).execute().data[0]
    team_id = team["id"]
    print(f"Created team: {team['name']} ({team_id})")

    # 4. Create Users (Manager and Employees)
    manager_id = generate_uuid()
    emp1_id = generate_uuid()
    emp2_id = generate_uuid()
    emp3_id = generate_uuid()
    emp4_id = generate_uuid()

    users = [
        {"id": manager_id, "company_id": company_id, "team_id": team_id, "role": "manager", "job_title": "Engineering Manager", "department": "Engineering"},
        {"id": emp1_id, "company_id": company_id, "team_id": team_id, "role": "employee", "job_title": "Backend Engineer", "department": "Engineering"},
        {"id": emp2_id, "company_id": company_id, "team_id": team_id, "role": "employee", "job_title": "Frontend Engineer", "department": "Engineering"},
        {"id": emp3_id, "company_id": company_id, "team_id": team_id, "role": "employee", "job_title": "DevOps Engineer", "department": "Engineering"},
        {"id": emp4_id, "company_id": company_id, "team_id": team_id, "role": "employee", "job_title": "QA Engineer", "department": "Engineering"},
    ]
    supabase.table("users").insert(users).execute()
    print(f"Created 5 users (1 manager, 4 employees)")

    # 5. Update Team with Manager
    supabase.table("teams").update({"manager_id": manager_id}).eq("id", team_id).execute()
    print(f"Assigned manager {manager_id} to team {team_id}")

    # 6. Create Goals for 2 employees (emp1 and emp2)
    # Emp 1 Goals
    goals_data = [
        {
            "user_id": emp1_id,
            "cycle": "Q3-2026",
            "objective_text": "Improve API response time by optimizing database queries",
            "pillar_id": inserted_pillars[0]["id"], # Improve platform reliability
            "status": "active",
            "ai_generated": True
        },
        {
            "user_id": emp1_id,
            "cycle": "Q3-2026",
            "objective_text": "Migrate legacy authentication service to new microservice",
            "pillar_id": inserted_pillars[0]["id"],
            "status": "active",
            "ai_generated": False
        },
        # Emp 2 Goals
        {
            "user_id": emp2_id,
            "cycle": "Q3-2026",
            "objective_text": "Improve API response time by optimizing database queries", # Overlapping goal!
            "pillar_id": inserted_pillars[0]["id"],
            "status": "active",
            "ai_generated": True
        }
    ]
    inserted_goals = supabase.table("goals").insert(goals_data).execute().data
    print(f"Created {len(inserted_goals)} goals")

    # 7. Create Key Results
    emp1_goal1_id = inserted_goals[0]["id"]
    emp1_goal2_id = inserted_goals[1]["id"]
    emp2_goal1_id = inserted_goals[2]["id"]

    krs_data = [
        # KR for Emp1 Goal 1
        {"goal_id": emp1_goal1_id, "kr_text": "Reduce average API latency from 200ms to 50ms", "target_value": 50, "current_value": 150, "unit": "ms", "progress_pct": 33},
        {"goal_id": emp1_goal1_id, "kr_text": "Implement Redis caching for top 5 endpoints", "target_value": 5, "current_value": 2, "unit": "endpoints", "progress_pct": 40},
        
        # KR for Emp1 Goal 2
        {"goal_id": emp1_goal2_id, "kr_text": "Achieve 100% traffic migration to new auth service", "target_value": 100, "current_value": 10, "unit": "%", "progress_pct": 10},
        {"goal_id": emp1_goal2_id, "kr_text": "Zero downtime during migration window", "target_value": 0, "current_value": 0, "unit": "incidents", "progress_pct": 100},
        
        # KR for Emp2 Goal 1
        {"goal_id": emp2_goal1_id, "kr_text": "Optimize complex joins in the reporting dashboard", "target_value": 100, "current_value": 50, "unit": "%", "progress_pct": 50},
        {"goal_id": emp2_goal1_id, "kr_text": "Implement index strategies for the goals table", "target_value": 100, "current_value": 0, "unit": "%", "progress_pct": 0},
    ]
    inserted_krs = supabase.table("key_results").insert(krs_data).execute().data
    print(f"Created {len(inserted_krs)} key results")

    print("Data seeding completed successfully!")

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"An error occurred during seeding: {e}")
        sys.exit(1)
