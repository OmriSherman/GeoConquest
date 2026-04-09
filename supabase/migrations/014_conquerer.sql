-- Add is_conquerer flag to profiles for Conqueror (premium) subscription
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_conquerer BOOLEAN NOT NULL DEFAULT FALSE;
