-- ============================================================================
-- UPDATE add_user_credits FUNCTION
-- ============================================================================
-- This updates the existing function to ALSO update users.wallet_balance
-- The function currently updates user_credits table but NOT users.wallet_balance
-- This fix ensures both are updated

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS public.add_user_credits(uuid, numeric, text, text, text);

-- Step 2: Create updated function that updates BOTH user_credits AND users.wallet_balance
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id uuid,
  p_amount numeric,
  p_type text DEFAULT 'purchase'::text,
  p_description text DEFAULT NULL::text,
  p_stripe_payment_intent_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_new_balance numeric;
  v_transaction_id uuid;
  v_user_exists boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Update or insert user_credits table (existing logic)
  INSERT INTO user_credits (user_id, balance, total_purchased)
  VALUES (p_user_id, p_amount, CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    balance = user_credits.balance + p_amount,
    total_purchased = user_credits.total_purchased + CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- ALSO update users.wallet_balance (NEW - this was missing!)
  UPDATE public.users
  SET 
    wallet_balance = COALESCE(wallet_balance, 0) + p_amount,
    updated_at = now()
  WHERE id = p_user_id;

  -- Get the updated wallet_balance from users table to verify
  SELECT wallet_balance INTO v_new_balance
  FROM public.users
  WHERE id = p_user_id;

  -- Create credit_transactions record
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, description, stripe_payment_intent_id
  )
  VALUES (
    p_user_id, p_type, p_amount, v_new_balance,
    COALESCE(p_description, 'Credit ' || p_type),
    p_stripe_payment_intent_id
  )
  RETURNING id INTO v_transaction_id;

  -- Return success with new balance
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'amount_added', p_amount
  );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_user_credits(uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_credits(uuid, numeric, text, text, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.add_user_credits(uuid, numeric, text, text, text) IS 
  'Adds credits to user wallet. Updates BOTH user_credits table AND users.wallet_balance column. Creates credit_transactions record.';
