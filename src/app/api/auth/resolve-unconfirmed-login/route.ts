import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/resolve-unconfirmed-login
 *
 * Allows unverified customer accounts to sign in with their password without
 * prematurely marking their email address as confirmed.
 *
 * If the user's email is not confirmed, GoTrue returns "Email not confirmed".
 * This endpoint:
 * 1. Checks that the user exists and records their genuine confirmation status.
 * 2. If password is provided, validates credentials and acquires a session.
 * 3. Immediately restores email_confirmed_at to NULL so the customer remains strictly Unverified.
 * 4. Returns the authentic session for the client to set via supabase.auth.setSession().
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body as { email?: string; password?: string };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminClient = getSupabaseAdmin();

    // Check user existence
    const { data: users, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ success: false, error: listErr.message }, { status: 500 });
    }

    const targetUser = users.users.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 404 });
    }

    const wasOriginallyConfirmed = Boolean(targetUser.email_confirmed_at);

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required for authentication.' },
        { status: 400 }
      );
    }

    // Create an isolated auth client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Temporarily allow password check
    if (!wasOriginallyConfirmed) {
      await adminClient.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });
    }

    // Authenticate with password
    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    // CRITICAL: If the user was not originally confirmed, IMMEDIATELY reset email_confirmed_at to NULL
    // regardless of whether the password succeeded or failed.
    if (!wasOriginallyConfirmed) {
      try {
        await adminClient.rpc('prepare_user_for_email_verification', {
          target_user_id: targetUser.id,
        });
      } catch (rpcErr) {
        console.error('[resolve-unconfirmed-login] Failed to reset email_confirmed_at:', rpcErr);
      }
    }

    if (signInErr || !signInData.session) {
      return NextResponse.json(
        { success: false, error: signInErr?.message || 'Invalid login credentials.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: signInData.session,
      isEmailVerified: wasOriginallyConfirmed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
