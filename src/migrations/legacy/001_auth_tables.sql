-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times (IF NOT EXISTS guards)

CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL UNIQUE,
  auth_method TEXT        NOT NULL DEFAULT 'otp',
  google_id   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique
  ON users(google_id) WHERE google_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS otps (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT    NOT NULL,
  code       TEXT    NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otps_email_idx ON otps(email);
