-- Migration: Enforce Cash Payment Confirmation Before Ride Completion
-- For Cash on Pickup rides, status cannot be updated to completed / trip_completed unless payment_status is 'paid' or 'confirmed'.
-- For other payment methods, the completion workflow remains unchanged.

CREATE OR REPLACE FUNCTION public.validate_booking_ride_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  -- Only validate when transitioning to completed status
  IF NEW.status IN ('completed', 'trip_completed', 'ride_completed') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'trip_completed', 'ride_completed')) THEN
    
    -- Check if it is a Cash on Pickup booking
    -- (payment_method is 'cash', or payment_method is null without payment screenshot)
    IF (NEW.payment_method = 'cash' OR (NEW.payment_method IS NULL AND NEW.payment_screenshot_url IS NULL)) THEN
      -- Must be confirmed as paid
      IF (NEW.payment_status IS NULL OR NEW.payment_status NOT IN ('paid', 'confirmed')) THEN
        RAISE EXCEPTION 'Cannot complete Cash on Pickup ride before cash payment is confirmed received (payment_status must be paid or confirmed).';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_validate_booking_ride_completion ON public.bookings;

CREATE TRIGGER trg_validate_booking_ride_completion
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_ride_completion();
