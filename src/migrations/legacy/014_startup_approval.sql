-- Migration 014: Startup registration approval gate
-- New startups are inserted with status='pending' via server code.
-- DEFAULT 'approved' preserves all existing startups without re-review.
ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
