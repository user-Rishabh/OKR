import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

emails = [
    "engineering.manager@nimbustech.demo",
    "backend.engineer@nimbustech.demo",
    "frontend.engineer@nimbustech.demo",
    "devops.engineer@nimbustech.demo",
    "qa.engineer@nimbustech.demo"
]

def main():
    print("Starting password fix...")
    successes = 0
    failures = 0
    
    try:
        users_res = supabase.table("users").select("*").execute()
        db_users = users_res.data
    except Exception as e:
        print(f"Failed to fetch users from database: {e}")
        return

    for user in db_users:
        uid = user["id"]
        job_title_formatted = user["job_title"].lower().replace(" ", ".")
        email = f"{job_title_formatted}@nimbustech.demo"
        
        if email not in emails:
            continue
            
        print(f"Updating password for {email} (ID: {uid})...")
        try:
            # We explicitly pass the password attribute in a dictionary
            supabase.auth.admin.update_user_by_id(uid, {"password": "Demo@1234"})
            print(f"[{email}] password reset successfully")
            successes += 1
        except Exception as e:
            print(f"[{email}] Failed: {e}")
            failures += 1
            
    print(f"\nSummary: {successes} successes, {failures} failures")

if __name__ == "__main__":
    main()
