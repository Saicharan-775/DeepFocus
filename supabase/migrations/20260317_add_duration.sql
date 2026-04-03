-- Migration: Add focus_duration to revision_problems
ALTER TABLE revision_problems 
ADD COLUMN IF NOT EXISTS focus_duration INTEGER DEFAULT 0;

COMMENT ON COLUMN revision_problems.focus_duration IS 'Time spent on the problem in seconds.';
