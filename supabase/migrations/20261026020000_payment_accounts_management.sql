-- ==============================================================================
-- Migration: Payment Accounts Management
-- Project:   Al Harmain Travels
-- Description:
--   Creates the payment_accounts table for managing corporate bank transfer
--   and mobile payment accounts dynamically from the Admin Dashboard.
--   Adds payment_account_id and payment_account_details to bookings and payments.
--   Applies RLS policies to restrict modifications to admins only.
-- ==============================================================================

-- 1. Create payment_accounts table
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_type   TEXT NOT NULL CHECK (payment_method_type IN ('bank_transfer', 'stc_pay', 'urpay', 'other')),
  provider_name         TEXT NOT NULL,
  account_holder_name   TEXT NOT NULL,
  account_number        TEXT NULL,
  iban                  TEXT NULL,
  wallet_number         TEXT NULL,
  instructions          TEXT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_default            BOOLEAN NOT NULL DEFAULT FALSE,
  display_order         INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for customer listing of active accounts
CREATE INDEX IF NOT EXISTS idx_payment_accounts_active_order 
  ON public.payment_accounts (is_active, is_default DESC, display_order ASC, created_at DESC);

-- Trigger for auto updated_at
CREATE OR REPLACE FUNCTION public.set_payment_account_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_payment_account_updated_at
  BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_payment_account_updated_at();

-- Trigger for single default account enforcement
CREATE OR REPLACE FUNCTION public.handle_payment_account_default()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.payment_accounts
    SET is_default = FALSE
    WHERE id <> NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_payment_account_default
  BEFORE INSERT OR UPDATE OF is_default ON public.payment_accounts
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION public.handle_payment_account_default();

-- 2. Add columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_account_details JSONB NULL;

-- 3. Add columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_account_details JSONB NULL;

-- 4. Enable RLS on payment_accounts
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone can read active accounts, admins/dispatchers can read all
DROP POLICY IF EXISTS "payment_accounts_select_policy" ON public.payment_accounts;
CREATE POLICY "payment_accounts_select_policy"
  ON public.payment_accounts
  FOR SELECT
  USING (
    is_active = TRUE
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'dispatcher')
    )
  );

-- Admin insert policy
DROP POLICY IF EXISTS "payment_accounts_admin_insert" ON public.payment_accounts;
CREATE POLICY "payment_accounts_admin_insert"
  ON public.payment_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin update policy
DROP POLICY IF EXISTS "payment_accounts_admin_update" ON public.payment_accounts;
CREATE POLICY "payment_accounts_admin_update"
  ON public.payment_accounts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin delete policy
DROP POLICY IF EXISTS "payment_accounts_admin_delete" ON public.payment_accounts;
CREATE POLICY "payment_accounts_admin_delete"
  ON public.payment_accounts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
