import sys
from app.core.supabase_client import supabase

try:
    print("Checking feedback_entries table...")
    res = supabase.table('feedback_entries').select('*').limit(1).execute()
    print("Result data:", res.data)
except Exception as e:
    print("Error querying feedback_entries:", e)
