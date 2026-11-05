import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/auth/signup
 *
 * Direct customer registration endpoint without mandatory email confirmation.
 * Creates the user in Supabase Auth with email_confirm: true so that GoTrue allows
 * direct password login, but explicitly marks the email as Unverified in user_metadata
 * and public.profiles. No confirmation email is dispatched during registration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fullName, email, phone, password } = body as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Full legal name must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanName = fullName.trim();

    const adminClient = getSupabaseAdmin();

    // 1. Check if user already exists
    try {
      const { data: checkData, error: checkError } = await adminClient.rpc('admin_check_user', {
        lookup_email: cleanEmail,
      });

      if (!checkError && checkData) {
        const res = checkData as {
          exists_in_auth: boolean;
          exists_in_profiles: boolean;
          auth_id: string | null;
        };

        if (res.exists_in_auth || res.exists_in_profiles) {
          return NextResponse.json(
            {
              success: false,
              error: 'An account with this email address already exists. Please sign in instead.',
            },
            { status: 409 }
          );
        }
      }
    } catch (checkErr) {
      console.warn('[signup] admin_check_user check error, continuing with create:', checkErr);
    }

    // 2. Create the user in Supabase Auth with email_confirm: false
    // The user's email remains strictly Unverified (email_confirmed_at: NULL) until they
    // explicitly click the confirmation link in their email inbox.
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: false,
      user_metadata: {
        full_name: cleanName,
        phone: cleanPhone,
        role: 'customer',
        email_verified: false,
      },
    });

    if (createError) {
      console.error('[signup] admin.createUser error:', createError);
      if (
        createError.message.toLowerCase().includes('already registered') ||
        createError.message.toLowerCase().includes('already exists')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'An account with this email address is already registered. Please sign in.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: createError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 3. Upsert profile in public.profiles explicitly ensuring email_verified: false
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      role: 'customer',
      full_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      email_verified: false,
      status: 'active',
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('[signup] profile upsert error:', profileError);
    }

    // Provision customers table entry if not created by trigger
    try {
      await adminClient.from('customers').upsert({
        id: userId,
        preferred_language: 'en',
      });
    } catch {
      // Ignore if trigger already provisioned
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        fullName: cleanName,
        phone: cleanPhone,
        role: 'customer',
        email_verified: false,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error.';
    console.error('[signup] Unexpected error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
