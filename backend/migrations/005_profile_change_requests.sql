-- Migration: Create profile_change_requests table safely

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS profile_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    current_value TEXT,
    requested_value TEXT NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);
