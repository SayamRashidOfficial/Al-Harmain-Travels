import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { calculateDistanceKm, estimateDurationMinutes } from '@/lib/geo';
import { fetchDriverDetails } from '@/lib/driver-stats';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required.' }, { status: 400 });
    }

    // Resolve booking from Supabase
    let query = supabase.from('bookings').select(`
      *,
      assigned_driver:drivers(
        id,
        rating,
        total_rides,
        profile:profiles(full_name, avatar_url),
        assigned_vehicle:rate_vehicle_types(name, category, seating_capacity),
        location:driver_locations(latitude, longitude, heading)
      )
    `);

    // Match by id or booking_reference
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('booking_reference', id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    let sanitizedDriver = null;
    let etaMinutes = null;
    let etaFormatted = null;

    const driverId = booking.assigned_driver_id || booking.assigned_driver?.id;
    if (driverId) {
      const enrichedDriver = await fetchDriverDetails(supabase, driverId);
      const d = enrichedDriver || booking.assigned_driver;

      const driverLat = d?.location?.latitude ?? 21.4225;
      const driverLng = d?.location?.longitude ?? 39.8262;
      const pickupLat = booking.pickup_latitude ?? driverLat;
      const pickupLng = booking.pickup_longitude ?? driverLng;

      const distKm = calculateDistanceKm(driverLat, driverLng, pickupLat, pickupLng);
      etaMinutes = Math.max(2, estimateDurationMinutes(distKm));
      const arrivalTime = new Date(Date.now() + etaMinutes * 60 * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      etaFormatted = `${etaMinutes} mins (${arrivalTime})`;

      sanitizedDriver = {
        id: d.id,
        name: d.profile?.full_name || d.full_name || 'Captain',
        phone: d.profile?.phone || d.phone || null,
        photo: d.avatar_url || d.profile?.avatar_url || null,
        rating: d.rating !== null && d.rating !== undefined ? Number(d.rating) : null,
        rating_count: d.rating_count ?? 0,
        totalRides: Number(d.total_rides) || 0,
        vehicle: d.assigned_vehicle ? {
          make: d.assigned_vehicle.make || (d.assigned_vehicle as any).name,
          model: d.assigned_vehicle.model || `(${d.assigned_vehicle.seating_capacity} Seats)`,
          color: d.assigned_vehicle.color || 'Obsidian Black',
          plateNumber: d.assigned_vehicle.plate_number || 'KSA 3312',
          vehicleType: d.assigned_vehicle.vehicle_type,
        } : null,
        location: {
          latitude: driverLat,
          longitude: driverLng,
          heading: d.location?.heading || 0,
        },
      };
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        status: booking.status,
        pickupAddress: booking.pickup_address,
        pickupLatitude: booking.pickup_latitude,
        pickupLongitude: booking.pickup_longitude,
        destinationAddress: booking.destination_address,
        destinationLatitude: booking.destination_latitude,
        destinationLongitude: booking.destination_longitude,
        vehicleType: booking.vehicle_type,
        scheduledAt: booking.scheduled_at,
        estimatedFare: booking.estimated_fare,
        finalFare: booking.final_fare,
      },
      driver: sanitizedDriver,
      etaMinutes,
      etaFormatted,
    });
  } catch (err: any) {
    console.error('Booking detail error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Target status is required.' }, { status: 400 });
    }

    // Resolve booking
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase.from('bookings').select('*, payment:payments(*)');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('booking_reference', id);
    }
    const { data: booking, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    // Server-side validation: if completing ride, verify cash confirmation for Cash on Pickup
    const isTargetingCompletion = status === 'completed' || status === 'trip_completed' || status === 'ride_completed';
    if (isTargetingCompletion) {
      const isExplicitlyOnlineOrCard =
        booking.payment_method === 'online' ||
        booking.payment_method === 'card' ||
        Boolean(booking.payment_screenshot_url);

      const isCashRide = booking.payment_method === 'cash' || !isExplicitlyOnlineOrCard;

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
            },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status,
      updated_at: now,
    };
    if (notes) {
      updatePayload.notes = booking.notes ? `${booking.notes} | ${notes}` : notes;
    }

    const { error: updateErr } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      status,
      updated_at: now,
    });
  } catch (err: any) {
    console.error('Booking update error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
