-- PulseOKR Supabase Initial Schema Migration

-- ENUMS
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE goal_status AS ENUM ('draft', 'active', 'completed', 'at_risk');

-- TABLES

-- companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

-- users (Assuming Supabase Auth for id, but defining it as a table here for custom data)
CREATE TABLE users (
    id UUID PRIMARY KEY, -- FK to auth.users theoretically, but leaving as standard UUID for now
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    team_id UUID, -- Will define FK after teams table is created
    role user_role NOT NULL DEFAULT 'employee',
    job_title TEXT,
    department TEXT
);

-- teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add the missing FK on users.team_id now that teams exists
ALTER TABLE users ADD CONSTRAINT fk_user_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- strategic_pillars
CREATE TABLE strategic_pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT
);

-- goals (Objectives)
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cycle TEXT,
    objective_text TEXT NOT NULL,
    pillar_id UUID REFERENCES strategic_pillars(id) ON DELETE SET NULL,
    status goal_status NOT NULL DEFAULT 'draft',
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- key_results
CREATE TABLE key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    kr_text TEXT NOT NULL,
    target_value NUMERIC,
    current_value NUMERIC DEFAULT 0,
    unit TEXT,
    progress_pct NUMERIC DEFAULT 0
);

-- alignment_flags
CREATE TABLE alignment_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id_a UUID REFERENCES goals(id) ON DELETE CASCADE,
    goal_id_b UUID REFERENCES goals(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_goals CHECK (goal_id_a != goal_id_b)
);
