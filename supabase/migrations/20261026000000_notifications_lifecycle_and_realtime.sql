-- Migration: Notifications System - Database Triggers, Realtime Publication, and Strict RLS
-- Migration Date: 2026-10-26

-- 1. Ensure Table Schema & Replica Identity
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Add to Supabase Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 3. Row Level Security Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read authorized notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update authorized notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete authorized notifications" ON public.notifications;

-- SELECT policy: Users read their own notifications or admins/dispatchers read system & role notifications
CREATE POLICY "Users can read authorized notifications" ON public.notifications
FOR SELECT USING (
  user_id = auth.uid()
  OR (public.is_dispatcher_or_admin() AND (role IN ('admin', 'dispatcher') OR user_id IS NULL))
);

-- INSERT policy: Authenticated users and triggers can insert notifications
CREATE POLICY "Allow authenticated insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE policy: Users mark their own notifications read, admins/dispatchers can update role notifications
CREATE POLICY "Users can update authorized notifications" ON public.notifications
FOR UPDATE USING (
  user_id = auth.uid()
  OR (public.is_dispatcher_or_admin() AND (role IN ('admin', 'dispatcher') OR user_id IS NULL))
)
WITH CHECK (
  user_id = auth.uid()
  OR (public.is_dispatcher_or_admin() AND (role IN ('admin', 'dispatcher') OR user_id IS NULL))
);

-- DELETE policy: Users can delete their own notifications, admins/dispatchers can clear role notifications
CREATE POLICY "Users can delete authorized notifications" ON public.notifications
FOR DELETE USING (
  user_id = auth.uid()
  OR public.is_dispatcher_or_admin()
);

-- 4. Database Trigger: Booking Lifecycle
CREATE OR REPLACE FUNCTION public.notify_booking_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_driver_id uuid;
  v_ref text;
  v_rec record;
  v_pickup text;
  v_dest text;
  v_pax text;
BEGIN
  v_ref := COALESCE(NEW.booking_reference, 'AHT-' || SUBSTRING(NEW.id::text, 1, 8));
  v_customer_id := NEW.customer_id;
  v_driver_id := NEW.assigned_driver_id;
  v_pickup := COALESCE(NEW.pickup_address, 'Pickup location');
  v_dest := COALESCE(NEW.destination_address, 'Destination');
  v_pax := COALESCE(NEW.passenger_name, 'Passenger');

  -- CASE 1: Booking INSERT (New booking created)
  IF (TG_OP = 'INSERT') THEN
    FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_rec.id AND booking_id = NEW.id AND title = 'New Booking Received'
      ) THEN
        INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
        VALUES (
          v_rec.id,
          'dispatcher',
          'New Booking Received',
          'Booking #' || v_ref || ' for ' || v_pax || ' (' || v_pickup || ' → ' || v_dest || ') was submitted.',
          'info',
          NEW.id,
          false
        );
      END IF;
    END LOOP;

    IF v_customer_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_customer_id AND booking_id = NEW.id AND title = 'Booking Received'
      ) THEN
        INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
        VALUES (
          v_customer_id,
          'customer',
          'Booking Received',
          'Your reservation #' || v_ref || ' (' || v_pickup || ' → ' || v_dest || ') has been received and is awaiting dispatch.',
          'ride',
          NEW.id,
          false
        );
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- CASE 2: Booking UPDATE
  IF (TG_OP = 'UPDATE') THEN
    -- Driver Assignment
    IF (OLD.assigned_driver_id IS DISTINCT FROM NEW.assigned_driver_id) THEN
      IF NEW.assigned_driver_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications
          WHERE user_id = NEW.assigned_driver_id AND booking_id = NEW.id AND title = 'New Ride Assignment'
            AND created_at > now() - interval '10 seconds'
        ) THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (
            NEW.assigned_driver_id,
            'driver',
            'New Ride Assignment',
            'You have been assigned to trip #' || v_ref || '. Pickup: ' || v_pickup || '.',
            'ride',
            NEW.id,
            false
          );
        END IF;

        IF v_customer_id IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE user_id = v_customer_id AND booking_id = NEW.id AND title = 'Driver Assigned'
              AND created_at > now() - interval '10 seconds'
          ) THEN
            INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
            VALUES (
              v_customer_id,
              'customer',
              'Driver Assigned',
              'A chauffeur has been assigned to your booking #' || v_ref || '.',
              'ride',
              NEW.id,
              false
            );
          END IF;
        END IF;

        FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
          IF NOT EXISTS (
            SELECT 1 FROM public.notifications
            WHERE user_id = v_rec.id AND booking_id = NEW.id AND title = 'Driver Assigned'
              AND created_at > now() - interval '10 seconds'
          ) THEN
            INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
            VALUES (
              v_rec.id,
              'dispatcher',
              'Driver Assigned',
              'Driver assigned to booking #' || v_ref || '.',
              'info',
              NEW.id,
              false
            );
          END IF;
        END LOOP;
      END IF;

      IF OLD.assigned_driver_id IS NOT NULL AND OLD.assigned_driver_id IS DISTINCT FROM NEW.assigned_driver_id THEN
        INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
        VALUES (
          OLD.assigned_driver_id,
          'driver',
          'Ride Unassigned',
          'Assignment for trip #' || v_ref || ' was removed or reassigned.',
          'warning',
          NEW.id,
          false
        );
      END IF;
    END IF;

    -- Status Transitions
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      IF (NEW.status IN ('driver_accepted', 'accepted')) THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Driver Accepted Ride', 'Your chauffeur has accepted booking #' || v_ref || ' and is preparing the vehicle.', 'ride', NEW.id, false);
        END IF;

        FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_rec.id, 'dispatcher', 'Trip Accepted by Driver', 'Captain accepted booking #' || v_ref || '.', 'info', NEW.id, false);
        END LOOP;

      ELSIF (NEW.status IN ('driver_arriving', 'on_the_way')) THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Captain En Route to Pickup', 'Your chauffeur is on the way to the pickup point for booking #' || v_ref || '.', 'ride', NEW.id, false);
        END IF;

      ELSIF (NEW.status IN ('driver_arrived', 'arrived')) THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Captain Arrived at Pickup', 'Your chauffeur has arrived at ' || v_pickup || ' for booking #' || v_ref || '.', 'ride', NEW.id, false);
        END IF;

      ELSIF (NEW.status IN ('trip_started', 'started', 'ride_started')) THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Trip Started', 'Your trip #' || v_ref || ' has started. Wishing you a safe and peaceful journey.', 'ride', NEW.id, false);
        END IF;

        FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_rec.id, 'dispatcher', 'Trip Started', 'Trip #' || v_ref || ' is now in progress.', 'info', NEW.id, false);
        END LOOP;

      ELSIF (NEW.status IN ('trip_completed', 'completed', 'ride_completed')) THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Trip Completed', 'Trip #' || v_ref || ' has completed. Thank you for travelling with Al Harmain Travels!', 'success', NEW.id, false);
        END IF;

        IF v_driver_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_driver_id, 'driver', 'Trip Completed', 'You completed trip #' || v_ref || ' successfully.', 'success', NEW.id, false);
        END IF;

        FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_rec.id, 'dispatcher', 'Trip Completed', 'Trip #' || v_ref || ' was marked completed.', 'success', NEW.id, false);
        END LOOP;

      ELSIF (NEW.status IN ('cancelled', 'rejected')) THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Booking Cancelled', 'Booking #' || v_ref || ' was cancelled.' || COALESCE(' Reason: ' || NEW.cancellation_reason, ''), 'warning', NEW.id, false);
        END IF;

        IF v_driver_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_driver_id, 'driver', 'Ride Cancelled', 'Trip #' || v_ref || ' was cancelled.' || COALESCE(' Reason: ' || NEW.cancellation_reason, ''), 'warning', NEW.id, false);
        END IF;

        FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_rec.id, 'dispatcher', 'Booking Cancelled', 'Booking #' || v_ref || ' was cancelled.' || COALESCE(' Reason: ' || NEW.cancellation_reason, ''), 'warning', NEW.id, false);
        END LOOP;

      ELSIF (NEW.status = 'payment_verified') THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Payment Verified', 'Your payment for booking #' || v_ref || ' has been verified.', 'success', NEW.id, false);
        END IF;

        FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_rec.id, 'dispatcher', 'Payment Verified', 'Payment for booking #' || v_ref || ' was verified.', 'success', NEW.id, false);
        END LOOP;

      ELSIF (NEW.status = 'payment_rejected') THEN
        IF v_customer_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Payment Rejected', 'Payment receipt for booking #' || v_ref || ' was rejected.' || COALESCE(' Reason: ' || NEW.payment_rejected_reason, ' Please re-upload receipt.'), 'warning', NEW.id, false);
        END IF;

        FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_rec.id, 'dispatcher', 'Payment Rejected', 'Payment rejected for booking #' || v_ref || '.', 'warning', NEW.id, false);
        END LOOP;
      END IF;
    END IF;

    -- Payment Screenshot Uploaded
    IF (OLD.payment_screenshot_url IS DISTINCT FROM NEW.payment_screenshot_url AND NEW.payment_screenshot_url IS NOT NULL) THEN
      IF v_customer_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
        VALUES (v_customer_id, 'customer', 'Payment Receipt Uploaded', 'Your payment receipt for #' || v_ref || ' has been uploaded and is pending verification.', 'info', NEW.id, false);
      END IF;

      FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
        INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
        VALUES (v_rec.id, 'dispatcher', 'Payment Receipt Uploaded', 'New payment receipt uploaded for booking #' || v_ref || '. Review in Payments dashboard.', 'info', NEW.id, false);
      END LOOP;
    END IF;

    -- Payment status confirmed
    IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status IN ('paid', 'confirmed') AND NEW.status != 'payment_verified') THEN
      IF v_customer_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications
          WHERE user_id = v_customer_id AND booking_id = NEW.id AND title IN ('Payment Received', 'Payment Verified')
            AND created_at > now() - interval '10 seconds'
        ) THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (v_customer_id, 'customer', 'Payment Received', 'Your payment for booking #' || v_ref || ' has been confirmed.', 'success', NEW.id, false);
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_lifecycle ON public.bookings;
CREATE TRIGGER trg_notify_booking_lifecycle
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_lifecycle();

-- 5. Database Trigger: Payment Lifecycle
CREATE OR REPLACE FUNCTION public.notify_payment_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_bkg record;
  v_ref text;
BEGIN
  SELECT id, booking_reference, customer_id, assigned_driver_id
  INTO v_bkg
  FROM public.bookings
  WHERE id = NEW.booking_id;

  v_ref := COALESCE(v_bkg.booking_reference, 'Trip');

  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('paid', 'confirmed'))) THEN
    IF NEW.method = 'cash' AND NEW.collected_by IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = NEW.collected_by AND booking_id = NEW.booking_id AND title = 'Cash Fare Collected'
          AND created_at > now() - interval '10 seconds'
      ) THEN
        INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
        VALUES (
          NEW.collected_by,
          'driver',
          'Cash Fare Collected',
          'You confirmed collecting ' || NEW.amount || ' SAR in cash for booking #' || v_ref || '.',
          'success',
          NEW.booking_id,
          false
        );
      END IF;

      IF v_bkg.customer_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications
          WHERE user_id = v_bkg.customer_id AND booking_id = NEW.booking_id AND title = 'Cash Fare Paid'
            AND created_at > now() - interval '10 seconds'
        ) THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (
            v_bkg.customer_id,
            'customer',
            'Cash Fare Paid',
            'Your cash payment of ' || NEW.amount || ' SAR has been confirmed by your chauffeur for booking #' || v_ref || '.',
            'success',
            NEW.booking_id,
            false
          );
        END IF;
      END IF;

      FOR v_rec IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'dispatcher')) LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.notifications
          WHERE user_id = v_rec.id AND booking_id = NEW.booking_id AND title = 'Cash Fare Collected by Driver'
            AND created_at > now() - interval '10 seconds'
        ) THEN
          INSERT INTO public.notifications (user_id, role, title, message, type, booking_id, read)
          VALUES (
            v_rec.id,
            'dispatcher',
            'Cash Fare Collected by Driver',
            'Captain confirmed cash collection of ' || NEW.amount || ' SAR for booking #' || v_ref || '.',
            'info',
            NEW.booking_id,
            false
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_lifecycle ON public.payments;
CREATE TRIGGER trg_notify_payment_lifecycle
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_lifecycle();
