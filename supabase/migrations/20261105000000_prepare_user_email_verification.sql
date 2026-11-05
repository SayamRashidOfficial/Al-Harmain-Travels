-- ==============================================================================
-- Migration: Prepare User For Email Verification
-- Project: Al Harmain Travels
-- Description:
--   Provides a SECURITY DEFINER RPC public.prepare_user_for_email_verification
--   which explicitly clears email_confirmed_at in auth.users and sets
--   email_verified = false in both auth.users metadata and public.profiles,
--   ensuring the user is strictly Unverified until they click the confirmation link.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prepare_user_for_email_verification(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET 
    email_confirmed_at = NULL,
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email_verified}',
      'false'::jsonb
    ),
    updated_at = NOW()
  WHERE id = target_user_id;

  UPDATE public.profiles
  SET 
    email_verified = false,
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id
  );
END;
$$;

-- Grant execution to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.prepare_user_for_email_verification(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_user_for_email_verification(UUID) TO authenticated;
