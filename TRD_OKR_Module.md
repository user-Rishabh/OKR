# Technical Requirements Document (TRD)
## Project: PulseOKR — AI-Driven Goal & OKR Suggestion Engine

**Version:** 0.1 (Draft)
**Date:** July 28, 2026
**Companion to:** PRD_OKR_Module.md

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS | Consistent with existing workflow |
| Backend | FastAPI (Python) | REST API |
| Database | Supabase (Postgres) | Auth + DB in one; pgvector not needed for Phase 1 (no semantic search yet) |
| AI/LLM | Groq (primary) → OpenRouter/Gemini (fallback) | Matches existing pipeline pattern |
| Auth | Supabase Auth | Role-based: employee / manager / admin |
| Hosting (demo) | Vercel (frontend) + Railway/Render (FastAPI backend) | |

## 2. High-Level Architecture

```
[React/Vite Frontend]
        |
        v  (REST, JSON)
[FastAPI Backend] ---> [Supabase Postgres: users, goals, key_results, teams, strategic_pillars]
        |
        v
[Groq LLM API] (goal generation, alignment check, check-in nudge generation)
```

## 3. Data Model (Supabase Postgres)

### `companies`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |

### `strategic_pillars`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| title | text | e.g. "Improve platform reliability" |
| description | text | |

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | from Supabase Auth |
| company_id | uuid FK | |
| team_id | uuid FK | nullable |
| role | enum | employee / manager / admin |
| job_title | text | used as AI context |
| department | text | |

### `teams`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| name | text | |
| manager_id | uuid FK → users | |

### `goals` (Objectives)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | owner |
| cycle | text | e.g. "Q3-2026" |
| objective_text | text | |
| pillar_id | uuid FK | nullable, alignment tag |
| status | enum | draft / active / completed / at_risk |
| ai_generated | boolean | |
| created_at | timestamptz | |

### `key_results`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goal_id | uuid FK | |
| kr_text | text | |
| target_value | numeric | nullable |
| current_value | numeric | default 0 |
| unit | text | e.g. "%", "count" |
| progress_pct | numeric | derived or manually updated |

### `alignment_flags`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| goal_id_a | uuid FK | |
| goal_id_b | uuid FK | |
| reason | text | AI-generated explanation |
| created_at | timestamptz | |

## 4. API Endpoints (FastAPI)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/goals/suggest` | Input: role, department, free-text context → Output: 3–5 AI-suggested Objective+KR sets |
| POST | `/api/goals` | Save a goal (AI-suggested or edited) with its Key Results |
| GET | `/api/goals?user_id=` | List a user's goals |
| GET | `/api/goals/team?team_id=` | Manager view: all team goals |
| PATCH | `/api/key-results/{id}` | Update progress value |
| POST | `/api/goals/check-alignment` | Run alignment check across a team's active goals |
| POST | `/api/goals/{id}/checkin` | Generate AI check-in/nudge message based on progress + time left |
| GET/POST | `/api/pillars` | Admin: manage strategic pillars |

## 5. AI Prompt Design

### 5.1 Goal Suggestion Prompt
**Input context:** job_title, department, free-text focus area, list of active company strategic_pillars
**Output:** structured JSON — array of `{ objective, key_results: [{text, suggested_metric}], aligned_pillar }`
**Instruction pattern:** System prompt enforces SMART criteria, forces JSON-only output, 3–5 objectives, 2–4 KRs each.

### 5.2 Alignment Check Prompt
**Input:** all active goals' objective_text for a team
**Output:** JSON list of `{goal_id_a, goal_id_b, reason}` for detected overlaps/conflicts
**Instruction pattern:** semantic similarity + explicit conflict reasoning, not just keyword match.

### 5.3 Check-in Nudge Prompt
**Input:** objective_text, KR progress %, days remaining in cycle
**Output:** 1–2 sentence natural-language nudge (encouraging if on track, alerting if at risk)

## 6. Non-Functional Requirements

- AI suggestion response time: target < 5s (Groq is fast, should be achievable)
- All AI outputs must be schema-validated (Pydantic) before being shown to user — reject/retry on malformed JSON
- Role-based access control enforced at API layer, not just frontend

## 7. Security Considerations

- **No hardcoded API keys** in frontend/JS source — learned from SkillBridge/SynthX incidents. All LLM calls go through FastAPI backend; keys stay server-side env vars only.
- Supabase RLS (Row Level Security) policies: employees can only read/write their own goals; managers can read their team's; admins full access within company.
- Rate-limit `/api/goals/suggest` per user to prevent LLM cost abuse.

## 8. Build Order (for Antigravity prompting)

1. Scaffold: Vite+React+TS+Tailwind frontend, FastAPI backend skeleton, Supabase schema migration
2. Mock data seed script (fake company, users, pillars, teams)
3. UI first with mock data: goal input form → suggestion cards → save flow
4. Wire FastAPI `/api/goals/suggest` with Groq, replace mock suggestions with real AI output
5. Manager dashboard (team goals view)
6. Alignment check endpoint + UI flags
7. Progress update + AI check-in nudge
8. Polish pass

## 9. Open Questions

- Should alignment checks run automatically (cron/on-save) or on-demand only, for the demo?
- Any preference on Groq model (e.g. llama-3.3-70b vs smaller/faster) for suggestion vs nudge generation?
