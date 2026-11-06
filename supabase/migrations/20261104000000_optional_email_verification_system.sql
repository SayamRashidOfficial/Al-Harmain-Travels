-- ==============================================================================
-- Migration: Optional Email Verification & Direct Login System
-- Project: Al Harmain Travels
-- Description:
--   1. Updates public.handle_new_user() trigger function to respect
--      raw_user_meta_data->>'email_verified'. When false or not verified,
--      public.profiles.email_verified is set to false.
--   2. Ensures public.profiles.email_verified defaults to false for new users.
--   3. Provides SECURITY DEFINER RPC public.verify_user_email(target_user_id UUID)
--      to atomically verify email in both public.profiles and auth.users.
-- ==============================================================================

-- 1. Ensure email_verified default in public.profiles is false
ALTER TABLE public.profiles 
  ALTER COLUMN email_verified SET DEFAULT false;

-- 2. Update handle_new_user() function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_license TEXT;
  v_vehicle TEXT;
  v_national_id TEXT;
  v_email_verified BOOLEAN;
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'customer');
  v_license := NULLIF(NEW.raw_user_meta_data->>'license_number', '');
  v_vehicle := NULLIF(NEW.raw_user_meta_data->>'assigned_vehicle_id', '');
  v_national_id := NULLIF(NEW.raw_user_meta_data->>'national_id', '');

  -- Determine initial email verification status:
  -- If explicitly specified in raw_user_meta_data, respect it.
  -- Otherwise, default to false for newly registered accounts.
  IF NEW.raw_user_meta_data ? 'email_verified' THEN
    v_email_verified := (NEW.raw_user_meta_data->>'email_verified')::boolean;
  ELSE
    v_email_verified := (NEW.email_confirmed_at IS NOT NULL);
  END IF;

  -- 1. Upsert profile
  INSERT INTO public.profiles (
    id, role, full_name, email, phone, avatar_url, email_verified, status, created_at, updated_at
  )
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(v_email_verified, false),
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = COALESCE(EXCLUDED.email_verified, public.profiles.email_verified, false),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();

  -- 2. Customer record provisioning
  IF v_role = 'customer' THEN
    INSERT INTO public.customers (id, preferred_language)
    VALUES (NEW.id, 'en')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 3. Driver record provisioning
  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (
      id,
      license_number,
      national_id,
      assigned_vehicle_id,
      status,
      rating,
      total_rides,
      total_earnings,
      cash_collected,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(v_license, 'DL-' || UPPER(SUBSTRING(NEW.id::text, 1, 8))),
      v_national_id,
      v_vehicle,
      CASE WHEN v_vehicle IS NOT NULL THEN 'assigned' ELSE 'available' END,
      5.0,
      0,
      0.00,
      0.00,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      license_number = CASE 
        WHEN EXCLUDED.license_number IS NOT NULL AND EXCLUDED.license_number NOT LIKE 'DL-%' 
        THEN EXCLUDED.license_number 
        ELSE public.drivers.license_number 
      END,
      national_id = COALESCE(EXCLUDED.national_id, public.drivers.national_id),
      assigned_vehicle_id = COALESCE(EXCLUDED.assigned_vehicle_id, public.drivers.assigned_vehicle_id),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Atomic RPC to mark a user's email as verified in both profiles and auth.users
CREATE OR REPLACE FUNCTION public.verify_user_email(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_updated BOOLEAN := false;
BEGIN
  -- Update public.profiles
  UPDATE public.profiles
  SET 
    email_verified = true,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Update auth.users metadata & confirmation timestamp
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email_verified}',
      'true'::jsonb
    ),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email_verified', true
  );
END;
$$;

-- Grant execution to authenticated & service_role
GRANT EXECUTE ON FUNCTION public.verify_user_email(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_user_email(UUID) TO authenticated;
