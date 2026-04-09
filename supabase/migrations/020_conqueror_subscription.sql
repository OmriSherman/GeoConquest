-- RPC: Activate Conqueror subscription
CREATE OR REPLACE FUNCTION activate_conqueror_subscription(
  p_user_id UUID,
  p_plan TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Set is_conquerer to true
  UPDATE profiles
  SET is_conquerer = TRUE
  WHERE id = p_user_id;

  -- Award bonus gold and tickets (only for unlimited)
  IF p_plan = 'unlimited' THEN
    UPDATE profiles
    SET gold_balance = gold_balance + 100000,
        tickets = COALESCE(tickets, 0) + 30
    WHERE id = p_user_id;
  END IF;

  v_result := jsonb_build_object(
    'success', TRUE,
    'plan', p_plan,
    'is_conquerer', TRUE
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant RPC access
GRANT EXECUTE ON FUNCTION activate_conqueror_subscription TO authenticated;
