-- Migration: Create feedback_entries and feedback_summaries tables safely

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_type') THEN
        CREATE TYPE feedback_type AS ENUM ('self', 'peer', 'manager');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS feedback_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type feedback_type NOT NULL,
    cycle TEXT NOT NULL,
    content_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle TEXT NOT NULL,
    strengths TEXT NOT NULL,
    improvement_areas TEXT NOT NULL,
    recurring_themes TEXT NOT NULL,
    overall_tone TEXT NOT NULL,
    source_entry_count INTEGER NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_user_id, cycle)
);
