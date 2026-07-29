import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def main():
    print("Fetching users from database...")
    users_res = supabase.table("users").select("*").execute()
    db_users = users_res.data
    
    if not db_users:
        print("No users found in database.")
        return

    print("Recreating auth users...")
    for user in db_users:
        old_id = user["id"]
        job_title_formatted = user["job_title"].lower().replace(" ", ".")
        email = f"{job_title_formatted}@nimbustech.demo"
        password = "Demo@1234"
        
        print(f"Processing {email}...")
        
        try:
            # 1. Create user in Supabase Auth
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            new_id = auth_response.user.id
            
            if new_id == old_id:
                print(f"[{email}] ID miraculously matched! Nothing else to do.")
                continue
                
            print(f"[{email}] Created new Auth User: {new_id}")
            
            # 2. Insert new row in `users` table to satisfy FK constraints
            new_user_data = {
                "id": new_id,
                "company_id": user["company_id"],
                "team_id": user["team_id"],
                "role": user["role"],
                "job_title": user["job_title"],
                "department": user["department"]
            }
            supabase.table("users").insert(new_user_data).execute()
            
            # 3. Update foreign key references
            # Update teams (manager_id)
            supabase.table("teams").update({"manager_id": new_id}).eq("manager_id", old_id).execute()
            
            # Update goals (user_id)
            supabase.table("goals").update({"user_id": new_id}).eq("user_id", old_id).execute()
            
            # 4. Delete old user row
            supabase.table("users").delete().eq("id", old_id).execute()
            
            print(f"[{email}] Successfully migrated database records to new ID.")
            
        except Exception as e:
            print(f"[{email}] Failed: {e}")

    print("\nAll done! You should now be able to log in with Demo@1234.")

if __name__ == "__main__":
    main()
