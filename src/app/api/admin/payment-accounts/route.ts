import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PaymentAccount, PaymentAccountMethodType } from '@/types';
import {
  normalizeIBAN,
  isValidSaudiIBAN,
  normalizePhoneNumber,
  isValidMobileWalletNumber,
} from '@/lib/payment-accounts';

/**
 * Verify if request is from an authenticated admin
 */
async function verifyAdminAuth(req: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      // In dev environment or internal call with service header, allow check
      const adminSecret = req.headers.get('x-admin-secret');
      if (adminSecret && adminSecret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { authorized: true };
      }

      // Check cookies for access token
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i);
      if (match) {
        try {
          const cookieVal = decodeURIComponent(match[1]);
          const parsed = JSON.parse(cookieVal);
          const cookieToken = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
          if (cookieToken) {
            const { data: userData } = await supabaseAdmin.auth.getUser(cookieToken);
            if (userData?.user?.id) {
              const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', userData.user.id)
                .maybeSingle();
              if (profile?.role === 'admin') {
                return { authorized: true };
              }
            }
          }
        } catch {}
      }

      // Allow local development environment if no session is active
      if (process.env.NODE_ENV !== 'production') {
        return { authorized: true };
      }

      return { authorized: false, error: 'Authorization token required.' };
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      if (process.env.NODE_ENV !== 'production') {
        return { authorized: true };
      }
      return { authorized: false, error: 'Invalid or expired session token.' };
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== 'admin') {
      if (process.env.NODE_ENV !== 'production') {
        return { authorized: true };
      }
      return { authorized: false, error: 'Forbidden: Admin access required.' };
    }

    return { authorized: true };
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      return { authorized: true };
    }
    return { authorized: false, error: err.message || 'Authentication check failed.' };
  }
}

/**
 * GET /api/admin/payment-accounts
 * Fetch payment accounts. Supports query param `activeOnly=true`.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabaseAdmin
      .from('payment_accounts')
      .select('*')
      .order('is_default', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payment accounts:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, accounts: data || [] });
  } catch (err: any) {
    console.error('Server error in GET /api/admin/payment-accounts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/payment-accounts
 * Add a new payment account. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyAdminAuth(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      payment_method_type,
      provider_name,
      account_holder_name,
      account_number,
      iban,
      wallet_number,
      instructions,
      is_active = true,
      is_default = false,
      display_order = 0,
    } = body;

    // 1. Validate payment_method_type
    const validTypes: PaymentAccountMethodType[] = ['bank_transfer', 'stc_pay', 'urpay', 'other'];
    if (!validTypes.includes(payment_method_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method type. Must be bank_transfer, stc_pay, urpay, or other.' },
        { status: 400 }
      );
    }

    // 2. Validate provider_name and account_holder_name
    if (!provider_name || typeof provider_name !== 'string' || !provider_name.trim()) {
      return NextResponse.json({ success: false, error: 'Provider or Bank Name is required.' }, { status: 400 });
    }
    if (!account_holder_name || typeof account_holder_name !== 'string' || !account_holder_name.trim()) {
      return NextResponse.json({ success: false, error: 'Account Holder / Business Name is required.' }, { status: 400 });
    }

    // 3. Conditional validations
    let cleanedIban: string | null = null;
    let cleanedWallet: string | null = null;
    let cleanedAccNumber: string | null = account_number ? String(account_number).trim() : null;

    if (payment_method_type === 'bank_transfer') {
      if (!cleanedAccNumber && (!iban || !String(iban).trim())) {
        return NextResponse.json(
          { success: false, error: 'Either Account Number or IBAN is required for bank transfer.' },
          { status: 400 }
        );
      }
      if (iban && String(iban).trim()) {
        const normalized = normalizeIBAN(String(iban));
        if (!isValidSaudiIBAN(normalized)) {
          return NextResponse.json(
            { success: false, error: 'Invalid Saudi IBAN format. Must start with SA followed by 22 characters.' },
            { status: 400 }
          );
        }
        cleanedIban = normalized;
      }
    } else if (payment_method_type === 'stc_pay' || payment_method_type === 'urpay') {
      if (!wallet_number || !String(wallet_number).trim()) {
        return NextResponse.json(
          { success: false, error: `Mobile Wallet Number is required for ${provider_name || payment_method_type}.` },
          { status: 400 }
        );
      }
      const normalizedPhone = normalizePhoneNumber(String(wallet_number));
      if (!isValidMobileWalletNumber(normalizedPhone)) {
        return NextResponse.json(
          { success: false, error: 'Invalid mobile wallet phone number format. Please enter a valid Saudi phone number (e.g. +9665... or 05...).' },
          { status: 400 }
        );
      }
      cleanedWallet = normalizedPhone;
    } else {
      // 'other'
      if (!cleanedAccNumber && (!iban || !String(iban).trim()) && (!wallet_number || !String(wallet_number).trim())) {
        return NextResponse.json(
          { success: false, error: 'Please provide at least an Account Number, IBAN, or Wallet Number.' },
          { status: 400 }
        );
      }
      if (iban && String(iban).trim()) {
        cleanedIban = normalizeIBAN(String(iban));
      }
      if (wallet_number && String(wallet_number).trim()) {
        cleanedWallet = normalizePhoneNumber(String(wallet_number));
      }
    }

    // If setting as default, DB trigger handle_payment_account_default resets any other default
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('payment_accounts')
      .insert({
        payment_method_type,
        provider_name: provider_name.trim(),
        account_holder_name: account_holder_name.trim(),
        account_number: cleanedAccNumber,
        iban: cleanedIban,
        wallet_number: cleanedWallet,
        instructions: instructions ? String(instructions).trim() : null,
        is_active: Boolean(is_active),
        is_default: Boolean(is_default),
        display_order: Number(display_order) || 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment account:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, account: inserted });
  } catch (err: any) {
    console.error('Server error in POST /api/admin/payment-accounts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/payment-accounts
 * Update existing payment account. Admin only.
 */
export async function PUT(req: NextRequest) {
  try {
    const authCheck = await verifyAdminAuth(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      id,
      payment_method_type,
      provider_name,
      account_holder_name,
      account_number,
      iban,
      wallet_number,
      instructions,
      is_active,
      is_default,
      display_order,
    } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Account ID is required.' }, { status: 400 });
    }

    // Check if account exists
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('payment_accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existErr || !existing) {
      return NextResponse.json({ success: false, error: 'Payment account not found.' }, { status: 404 });
    }

    const updates: Partial<PaymentAccount> = {};

    if (payment_method_type !== undefined) {
      const validTypes: PaymentAccountMethodType[] = ['bank_transfer', 'stc_pay', 'urpay', 'other'];
      if (!validTypes.includes(payment_method_type)) {
        return NextResponse.json({ success: false, error: 'Invalid payment method type.' }, { status: 400 });
      }
      updates.payment_method_type = payment_method_type;
    }

    if (provider_name !== undefined) {
      if (!provider_name.trim()) {
        return NextResponse.json({ success: false, error: 'Provider or Bank Name cannot be empty.' }, { status: 400 });
      }
      updates.provider_name = provider_name.trim();
    }

    if (account_holder_name !== undefined) {
      if (!account_holder_name.trim()) {
        return NextResponse.json({ success: false, error: 'Account Holder Name cannot be empty.' }, { status: 400 });
      }
      updates.account_holder_name = account_holder_name.trim();
    }

    const effectiveType = updates.payment_method_type || existing.payment_method_type;

    if (account_number !== undefined) {
      updates.account_number = account_number ? String(account_number).trim() : null;
    }

    if (iban !== undefined) {
      if (iban && String(iban).trim()) {
        const normalized = normalizeIBAN(String(iban));
        if (effectiveType === 'bank_transfer' && !isValidSaudiIBAN(normalized)) {
          return NextResponse.json({ success: false, error: 'Invalid Saudi IBAN format.' }, { status: 400 });
        }
        updates.iban = normalized;
      } else {
        updates.iban = null;
      }
    }

    if (wallet_number !== undefined) {
      if (wallet_number && String(wallet_number).trim()) {
        const normalizedPhone = normalizePhoneNumber(String(wallet_number));
        if ((effectiveType === 'stc_pay' || effectiveType === 'urpay') && !isValidMobileWalletNumber(normalizedPhone)) {
          return NextResponse.json({ success: false, error: 'Invalid mobile wallet phone number format.' }, { status: 400 });
        }
        updates.wallet_number = normalizedPhone;
      } else {
        updates.wallet_number = null;
      }
    }

    if (instructions !== undefined) {
      updates.instructions = instructions ? String(instructions).trim() : null;
    }

    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }

    if (is_default !== undefined) {
      updates.is_default = Boolean(is_default);
    }

    if (display_order !== undefined) {
      updates.display_order = Number(display_order) || 0;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('payment_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment account:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, account: updated });
  } catch (err: any) {
    console.error('Server error in PUT /api/admin/payment-accounts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/payment-accounts
 * Permanently remove payment account. Admin only.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await verifyAdminAuth(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: authCheck.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Account ID is required.' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('payment_accounts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting payment account:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err: any) {
    console.error('Server error in DELETE /api/admin/payment-accounts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
