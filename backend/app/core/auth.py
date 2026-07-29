from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .supabase_client import supabase

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise Exception("Invalid user token")
            
        user_id = auth_response.user.id
        
        # Fetch user details from database
        user_res = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found in database")
            
        return user_res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
