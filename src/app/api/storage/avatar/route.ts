import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storage/avatar
 * Secure server-side avatar upload endpoint using Supabase Storage (avatars bucket)
 * with automatic fallback to data URL if storage is not provisioned.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = (formData.get('userId') as string) || `driver-${Date.now()}`;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided.' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Please upload JPEG, PNG, or WebP.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image size exceeds 5MB limit. Please choose a smaller photo.' },
        { status: 400 }
      );
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanUserId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const admin = getSupabaseAdmin();

      // Ensure bucket exists or create it
      try {
        const { data: buckets } = await admin.storage.listBuckets();
        const hasBucket = buckets?.some((b) => b.name === 'avatars');
        if (!hasBucket) {
          await admin.storage.createBucket('avatars', { public: true });
        }
      } catch (bucketErr) {
        console.warn('[Avatar Upload] Bucket check warning:', bucketErr);
      }

      const { data: uploadData, error: uploadErr } = await admin.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: urlData } = admin.storage.from('avatars').getPublicUrl(filePath);
        return NextResponse.json({
          success: true,
          url: urlData.publicUrl,
          path: filePath,
          storageType: 'supabase',
        });
      } else {
        console.warn('[Avatar Upload] Supabase storage upload warning:', uploadErr?.message);
      }
    } catch (storageErr) {
      console.warn('[Avatar Upload] Supabase admin storage exception:', storageErr);
    }

    // Fallback: Convert to base64 Data URL so user is NEVER blocked
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json({
      success: true,
      url: dataUrl,
      path: filePath,
      storageType: 'data-url-fallback',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process avatar upload';
    console.error('[POST /api/storage/avatar] Error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
