from supabase import create_client, Client
import json

SUPABASE_URL = "https://mjlkoulgwfyhfwvbccsi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qbGtvdWxnd2Z5aGZ3dmJjY3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTkzODcsImV4cCI6MjEwMDgzNTM4N30.I0AsMFoxpoJ9SvASzNEYQuVInVrOUdbN4BfaRAmxz8s"

def main():
    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("alignment_flags").select("*").execute()
    print("Alignment Flags in DB:")
    print(json.dumps(res.data, indent=2))

if __name__ == "__main__":
    main()
