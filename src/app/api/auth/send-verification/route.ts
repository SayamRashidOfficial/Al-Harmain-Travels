import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

// In-memory rate-limiting map: email -> timestamp of last dispatch
const emailRateLimitMap = new Map<string, number>();

/**
 * POST /api/auth/send-verification
 *
 * Sends a real email verification link to the customer's registered email address using Supabase Auth.
 * 1. Checks 60s cooldown to prevent repeated requests and avoid rate limits.
 * 2. Prepares auth.users record via public.prepare_user_for_email_verification (sets email_confirmed_at = NULL).
 * 3. Triggers supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } }) to deliver the real email.
 * 4. Returns appropriate success or error response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid registered email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();

    // 1. Enforce cooldown (60 seconds)
    const lastSentAt = emailRateLimitMap.get(cleanEmail);
    if (lastSentAt) {
      const elapsed = (now - lastSentAt) / 1000;
      if (elapsed < 60) {
        const remaining = Math.ceil(60 - elapsed);
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remaining} seconds before requesting another verification email.`,
            remainingSeconds: remaining,
          },
          { status: 429 }
        );
      }
    }

    const adminClient = getSupabaseAdmin();

    // 2. Fetch user profile from database
    const { data: profile, error: profError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profError || !profile) {
      return NextResponse.json(
        { success: false, error: 'No account registered with this email address.' },
        { status: 404 }
      );
    }

    // 3. Supabase Auth is the Single Source of Truth: check email_confirmed_at
    const { data: authUserData } = await adminClient.auth.admin.getUserById(profile.id);
    const authUser = authUserData?.user;
    const isActuallyConfirmed = Boolean(
      authUser?.email_confirmed_at &&
      typeof authUser.email_confirmed_at === 'string' &&
      authUser.email_confirmed_at.trim().length > 0 &&
      !isNaN(Date.parse(authUser.email_confirmed_at))
    );

    if (isActuallyConfirmed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your email address is already verified!',
          alreadyVerified: true,
        },
        { status: 400 }
      );
    }

    // 4. Determine redirect URL for production and local environments
    const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    const siteUrl = !isLocal && process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : isLocal
      ? `http://${hostHeader}`
      : 'https://alharmaintravels.com';

    const emailRedirectTo = `${siteUrl}/callback?action=verify_email`;

    // 5. Reset email_confirmed_at in auth.users so Supabase GoTrue sends the verification email
    try {
      await adminClient.rpc('prepare_user_for_email_verification', {
        target_user_id: profile.id,
      });
    } catch (rpcErr) {
      console.warn('[send-verification] RPC prepare_user_for_email_verification warning:', rpcErr);
    }

    // 6. Dispatch the actual verification email via Supabase Auth resend
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: resendError } = await authClient.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (resendError) {
      console.error('[send-verification] Supabase resend error:', resendError);
      const isRateLimit =
        resendError.status === 429 ||
        resendError.message?.toLowerCase().includes('rate limit') ||
        resendError.message?.toLowerCase().includes('after');

      if (isRateLimit) {
        return NextResponse.json(
          {
            success: false,
            error: 'For security purposes, you can only request this once per minute. Please check your inbox or wait 60 seconds.',
            remainingSeconds: 60,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: resendError.message || 'Failed to dispatch confirmation email.' },
        { status: 400 }
      );
    }

    // Record rate limit timestamp
    emailRateLimitMap.set(cleanEmail, now);

    return NextResponse.json({
      success: true,
      message: 'A verification email has been sent. Please check your inbox and click the confirmation link to verify your email address.',
      email: cleanEmail,
      cooldownSeconds: 60,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send verification email.';
    console.error('[send-verification] Unexpected error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
