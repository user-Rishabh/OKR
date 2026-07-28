# PulseOKR

An AI-driven Goal & OKR suggestion tool.

## Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: FastAPI (Python)
- Database: Supabase (Postgres)

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` in the root folder, and set the environment variables.
4. Run the development server: `npm run dev`

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Unix/MacOS: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the development server: `uvicorn app.main:app --reload`
