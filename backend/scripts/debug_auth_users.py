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
    try:
        users_response = supabase.auth.admin.list_users()
        # Debug print
        print("Raw users_response type:", type(users_response))
        all_users = users_response if isinstance(users_response, list) else getattr(users_response, 'users', users_response)
        
        print(f"Found {len(all_users)} total users in Supabase Auth.")
        for u in all_users:
            email = u.email if hasattr(u, 'email') else u.get('email')
            uid = u.id if hasattr(u, 'id') else u.get('id')
            print(f"- {email} (ID: {uid})")
            
    except Exception as e:
        print(f"Failed to list users: {e}")

if __name__ == "__main__":
    main()
