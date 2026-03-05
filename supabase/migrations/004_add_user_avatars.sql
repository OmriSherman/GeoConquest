-- Add avatar fields to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🧑',
ADD COLUMN IF NOT EXISTS avatar_flag TEXT DEFAULT '🏳️';

-- For existing users, ensure they have default values
UPDATE profiles
SET 
  avatar_emoji = '🧑' WHERE avatar_emoji IS NULL;
  
UPDATE profiles
SET 
  avatar_flag = '🏳️' WHERE avatar_flag IS NULL;
