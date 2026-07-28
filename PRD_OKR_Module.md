# Product Requirements Document (PRD)
## Project: PulseOKR — AI-Driven Goal & OKR Suggestion Engine
*Phase 1 of a broader AI HR Copilot platform (future phases: Feedback Summarization, Sentiment Analysis)*

**Version:** 0.1 (Draft)
**Date:** July 28, 2026
**Owner:** Rishabh
**Status:** Draft for review

---

## 1. Background

The source deck outlines three AI-driven HR capabilities:
1. **Performance Feedback Summarization**
2. **Goal & OKR Suggestions** ← *Phase 1, this document*
3. **Employee Sentiment Analysis**

This PRD scopes Phase 1 only: an AI system that recommends SMART goals/OKRs to employees, checks cross-team alignment, and supports real-time monitoring of progress.

---

## 2. Problem Statement

Manual OKR-setting in organizations is slow, inconsistent, and often disconnected from actual company strategy. Employees struggle to write measurable, well-scoped goals; managers struggle to keep goals aligned across teams; and once goals are set, there's little continuous visibility into progress until review season.

## 3. Goals & Objectives

| Goal | Description |
|---|---|
| G1 | AI recommends SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goals tailored to an employee's role and org strategy |
| G2 | System detects goal overlap/misalignment across teams and departments |
| G3 | Real-time progress tracking with AI-generated nudges/feedback |
| G4 | Reduce time-to-draft-OKR for an employee from ~30 min to under 5 min |

## 4. Target Users

- **Employees** — set personal OKRs each cycle (quarterly)
- **Managers** — review/approve team OKRs, check alignment
- **HR/Org admins** — configure company strategic pillars, monitor org-wide alignment

## 5. Scope (Phase 1)

### In Scope
- User can input role, department, and free-text context (e.g. "I want to improve backend performance")
- AI suggests 3–5 SMART goal drafts, each broken into Key Results
- Alignment check: goal is tagged against company/department strategic objectives; flags duplicate/conflicting goals across the team
- Dashboard: view own OKRs, team OKRs (manager view), progress bars
- Manual progress update (%) per Key Result; AI generates a short check-in summary/nudge based on progress + time remaining
- Basic auth (employee/manager/admin roles)

### Out of Scope (Phase 1)
- Feedback summarization (Phase 2)
- Sentiment analysis (Phase 3)
- Integrations with real HR systems (Workday, BambooHR, etc.) — mocked/seeded data only for demo
- Mobile app

## 6. User Stories

1. *As an employee*, I want to describe my role and current focus so that AI suggests relevant SMART OKRs I can edit and adopt.
2. *As an employee*, I want to update progress on my Key Results so the system can track completion over time.
3. *As a manager*, I want to see all my team's OKRs in one view so I can spot duplication or misalignment.
4. *As a manager*, I want AI to flag when two team members have overlapping goals.
5. *As an admin*, I want to define company-level strategic pillars so employee goals can be checked for alignment against them.
6. *As any user*, I want a short AI-generated check-in message when a goal is falling behind schedule.

## 7. Success Metrics (for demo/prototype)

- End-to-end flow works: role input → AI OKR suggestion → save → progress update → alignment flag
- AI suggestions are structured (Objective + 3 Key Results minimum) and role-relevant
- Alignment detection correctly flags at least one seeded overlapping-goal scenario

## 8. Assumptions

- Demo will use seeded/mock company + employee data (no real HR data)
- LLM provider: Groq (fallback OpenRouter/Gemini per existing pipeline pattern)
- Single-tenant demo (one fake company) is sufficient for prototype

## 9. Open Questions

- Do we want quarterly-only cycles or configurable cycle length?
- Should managers be able to override/edit AI-suggested goals before employee sees them, or is it always employee-initiated?
