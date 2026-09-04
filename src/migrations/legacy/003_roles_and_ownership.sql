-- ── Migration 003: User roles + startup ownership ─────────────────────────────
-- Run this in your Supabase SQL editor

-- 1. Add role column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'visitor'
  CHECK (role IN ('visitor', 'founder', 'vc', 'pending_vc', 'admin'));

-- 2. Add ownership columns to startups table
ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS created_by_email TEXT REFERENCES users(email) ON DELETE SET NULL;

ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS owner_email TEXT;

ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS owner_password_hash TEXT;

-- 3. Add deck_type to documents table (brand = public, investor = vc-only)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS deck_type TEXT NOT NULL DEFAULT 'brand'
  CHECK (deck_type IN ('brand', 'investor'));

-- 4. Set your own account as admin (replace with your actual email)
UPDATE users SET role = 'admin' WHERE email = 'ashutoshforcorporate@gmail.com';

-- 5. Any existing users who have startups → promote to founder
UPDATE users SET role = 'founder'
  WHERE email IN (SELECT DISTINCT created_by_email FROM startups WHERE created_by_email IS NOT NULL)
  AND role = 'visitor';
