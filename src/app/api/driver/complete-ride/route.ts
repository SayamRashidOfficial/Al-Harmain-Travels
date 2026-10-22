import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Validation regex for standard UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const { bookingId, driverId, status = 'completed' } = body;

    // 1. Server-side validation of inputs
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid Booking ID or reference is required.' },
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

    // Verify caller role if authenticated
    if (callerProfile) {
      if (callerProfile.role === 'customer') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Customers cannot mark journeys as completed.' },
          { status: 403 }
        );
      }

      if (callerProfile.role === 'driver' && driverId) {
        if (callerProfile.id !== driverId) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Driver identity mismatch.' },
            { status: 403 }
          );
        }
      }
    }

    const effectiveDriverId = driverId || booking.assigned_driver_id;

    if (booking.assigned_driver_id && effectiveDriverId && booking.assigned_driver_id !== effectiveDriverId) {
      const isStaff = callerProfile && (callerProfile.role === 'admin' || callerProfile.role === 'dispatcher');
      if (!isStaff) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only the assigned chauffeur can complete this journey.' },
          { status: 403 }
        );
      }
    }

    // 4. Validate Booking Lifecycle State
    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Cannot complete a cancelled or rejected trip.' },
        { status: 400 }
      );
    }

    // If already completed, return idempotent success
    if (
      booking.status === 'completed' ||
      booking.status === 'trip_completed' ||
      booking.status === 'ride_completed' ||
      booking.status === 'payment_completed'
    ) {
      return NextResponse.json({
        success: true,
        message: 'Ride is already completed.',
        booking_id: booking.id,
        status: booking.status,
      });
    }

    // 5. SERVER-SIDE VALIDATION: CASH ON PICKUP MUST BE CONFIRMED BEFORE COMPLETION
    // A booking is Cash on Pickup if:
    // - payment_method is explicitly 'cash'
    // - or payment record has method 'cash'
    // - or neither payment_method='online'/'card' nor payment_screenshot_url is provided
    const isExplicitlyOnlineOrCard =
      booking.payment_method === 'online' ||
      booking.payment_method === 'card' ||
      Boolean(booking.payment_screenshot_url);

    const isCashRide =
      booking.payment_method === 'cash' ||
      !isExplicitlyOnlineOrCard;

    if (isCashRide) {
      const isCashConfirmed =
        booking.payment_status === 'paid' ||
        booking.payment_status === 'confirmed' ||
        (Array.isArray(booking.payment)
          ? booking.payment.some((p: any) => p.status === 'paid' || p.status === 'confirmed')
          : (booking.payment?.status === 'paid' || booking.payment?.status === 'confirmed'));

      if (!isCashConfirmed) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot complete ride: Full cash payment must be confirmed received before completing Cash on Pickup rides.',
            requiresCashConfirmation: true,
          },
          { status: 400 }
        );
      }
    }

    // 6. Execute Ride Completion Updates
    const now = new Date().toISOString();
    const targetStatus = status === 'trip_completed' ? 'trip_completed' : 'completed';

    // A) Update booking status
    const { error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update({
        status: targetStatus,
        updated_at: now,
      })
      .eq('id', booking.id);

    if (updateErr) {
      console.error('Error updating booking status to completed:', updateErr);
      return NextResponse.json(
        { success: false, error: 'Failed to update booking status in database.' },
        { status: 500 }
      );
    }

    // B) Audit trail in booking_status_history
    await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: targetStatus,
      notes: `Ride marked ${targetStatus} by Chauffeur ${effectiveDriverId || ''}.`,
      changed_by: effectiveDriverId || null,
    });

    // C) Update driver status and ride statistics
    if (effectiveDriverId) {
      // Check if driver has other uncompleted assignments
      const { data: otherBookings } = await supabaseAdmin
        .from('bookings')
        .select('id, status')
        .eq('assigned_driver_id', effectiveDriverId)
        .neq('id', booking.id);

      const hasOtherAssignments = otherBookings?.some(
        (b: any) =>
          !['completed', 'trip_completed', 'ride_completed', 'payment_completed', 'cancelled', 'rejected'].includes(b.status)
      );

      const nextDriverStatus = hasOtherAssignments ? 'assigned' : 'available';

      // Count total completed rides for driver
      const { count: completedCount } = await supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_driver_id', effectiveDriverId)
        .in('status', ['completed', 'trip_completed', 'ride_completed', 'payment_completed']);

      await supabaseAdmin
        .from('drivers')
        .update({
          status: nextDriverStatus,
          total_rides: completedCount ?? 1,
          updated_at: now,
        })
        .eq('id', effectiveDriverId);
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      status: targetStatus,
      completed_at: now,
    });
  } catch (err: any) {
    console.error('Fatal error in complete-ride API:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error completing ride.' },
      { status: 500 }
    );
  }
}
