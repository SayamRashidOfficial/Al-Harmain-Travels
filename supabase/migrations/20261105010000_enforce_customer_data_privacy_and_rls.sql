-- Migration: 20261105010000_enforce_customer_data_privacy_and_rls.sql
-- Description: Enforce strict Row-Level Security (RLS) and customer data isolation
-- across bookings, driver_locations, additional_charges, payments, profiles, and customer data.

BEGIN;

-- Helper function: is_driver
CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'driver'
  );
$$;

-- 1. BOOKINGS TABLE RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all bookings operations" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_policy" ON public.bookings;

-- SELECT: Dispatcher/Admin can view all bookings.
-- Driver can view only bookings assigned to them.
-- Customer can view ONLY their own bookings (where customer_id = auth.uid()).
CREATE POLICY "bookings_select_policy" ON public.bookings
FOR SELECT TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
  OR assigned_driver_id = auth.uid()
);

-- INSERT: Dispatcher/Admin can insert any booking.
-- Customer can only insert bookings where customer_id matches their own auth.uid().
CREATE POLICY "bookings_insert_policy" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
);

-- UPDATE: Dispatcher/Admin can update any booking.
-- Driver can update their assigned bookings.
-- Customer can update only their own bookings.
CREATE POLICY "bookings_update_policy" ON public.bookings
FOR UPDATE TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
  OR assigned_driver_id = auth.uid()
)
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
  OR assigned_driver_id = auth.uid()
);

-- DELETE: Only Dispatcher/Admin can delete bookings.
CREATE POLICY "bookings_delete_policy" ON public.bookings
FOR DELETE TO authenticated
USING (
  public.is_dispatcher_or_admin()
);

-- 2. ADDITIONAL CHARGES TABLE RLS
ALTER TABLE public.additional_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all additional_charges" ON public.additional_charges;
DROP POLICY IF EXISTS "additional_charges_select_policy" ON public.additional_charges;
DROP POLICY IF EXISTS "additional_charges_insert_policy" ON public.additional_charges;
DROP POLICY IF EXISTS "additional_charges_update_delete_policy" ON public.additional_charges;

CREATE POLICY "additional_charges_select_policy" ON public.additional_charges
FOR SELECT TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = additional_charges.booking_id
      AND (b.customer_id = auth.uid() OR b.assigned_driver_id = auth.uid())
  )
);

CREATE POLICY "additional_charges_insert_policy" ON public.additional_charges
FOR INSERT TO authenticated
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = additional_charges.booking_id
      AND b.assigned_driver_id = auth.uid()
  )
);

CREATE POLICY "additional_charges_update_delete_policy" ON public.additional_charges
FOR ALL TO authenticated
USING (
  public.is_dispatcher_or_admin()
)
WITH CHECK (
  public.is_dispatcher_or_admin()
);

-- 3. PAYMENTS TABLE RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all payments operations" ON public.payments;
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON public.payments;

CREATE POLICY "payments_select_policy" ON public.payments
FOR SELECT TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = payments.booking_id
      AND b.assigned_driver_id = auth.uid()
  )
);

CREATE POLICY "payments_insert_policy" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
  OR auth.role() = 'authenticated'
);

CREATE POLICY "payments_update_policy" ON public.payments
FOR UPDATE TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
)
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
);

CREATE POLICY "payments_delete_policy" ON public.payments
FOR DELETE TO authenticated
USING (
  public.is_dispatcher_or_admin()
);

-- 4. BOOKING STATUS HISTORY TABLE RLS
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all booking status history" ON public.booking_status_history;
DROP POLICY IF EXISTS "booking_status_history_select_policy" ON public.booking_status_history;
DROP POLICY IF EXISTS "booking_status_history_insert_policy" ON public.booking_status_history;
DROP POLICY IF EXISTS "booking_status_history_write_policy" ON public.booking_status_history;

CREATE POLICY "booking_status_history_select_policy" ON public.booking_status_history
FOR SELECT TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_status_history.booking_id
      AND (b.customer_id = auth.uid() OR b.assigned_driver_id = auth.uid())
  )
);

CREATE POLICY "booking_status_history_insert_policy" ON public.booking_status_history
FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "booking_status_history_write_policy" ON public.booking_status_history
FOR ALL TO authenticated
USING (
  public.is_dispatcher_or_admin()
)
WITH CHECK (
  public.is_dispatcher_or_admin()
);

-- 5. EMERGENCY CONTACTS TABLE RLS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all emergency_contacts operations" ON public.emergency_contacts;
DROP POLICY IF EXISTS "emergency_contacts_access_policy" ON public.emergency_contacts;

CREATE POLICY "emergency_contacts_access_policy" ON public.emergency_contacts
FOR ALL TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
)
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
);

-- 6. SAVED PLACES TABLE RLS
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all saved_places operations" ON public.saved_places;
DROP POLICY IF EXISTS "saved_places_access_policy" ON public.saved_places;

CREATE POLICY "saved_places_access_policy" ON public.saved_places
FOR ALL TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
)
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
);

-- 7. RECENT LOCATIONS TABLE RLS
ALTER TABLE public.recent_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all recent_locations operations" ON public.recent_locations;
DROP POLICY IF EXISTS "recent_locations_access_policy" ON public.recent_locations;

CREATE POLICY "recent_locations_access_policy" ON public.recent_locations
FOR ALL TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
)
WITH CHECK (
  public.is_dispatcher_or_admin()
  OR customer_id = auth.uid()
);

-- 8. PROFILES TABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.is_dispatcher_or_admin()
  OR id = auth.uid()
  OR role = 'driver'
  OR id IN (
    SELECT customer_id FROM public.bookings WHERE assigned_driver_id = auth.uid()
  )
);

COMMIT;
