import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

# Must use service role key for admin auth functions
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def create_auth_users():
    print("WARNING: Using demo password 'Demo@1234'. Not safe for production!")
    print("Fetching seeded users...")
    
    users_res = supabase.table("users").select("*").execute()
    users = users_res.data
    
    if not users:
        print("No users found in database.")
        return

    summary = []

    for user in users:
        old_id = user["id"]
        job_title_formatted = user["job_title"].lower().replace(" ", ".")
        email = f"{job_title_formatted}@nimbustech.demo"
        password = "Demo@1234"
        
        # Check if auth user already exists (might have been created previously)
        # We can't query by email directly with python client easily, but we can try to create and catch error
        print(f"Creating auth user for {email}...")
        
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            new_id = auth_response.user.id
            
            # Step 1: Insert new user row
            new_user_data = {
                "id": new_id,
                "company_id": user["company_id"],
                "team_id": user["team_id"],
                "role": user["role"],
                "job_title": user["job_title"],
                "department": user["department"]
            }
            supabase.table("users").insert(new_user_data).execute()
            
            # Step 2: Update foreign key references to point to new_id
            # Update teams (manager_id)
            supabase.table("teams").update({"manager_id": new_id}).eq("manager_id", old_id).execute()
            
            # Update goals (user_id)
            supabase.table("goals").update({"user_id": new_id}).eq("user_id", old_id).execute()
            
            # Step 3: Delete old user row
            supabase.table("users").delete().eq("id", old_id).execute()
            
            summary.append({
                "email": email,
                "password": password,
                "role": user["role"],
                "job_title": user["job_title"]
            })
            
            print(f"✅ Successfully mapped {email} to new ID {new_id}")
            
        except Exception as e:
            print(f"❌ Failed to create user {email}: {e}")
    
    print("\n" + "="*60)
    print("DEMO LOGIN CREDENTIALS SUMMARY")
    print("="*60)
    print(f"{'Email':<35} | {'Password':<15} | {'Role':<10} | {'Job Title'}")
    print("-" * 80)
    for s in summary:
        print(f"{s['email']:<35} | {s['password']:<15} | {s['role']:<10} | {s['job_title']}")
    print("="*60)

if __name__ == "__main__":
    create_auth_users()
