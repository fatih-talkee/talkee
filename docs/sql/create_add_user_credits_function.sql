-- ============================================================================
-- CREATE add_user_credits RPC FUNCTION
-- ============================================================================
-- This function adds credits to a user and updates wallet_balance
-- It creates a credit_transactions record and updates users.wallet_balance

-- IMPORTANT: If you get "function name is not unique" error, run this first:
-- DROP FUNCTION IF EXISTS public.add_user_credits(UUID, DECIMAL, VARCHAR, TEXT, VARCHAR);

-- Step 1: Drop existing function(s) if they exist (with different signatures)
DROP FUNCTION IF EXISTS public.add_user_credits(UUID, DECIMAL, VARCHAR, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS public.add_user_credits(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.add_user_credits(UUID, DECIMAL, VARCHAR);
DROP FUNCTION IF EXISTS public.add_user_credits(UUID, DECIMAL, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.add_user_credits CASCADE;

-- Step 2: Create the function
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_type VARCHAR(50) DEFAULT 'purchase',
  p_description TEXT DEFAULT NULL,
  p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance DECIMAL(10, 2);
BEGIN
  -- 1. Get current wallet balance
  SELECT wallet_balance INTO v_current_balance
  FROM public.users
  WHERE id = p_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 2. Calculate new balance
  v_current_balance := v_current_balance + p_amount;

  -- Prevent negative balance (optional - remove if you want to allow negative)
  IF v_current_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Attempted: %', 
      (v_current_balance - p_amount), p_amount;
  END IF;

  -- 3. Update wallet_balance in users table
  UPDATE public.users
  SET 
    wallet_balance = v_current_balance,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 4. Create credit_transactions record
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    type,
    description,
    stripe_payment_intent_id,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    p_type,
    p_description,
    p_stripe_payment_intent_id,
    NOW()
  );

  -- Log success (optional)
  RAISE NOTICE 'Credits added: user_id=%, amount=%, new_balance=%', 
    p_user_id, p_amount, v_current_balance;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_credits TO service_role;

-- Add comment
COMMENT ON FUNCTION public.add_user_credits IS 
  'Adds credits to user wallet and creates credit_transactions record. Updates users.wallet_balance atomically.';
