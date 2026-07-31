import sys
import os

def run():
    log_file = "db_log.txt"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("Starting DB test...\n")
        
        try:
            import pg8000
            f.write("pg8000 imported successfully.\n")
        except Exception as e:
            f.write(f"Failed to import pg8000: {e}\n")
            return
            
        host = "db.mjlkoulgwfyhfwvbccsi.supabase.co"
        user = "postgres"
        database = "postgres"
        
        passwords = ["Demo@1234", "postgres", "admin", "password", "mjlkoulgwfyhfwvbccsi"]
        
        # Test port 5432
        port = 5432
        for pwd in passwords:
            try:
                f.write(f"Testing password: {pwd} on port {port}...\n")
                conn = pg8000.dbapi.connect(
                    host=host,
                    user=user,
                    database=database,
                    password=pwd,
                    port=port,
                    timeout=5
                )
                f.write(f"✅ Success! Connected with password: {pwd}\n")
                conn.close()
                return
            except Exception as e:
                f.write(f"❌ Failed: {e}\n")
                
        # Test port 6543
        port = 6543
        for pwd in passwords:
            try:
                f.write(f"Testing password: {pwd} on port {port}...\n")
                conn = pg8000.dbapi.connect(
                    host=host,
                    user=user,
                    database=database,
                    password=pwd,
                    port=port,
                    timeout=5
                )
                f.write(f"✅ Success! Connected with password: {pwd}\n")
                conn.close()
                return
            except Exception as e:
                f.write(f"❌ Failed: {e}\n")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        with open("db_log.txt", "a", encoding="utf-8") as f:
            f.write(f"Fatal error: {e}\n")
