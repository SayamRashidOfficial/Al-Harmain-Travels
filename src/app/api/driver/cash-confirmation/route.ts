import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Validation regex for standard UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { bookingId, driverId } = body;

    // 1. Server-side validation of inputs
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid Booking ID is required.' },
        { status: 400 }
      );
    }

    if (!driverId || !UUID_REGEX.test(driverId)) {
      return NextResponse.json(
        { success: false, error: 'A valid Driver UUID is required.' },
        { status: 400 }
      );
    }

    // 2. Resolve booking from Supabase
    let bookingQuery = supabaseAdmin.from('bookings').select(`
      *,
      assigned_driver:drivers(*, profile:profiles(*)),
      payment:payments(*)
    `);

    const isUuid = UUID_REGEX.test(bookingId);
    if (isUuid) {
      bookingQuery = bookingQuery.eq('id', bookingId);
    } else {
      bookingQuery = bookingQuery.eq('booking_reference', bookingId);
    }

    const { data: booking, error: bookingErr } = await bookingQuery.maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found.' },
        { status: 404 }
      );
    }

    // 3. Proper Role-Based Authorization
    // Verify caller credentials if token provided
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let callerProfile: any = null;

    if (token) {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (!userErr && userData?.user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .maybeSingle();
        callerProfile = profile;
      }
    }

    // Check caller role
    if (callerProfile) {
      // If caller is a customer, reject immediately
      if (callerProfile.role === 'customer') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Customers cannot confirm cash collections.' },
          { status: 403 }
        );
      }

      // If caller is a driver, verify they are confirming for themselves and assigned to this ride
      if (callerProfile.role === 'driver') {
        if (callerProfile.id !== driverId) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Driver identity mismatch.' },
            { status: 403 }
          );
        }
      }
    }

    // Always enforce that the target driverId is actually assigned to this booking
    // or that the booking has no driver yet and is being claimed
    if (booking.assigned_driver_id && booking.assigned_driver_id !== driverId) {
      // If caller is an admin or dispatcher, allow them to record cash under the assigned driver
      const isStaff = callerProfile && (callerProfile.role === 'admin' || callerProfile.role === 'dispatcher');
      if (!isStaff) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only the assigned chauffeur can confirm cash collection for this journey.' },
          { status: 403 }
        );
      }
    }

    // 4. Validate Booking State and Payment Method
    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Cannot collect cash on a cancelled or rejected trip.' },
        { status: 400 }
      );
    }

    // Strict check: if booking is strictly prepaid via verified bank transfer with proof, disallow cash confirmation
    const isExplicitlyOnlinePrepaid =
      booking.payment_method === 'online' &&
      booking.payment_screenshot_url &&
      booking.payment_status === 'paid';

    if (isExplicitlyOnlinePrepaid) {
      return NextResponse.json(
        { success: false, error: 'This booking has already been prepaid online via verified bank transfer.' },
        { status: 400 }
      );
    }

    // Prevent double confirmation
    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Cash payment has already been marked as Paid for this booking.' },
        { status: 400 }
      );
    }

    // 5. Resolve fare amount
    const resolvedFare = Number(
      booking.final_fare ?? booking.confirmed_fare ?? booking.fixed_fare_amount ?? booking.estimated_fare ?? 0
    );

    if (resolvedFare <= 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot confirm cash collection for a booking with zero or unresolved fare.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 6. Execute Supabase Updates
    // A) Update Bookings table (CRITICAL: status is NOT modified, keeping ride lifecycle separate!)
    const { error: updateBookingErr } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_method: 'cash',
        updated_at: now,
      })
      .eq('id', booking.id);

    if (updateBookingErr) {
      console.error('Error updating booking payment status:', updateBookingErr);
      return NextResponse.json(
        { success: false, error: 'Failed to update booking payment status in database.' },
        { status: 500 }
      );
    }

    // B) Update or Insert into Payments table
    const existingPayments = Array.isArray(booking.payment) ? booking.payment : (booking.payment ? [booking.payment] : []);
    const paymentRecord = existingPayments[0];

    let paymentId = paymentRecord?.id;
    if (paymentRecord && paymentRecord.id) {
      const { error: pmtErr } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'paid',
          method: 'cash',
          amount: resolvedFare,
          collected_by: driverId,
          updated_at: now,
        })
        .eq('id', paymentRecord.id);

      if (pmtErr) {
        console.warn('Error updating payments table:', pmtErr);
      }
    } else {
      const { data: newPmt, error: pmtInsertErr } = await supabaseAdmin
        .from('payments')
        .insert({
          booking_id: booking.id,
          customer_id: booking.customer_id || null,
          amount: resolvedFare,
          method: 'cash',
          status: 'paid',
          collected_by: driverId,
          transaction_reference: booking.booking_reference,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (pmtInsertErr) {
        console.warn('Error inserting into payments table:', pmtInsertErr);
      } else if (newPmt) {
        paymentId = newPmt.id;
      }
    }

    // C) Record Audit Trail in booking_status_history
    const driverName = booking.assigned_driver?.profile?.full_name || 'Captain';
    await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: booking.status, // Maintains current ride status
      notes: `Cash on Pickup: Full fare of SAR ${resolvedFare} confirmed collected by Chauffeur ${driverName} (${driverId}). Payment status updated to Paid.`,
      changed_by: driverId,
    });

    // D) Increment cash_collected in drivers table
    const { data: driverData } = await supabaseAdmin
      .from('drivers')
      .select('cash_collected')
      .eq('id', driverId)
      .maybeSingle();

    if (driverData) {
      const currentCash = Number(driverData.cash_collected || 0);
      const updatedCash = Math.round((currentCash + resolvedFare) * 100) / 100;
      await supabaseAdmin
        .from('drivers')
        .update({
          cash_collected: updatedCash,
          updated_at: now,
        })
        .eq('id', driverId);
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      payment_id: paymentId,
      amount: resolvedFare,
      currency: 'SAR',
      payment_status: 'paid',
      payment_method: 'cash',
      collected_by: driverId,
      confirmed_at: now,
      ride_status: booking.status,
    });
  } catch (err: any) {
    console.error('Fatal error in cash-confirmation API:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error processing cash confirmation.' },
      { status: 500 }
    );
  }
}
