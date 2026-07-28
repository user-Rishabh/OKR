from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.supabase_client import supabase
from .routers import goals, companies

app = FastAPI(title="PulseOKR API", version="0.1.0")

# Enable CORS for frontend development
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(goals.router)
app.include_router(companies.router)

@app.get("/api/health")
async def health_check():
    # Attempt to use the supabase client to ensure it's initialized without error
    # We won't make a real query yet since the DB might be empty/no RLS
    return {"status": "ok", "message": "PulseOKR API is running."}
