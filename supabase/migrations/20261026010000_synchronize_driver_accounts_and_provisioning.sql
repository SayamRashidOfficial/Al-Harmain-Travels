-- Migration: Driver Account Provisioning and Synchronization
-- Ensures any driver created in auth.users or profiles is reliably provisioned into public.drivers.

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
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'customer');
  v_license := NULLIF(NEW.raw_user_meta_data->>'license_number', '');
  v_vehicle := NULLIF(NEW.raw_user_meta_data->>'assigned_vehicle_id', '');
  v_national_id := NULLIF(NEW.raw_user_meta_data->>'national_id', '');

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
    (NEW.email_confirmed_at IS NOT NULL),
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.email_verified END,
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

-- Trigger to sync drivers table when profiles role is driver
CREATE OR REPLACE FUNCTION public.handle_profile_driver_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.role = 'driver' THEN
    INSERT INTO public.drivers (
      id,
      license_number,
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
      'DL-' || UPPER(SUBSTRING(NEW.id::text, 1, 8)),
      'available',
      5.0,
      0,
      0.00,
      0.00,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_driver_sync ON public.profiles;
CREATE TRIGGER trg_profile_driver_sync
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_driver_sync();

-- Auto-heal existing driver accounts
INSERT INTO public.drivers (
  id,
  license_number,
  status,
  rating,
  total_rides,
  total_earnings,
  cash_collected,
  created_at,
  updated_at
)
SELECT 
  p.id,
  'DL-' || UPPER(SUBSTRING(p.id::text, 1, 8)),
  'available',
  5.0,
  0,
  0.00,
  0.00,
  NOW(),
  NOW()
FROM public.profiles p
WHERE p.role = 'driver'
  AND p.id NOT IN (SELECT id FROM public.drivers)
ON CONFLICT (id) DO NOTHING;
