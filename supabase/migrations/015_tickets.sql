-- Add tickets column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tickets INTEGER NOT NULL DEFAULT 0;
