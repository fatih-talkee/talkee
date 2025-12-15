-- ============================================================================
-- CREATE AUTH TRIGGER FOR USER SYNC
-- ============================================================================
-- Bu trigger auth.users tablosuna yeni user eklendiğinde
-- otomatik olarak users tablosuna da ekler
-- OAuth login sonrası user sync sorununu önler

-- Function oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_name TEXT;
  v_email TEXT;
  v_avatar_url TEXT;
  v_provider TEXT;
  v_providers JSONB;
BEGIN
  -- Get user info from auth.users metadata
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'User'
  );
  
  v_email := COALESCE(NEW.email, '');
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  
  -- Get provider from raw_app_meta_data
  v_provider := NEW.raw_app_meta_data->>'provider';
  IF v_provider IS NULL THEN
    -- Try to get from providers array
    IF NEW.raw_app_meta_data->'providers' IS NOT NULL THEN
      v_provider := (NEW.raw_app_meta_data->'providers'->>0);
    END IF;
  END IF;
  
  -- Build providers JSONB array
  IF v_provider IS NOT NULL THEN
    v_providers := jsonb_build_array(v_provider);
  ELSE
    v_providers := '[]'::jsonb;
  END IF;
  
  -- Insert into users table (only if not exists)
  INSERT INTO public.users (
    id,
    auth_id,
    name,
    primary_email,
    avatar_url,
    wallet_balance,
    role,
    oauth_providers,
    oauth_emails,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    v_name,
    v_email,
    v_avatar_url,
    0.00,
    'user',
    v_providers,
    CASE 
      WHEN v_provider IS NOT NULL THEN jsonb_build_object(v_provider, v_email)
      ELSE '{}'::jsonb
    END,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = COALESCE(EXCLUDED.name, users.name),
    primary_email = COALESCE(EXCLUDED.primary_email, users.primary_email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    oauth_providers = (
      SELECT jsonb_agg(DISTINCT elem)
      FROM (
        SELECT jsonb_array_elements_text(users.oauth_providers) AS elem
        UNION
        SELECT jsonb_array_elements_text(EXCLUDED.oauth_providers) AS elem
      ) AS combined
    ),
    oauth_emails = users.oauth_emails || EXCLUDED.oauth_emails,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a user record in users table when a new auth.users record is created. Handles OAuth and email/password signups.';
