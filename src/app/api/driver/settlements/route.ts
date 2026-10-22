import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId');

    let query = supabaseAdmin.from('driver_settlements').select('*').order('created_at', { ascending: false });

    if (driverId) {
      if (!UUID_REGEX.test(driverId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid Driver UUID' },
          { status: 400 }
        );
      }
      query = query.eq('driver_id', driverId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, settlements: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));
    const {
      driver_id,
      amount,
      payment_method = 'bank_transfer',
      bank_name,
      transaction_number,
      notes,
      processed_by,
    } = body;

    if (!driver_id || !UUID_REGEX.test(driver_id)) {
      return NextResponse.json(
        { success: false, error: 'A valid Driver UUID is required.' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid settlement amount greater than 0 is required.' },
        { status: 400 }
      );
    }

    // Verify driver exists
    const { data: driver, error: driverErr } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('id', driver_id)
      .maybeSingle();

    if (driverErr || !driver) {
      return NextResponse.json(
        { success: false, error: 'Target chauffeur not found.' },
        { status: 404 }
      );
    }

    // Generate unique settlement reference: SETTLE-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const settlement_reference = `SETTLE-${dateStr}-${randPart}`;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('driver_settlements')
      .insert({
        driver_id,
        amount: numericAmount,
        settlement_reference,
        payment_method: payment_method === 'cash' ? 'cash' : 'bank_transfer',
        status: 'completed',
        bank_name: bank_name || (payment_method === 'bank_transfer' ? 'Al Rajhi Bank' : null),
        transaction_number: transaction_number || `TXN-${Date.now().toString().slice(-6)}`,
        notes: notes || 'Driver earnings settlement payout',
        processed_by: processed_by && UUID_REGEX.test(processed_by) ? processed_by : null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Error inserting driver settlement:', insertErr);
      return NextResponse.json(
        { success: false, error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settlement: inserted,
      message: `Settlement ${settlement_reference} of SAR ${numericAmount.toFixed(2)} recorded successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error recording settlement.' },
      { status: 500 }
    );
  }
}
