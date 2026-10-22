import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { calculateDriverEarnings, ELIGIBLE_COMPLETED_STATUSES } from '@/lib/driver-earnings';

// Validation regex for standard UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId');

    if (!driverId || !UUID_REGEX.test(driverId)) {
      return NextResponse.json(
        { success: false, error: 'A valid Driver UUID is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Driver & Profile
    const [driverRes, profileRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('drivers').select('*').eq('id', driverId).maybeSingle(),
      supabaseAdmin.from('profiles').select('*').eq('id', driverId).maybeSingle(),
      supabaseAdmin.from('system_settings').select('*').eq('id', 'current').maybeSingle(),
    ]);

    if (!driverRes.data) {
      return NextResponse.json(
        { success: false, error: 'Driver record not found.' },
        { status: 404 }
      );
    }

    const driver = driverRes.data;
    const profile = profileRes.data;
    const settings = settingsRes.data;
    const currency = settings?.currency || 'SAR';

    // 2. Fetch all eligible completed bookings for this driver
    const { data: bookingsData, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('assigned_driver_id', driverId)
      .in('status', ELIGIBLE_COMPLETED_STATUSES)
      .order('created_at', { ascending: false });

    if (bookingsErr) {
      console.error('Error fetching driver bookings:', bookingsErr);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve completed bookings.' },
        { status: 500 }
      );
    }

    const bookings = bookingsData || [];
    const bookingIds = bookings.map((b) => b.id).filter(Boolean);

    // 3. Fetch related payments and additional charges for these bookings
    let payments: any[] = [];
    let additionalCharges: any[] = [];

    if (bookingIds.length > 0) {
      const [paymentsRes, chargesRes] = await Promise.all([
        supabaseAdmin.from('payments').select('*').in('booking_id', bookingIds),
        supabaseAdmin.from('additional_charges').select('*').in('booking_id', bookingIds),
      ]);

      payments = paymentsRes.data || [];
      additionalCharges = chargesRes.data || [];
    }

    // Attach payments to bookings for enriched context
    const enrichedBookings = bookings.map((b) => {
      const pmt = payments.find((p) => p.booking_id === b.id);
      return {
        ...b,
        payment: pmt || null,
        payment_method: pmt?.method || (b.payment_screenshot_url ? 'online' : 'cash'),
      };
    });

    // 4. Fetch all driver settlements
    const { data: settlementsData, error: settlementsErr } = await supabaseAdmin
      .from('driver_settlements')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (settlementsErr) {
      console.warn('Error fetching driver settlements:', settlementsErr);
    }

    const settlements = settlementsData || [];

    // 5. Authoritative Server-side Calculations
    const commissionRate = Number((driver as any)?.commission_rate || 0);

    const { summary, transactions } = calculateDriverEarnings({
      driverId,
      bookings: enrichedBookings,
      settlements,
      additionalCharges,
      commissionRate,
      currency,
    });

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        full_name: profile?.full_name || 'Captain',
        phone: profile?.phone || driver.phone || null,
        avatar_url: profile?.avatar_url || null,
        status: driver.status,
        license_number: driver.license_number,
      },
      summary,
      transactions,
    });
  } catch (err: any) {
    console.error('Error in /api/driver/earnings:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error calculating driver earnings.' },
      { status: 500 }
    );
  }
}
