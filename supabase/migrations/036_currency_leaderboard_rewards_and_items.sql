-- Currency and reward hardening:
-- 1. Atomic profile gold/ticket deltas for immediate, final ticket updates.
-- 2. Allow quest reward "item" unlocks such as Beast Mark.
-- 3. Award daily leaderboard rewards only after a UTC day has ended.
-- 4. Add one deterministic bonus day per ISO week where ranks 1-3 are paid.

CREATE OR REPLACE FUNCTION public.apply_profile_currency_delta(
  p_gold_delta integer DEFAULT 0,
  p_ticket_delta integer DEFAULT 0
)
RETURNS TABLE(
  gold_balance integer,
  tickets integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_gold integer;
  v_current_tickets integer;
  v_new_gold integer;
  v_new_tickets integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(p.gold_balance, 0), COALESCE(p.tickets, 0)
  INTO v_current_gold, v_current_tickets
  FROM public.profiles AS p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_new_gold := v_current_gold + COALESCE(p_gold_delta, 0);
  v_new_tickets := v_current_tickets + COALESCE(p_ticket_delta, 0);

  IF v_new_gold < 0 THEN
    RAISE EXCEPTION 'Not enough gold';
  END IF;

  IF v_new_tickets < 0 THEN
    RAISE EXCEPTION 'Not enough tickets';
  END IF;

  UPDATE public.profiles AS p
  SET
    gold_balance = v_new_gold,
    tickets = v_new_tickets
  WHERE p.id = v_user_id;

  RETURN QUERY SELECT v_new_gold, v_new_tickets;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_profile_currency_delta(integer, integer) TO authenticated;

ALTER TABLE public.user_unlocked_items
  DROP CONSTRAINT IF EXISTS user_unlocked_items_item_type_check;

ALTER TABLE public.user_unlocked_items
  ADD CONSTRAINT user_unlocked_items_item_type_check
  CHECK (item_type IN ('avatar', 'flag', 'item'));

ALTER TABLE public.daily_leaderboard_rewards
  ADD COLUMN IF NOT EXISTS reward_rank integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bonus_day boolean NOT NULL DEFAULT false;

ALTER TABLE public.daily_leaderboard_rewards
  DROP CONSTRAINT IF EXISTS daily_leaderboard_rewards_pkey;

ALTER TABLE public.daily_leaderboard_rewards
  ADD CONSTRAINT daily_leaderboard_rewards_pkey PRIMARY KEY (reward_date, reward_rank);

DROP FUNCTION IF EXISTS public.award_daily_leaderboard_winner();

CREATE OR REPLACE FUNCTION public.award_daily_leaderboard_winner()
RETURNS TABLE(
  success boolean,
  reward_granted boolean,
  reward_date date,
  winner_user_id uuid,
  reward_rank integer,
  gold integer,
  tickets integer,
  bonus_day boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_date date := ((now() AT TIME ZONE 'UTC')::date - 1);
  v_day_start timestamptz := ((v_reward_date::text || ' 00:00:00+00')::timestamptz);
  v_day_end timestamptz := (((v_reward_date + 1)::text || ' 00:00:00+00')::timestamptz);
  v_existing_count integer;
  v_week_key text := to_char(v_reward_date, 'IYYY-IW');
  v_bonus_day_index integer := ((('x' || substr(md5(to_char(v_reward_date, 'IYYY-IW')), 1, 8))::bit(32)::bigint % 7)::integer);
  v_is_bonus_day boolean := ((extract(isodow from v_reward_date)::integer - 1) = ((('x' || substr(md5(to_char(v_reward_date, 'IYYY-IW')), 1, 8))::bit(32)::bigint % 7)::integer));
  v_limit integer;
  v_award record;
  v_awarded_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, v_reward_date, NULL::uuid, NULL::integer, 0, 0, FALSE, 'unauthorized';
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.daily_leaderboard_rewards AS dlr
  WHERE dlr.reward_date = v_reward_date;

  IF v_existing_count > 0 THEN
    RETURN QUERY
    SELECT
      TRUE,
      FALSE,
      dlr.reward_date,
      dlr.awarded_user_id,
      dlr.reward_rank,
      dlr.gold_awarded,
      dlr.tickets_awarded,
      COALESCE(dlr.bonus_day, FALSE),
      'already_awarded'
    FROM public.daily_leaderboard_rewards AS dlr
    WHERE dlr.reward_date = v_reward_date
    ORDER BY dlr.reward_rank;
    RETURN;
  END IF;

  v_limit := CASE WHEN v_is_bonus_day THEN 3 ELSE 1 END;

  FOR v_award IN
    WITH quiz_rows AS (
      SELECT
        qr.user_id,
        qr.quiz_type,
        qr.score,
        NULLIF(to_jsonb(qr)->>'xp_earned', '')::integer AS xp_earned_dyn,
        GREATEST(
          COALESCE(
            NULLIF(to_jsonb(qr)->>'total_questions', '')::integer,
            CASE WHEN qr.quiz_type = 'millionaire' THEN 15 ELSE 10 END
          ),
          1
        ) AS total_questions_dyn
      FROM public.quiz_results AS qr
      WHERE qr.played_at >= v_day_start
        AND qr.played_at < v_day_end
    ),
    totals AS (
      SELECT
        qr.user_id,
        SUM(
          CASE
            WHEN qr.xp_earned_dyn IS NOT NULL THEN GREATEST(qr.xp_earned_dyn, 0)
            WHEN qr.quiz_type = 'millionaire' THEN
              CASE WHEN qr.score >= 15 THEN 1000 ELSE 0 END
            WHEN qr.quiz_type IN ('flag', 'shape', 'capitals', 'borders', 'trail') THEN
              CASE
                WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) = 1 THEN
                  ROUND(
                    (qr.score * CASE qr.quiz_type
                      WHEN 'flag' THEN 5
                      WHEN 'shape' THEN 7
                      WHEN 'capitals' THEN 12
                      WHEN 'borders' THEN 15
                      WHEN 'trail' THEN 16
                      ELSE 0
                    END)::numeric * 2
                  )::integer
                WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) > 0.85 THEN
                  ROUND(
                    (qr.score * CASE qr.quiz_type
                      WHEN 'flag' THEN 5
                      WHEN 'shape' THEN 7
                      WHEN 'capitals' THEN 12
                      WHEN 'borders' THEN 15
                      WHEN 'trail' THEN 16
                      ELSE 0
                    END)::numeric * 1.5
                  )::integer
                ELSE
                  ROUND(
                    (qr.score * CASE qr.quiz_type
                      WHEN 'flag' THEN 5
                      WHEN 'shape' THEN 7
                      WHEN 'capitals' THEN 12
                      WHEN 'borders' THEN 15
                      WHEN 'trail' THEN 16
                      ELSE 0
                    END)::numeric
                  )::integer
              END
            ELSE 0
          END
        )::integer AS daily_xp
      FROM quiz_rows AS qr
      GROUP BY qr.user_id
    ),
    ranked AS (
      SELECT
        t.user_id,
        (ROW_NUMBER() OVER (ORDER BY t.daily_xp DESC, t.user_id ASC))::integer AS rank
      FROM totals AS t
      WHERE t.daily_xp > 0
      ORDER BY t.daily_xp DESC, t.user_id ASC
      LIMIT v_limit
    )
    SELECT
      ranked.user_id,
      ranked.rank,
      CASE WHEN v_is_bonus_day THEN 4 - ranked.rank ELSE 1 END AS multiplier
    FROM ranked
  LOOP
    INSERT INTO public.daily_leaderboard_rewards (
      reward_date,
      awarded_user_id,
      reward_rank,
      gold_awarded,
      tickets_awarded,
      bonus_day
    )
    VALUES (
      v_reward_date,
      v_award.user_id,
      v_award.rank,
      1000 * v_award.multiplier,
      2 * v_award.multiplier,
      v_is_bonus_day
    )
    ON CONFLICT ON CONSTRAINT daily_leaderboard_rewards_pkey DO NOTHING;

    IF FOUND THEN
      UPDATE public.profiles AS p
      SET
        gold_balance = COALESCE(p.gold_balance, 0) + (1000 * v_award.multiplier),
        tickets = COALESCE(p.tickets, 0) + (2 * v_award.multiplier)
      WHERE p.id = v_award.user_id;

      v_awarded_count := v_awarded_count + 1;
    END IF;
  END LOOP;

  IF v_awarded_count = 0 THEN
    RETURN QUERY SELECT TRUE, FALSE, v_reward_date, NULL::uuid, NULL::integer, 0, 0, v_is_bonus_day, 'no_daily_activity';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    TRUE,
    TRUE,
    dlr.reward_date,
    dlr.awarded_user_id,
    dlr.reward_rank,
    dlr.gold_awarded,
    dlr.tickets_awarded,
    COALESCE(dlr.bonus_day, FALSE),
    'awarded'
  FROM public.daily_leaderboard_rewards AS dlr
  WHERE dlr.reward_date = v_reward_date
  ORDER BY dlr.reward_rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_daily_leaderboard_winner TO authenticated;

NOTIFY pgrst, 'reload schema';
