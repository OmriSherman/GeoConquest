-- Add quest completion tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_speed_detective BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_ground_invasion BOOLEAN NOT NULL DEFAULT FALSE;
