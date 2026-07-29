-- Migration: Add reasoning column to progress_logs

ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS reasoning TEXT;
