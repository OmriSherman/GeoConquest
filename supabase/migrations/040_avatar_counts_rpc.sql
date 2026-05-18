-- SECURITY DEFINER so it bypasses RLS and returns counts for all users,
-- not just the calling user's own rows.
CREATE OR REPLACE FUNCTION public.get_all_avatar_counts()
RETURNS TABLE(user_id uuid, avatar_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, COUNT(*) AS avatar_count
  FROM user_unlocked_items
  WHERE item_type = 'avatar'
  GROUP BY user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_avatar_counts() TO authenticated;
