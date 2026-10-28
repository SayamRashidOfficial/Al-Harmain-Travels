import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * DELETE /api/admin/delete-user
 *
 * Permanently removes a user from:
 *   1. All public.* tables (via admin_delete_user RPC)
 *   2. auth.users (via Supabase Admin API + RPC cascade)
 *
 * Uses a two-step approach for maximum reliability:
 *   Step 1: Call admin_delete_user(uuid) SECURITY DEFINER RPC — clears child records,
 *            NULLs historical FKs, removes profiles and auth.users rows.
 *   Step 2: Fall back to direct Admin API deleteUser() if the RPC did not remove
 *            the auth.users row (e.g. trigger not yet active on some edge).
 *
 * Body: { userId: string }
 * Response: { success: boolean; error?: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'userId is required.' },
        { status: 400 }
      );
    }

    // Validate proper UUID — auth.users only stores real UUIDs
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId.trim()
    );
    if (!isUuid) {
      return NextResponse.json(
        {
          success: false,
          error:
            'userId must be a valid UUID. Locally-created demo IDs are not in auth.users.',
        },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();
    const uid = userId.trim();

    // Check if user is Super Admin
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, is_super_admin')
      .eq('id', uid)
      .maybeSingle();

    if (targetProfile?.is_super_admin === true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Critical Security Protection: The Super Administrator account is permanent and cannot be deleted.',
        },
        { status: 403 }
      );
    }

    // ---- Step 1: Call admin_delete_user RPC for full cascade clean-up ----
    const { data: rpcData, error: rpcError } = await adminClient.rpc(
      'admin_delete_user',
      { target_user_id: uid }
    );

    if (rpcError) {
      console.error('[delete-user] RPC admin_delete_user error:', rpcError);
      // Don't return yet; attempt the direct Auth Admin API as fallback
    } else if (rpcData && typeof rpcData === 'object' && (rpcData as any).success === false) {
      console.error('[delete-user] RPC returned failure:', rpcData);
    }

    // ---- Step 2: Ensure auth.users row is gone via Admin API ----
    // This handles cases where the RPC ran but the auth.users row may still linger
    // or when the service role key is configured for direct API calls.
    const { error: authError } = await adminClient.auth.admin.deleteUser(uid);

    if (authError) {
      const isNotFound =
        authError.message?.toLowerCase().includes('user not found') ||
        authError.message?.toLowerCase().includes('not found') ||
        (authError as any).status === 404;

      if (!isNotFound) {
        // Genuine error — but only fail if the RPC also failed
        if (rpcError) {
          console.error('[delete-user] Both RPC and Auth Admin API failed:', authError);
          return NextResponse.json(
            { success: false, error: authError.message },
            { status: 500 }
          );
        }
        // RPC succeeded — auth row already gone, Auth API "not found" is expected
        console.warn('[delete-user] Auth API error after successful RPC (likely already cleaned up):', authError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error.';
    console.error('[delete-user] Unexpected error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Reject all other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
