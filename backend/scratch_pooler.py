import pg8000
import sys

def run():
    log_file = "pooler_log.txt"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("Starting Pooler test...\n")
        
        project_ref = "mjlkoulgwfyhfwvbccsi"
        user = f"postgres.{project_ref}"
        database = "postgres"
        
        # Common regions for Supabase poolers
        regions = [
            "ap-southeast-1", # Singapore
            "ap-south-1",     # Mumbai
            "us-east-1",      # N. Virginia
            "us-east-2",      # Ohio
            "us-west-1",      # N. California
            "us-west-2",      # Oregon
            "eu-central-1",   # Frankfurt
            "eu-west-1",      # Ireland
            "eu-west-2",      # London
        ]
        
        passwords = ["Demo@1234", "postgres", "admin", "password", "mjlkoulgwfyhfwvbccsi"]
        
        for region in regions:
            pooler_host = f"aws-0-{region}.pooler.supabase.com"
            f.write(f"\nTrying pooler host: {pooler_host}...\n")
            
            for port in [6543, 5432]:
                for pwd in passwords:
                    try:
                        f.write(f"Connecting to {pooler_host}:{port} with user={user}, password={pwd}...\n")
                        conn = pg8000.dbapi.connect(
                            host=pooler_host,
                            user=user,
                            database=database,
                            password=pwd,
                            port=port,
                            timeout=5
                        )
                        f.write(f"✅ SUCCESS! Connected to {pooler_host}:{port} with password: {pwd}\n")
                        conn.close()
                        return
                    except Exception as e:
                        err_str = str(e)
                        # If it's an auth failure, it means the host and port are correct, just password is wrong!
                        if "password authentication failed" in err_str or "FATAL" in err_str:
                            f.write(f"⚠️ Auth Failed (Host is reachable!): {err_str}\n")
                        else:
                            f.write(f"❌ Connection Failed: {err_str}\n")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        with open("pooler_log.txt", "a", encoding="utf-8") as f:
            f.write(f"Fatal error: {e}\n")
