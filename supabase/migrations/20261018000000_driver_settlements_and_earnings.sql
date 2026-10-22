-- ==============================================================================
-- Migration: Driver Settlements & Earnings Ledger
-- Project:   Al Harmain Travels
-- Description:
--   Creates the driver_settlements table for tracking company payouts to chauffeurs.
--   Enables Row Level Security (RLS) and attaches to supabase_realtime.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.driver_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  settlement_reference TEXT NOT NULL UNIQUE,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'completed',
  bank_name TEXT,
  transaction_number TEXT,
  notes TEXT,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_settlements_driver_id 
  ON public.driver_settlements (driver_id, created_at DESC);

ALTER TABLE public.driver_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all driver_settlements operations" ON public.driver_settlements;
CREATE POLICY "Allow all driver_settlements operations"
  ON public.driver_settlements
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'driver_settlements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_settlements;
  END IF;
END $$;
