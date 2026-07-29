-- Migration: Add Activity Tracking Table

CREATE TABLE IF NOT EXISTS progress_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    previous_value NUMERIC NOT NULL,
    new_value NUMERIC NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
