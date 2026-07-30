import os
import sys
import requests
from dotenv import load_dotenv

# Path setups
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

SUPABASE_URL = "https://mjlkoulgwfyhfwvbccsi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qbGtvdWxnd2Z5aGZ3dmJjY3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTkzODcsImV4cCI6MjEwMDgzNTM4N30.I0AsMFoxpoJ9SvASzNEYQuVInVrOUdbN4BfaRAmxz8s"

def test():
    print("Testing backend alignment endpoints...")
    
    # 1. Log in via Supabase Auth
    from supabase import create_client, Client
    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        session = sb.auth.sign_in_with_password({
            "email": "engineering.manager@nimbustech.demo",
            "password": "Demo@1234"
        })
        token = session.session.access_token
        user_id = session.user.id
        print("Logged in successfully.")
    except Exception as e:
        print(f"Failed to log in: {e}")
        return

    # 2. Get the manager's team ID
    headers = {"Authorization": f"Bearer {token}"}
    user_res = requests.get(f"http://localhost:8000/api/users", headers=headers)
    users = user_res.json()
    
    manager_user = next((u for u in users if u["id"] == user_id), None)
    if not manager_user:
        print("Manager not found in users list.")
        return
        
    team_id = manager_user.get("team_id")
    print(f"Manager's team ID: {team_id}")
    
    if not team_id:
        print("Manager has no team ID.")
        return

    # 3. Test POST /api/goals/check-alignment
    print("\nTriggering POST /api/goals/check-alignment...")
    post_res = requests.post(
        "http://localhost:8000/api/goals/check-alignment",
        json={"team_id": team_id},
        headers=headers
    )
    print("Status code:", post_res.status_code)
    if post_res.status_code != 200:
        print("Error content:", post_res.text)
        return
        
    flags = post_res.json()
    print(f"Detected {len(flags)} alignment flags:")
    for f in flags:
        print(f"- Pair: {f['employee_name_a']} ({f['objective_text_a']}) and {f['employee_name_b']} ({f['objective_text_b']})")
        print(f"  Reason: {f['reason']}")

    # 4. Test GET /api/goals/alignment-flags
    print("\nTriggering GET /api/goals/alignment-flags...")
    get_res = requests.get(
        f"http://localhost:8000/api/goals/alignment-flags?team_id={team_id}",
        headers=headers
    )
    print("Status code:", get_res.status_code)
    if get_res.status_code == 200:
        get_flags = get_res.json()
        print(f"Retrieved {len(get_flags)} alignment flags from GET.")
        assert len(get_flags) == len(flags), "Flags list length mismatch between POST and GET!"
        print("GET results match POST results successfully!")

if __name__ == "__main__":
    test()
