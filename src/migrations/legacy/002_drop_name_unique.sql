-- Remove the unique constraint on `name` so Google OAuth users with duplicate
-- display names can sign up. Name uniqueness is still enforced at the app layer
-- for OTP-based signup (see handleSignUp in server.ts).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_name_key;
