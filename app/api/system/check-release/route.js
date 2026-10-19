import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth/admin-check';
import { LATEST_RELEASE } from '@/lib/config/releases';
import { sendSystemUpdateBroadcastEmail } from '@/lib/email/mailer';

// In-memory set to prevent multiple redundant broadcasts in same server process
const broadcastedVersionsInMemory = new Set();

/**
 * GET /api/system/check-release
 * Safe endpoint allowing clients to inspect the current active release info and broadcast status.
 */
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const supabase = adminClient || (await createClient());

    let isBroadcasted = broadcastedVersionsInMemory.has(LATEST_RELEASE.version);
    let broadcastedAt = null;

    if (supabase) {
      try {
        const { data: existingRelease } = await supabase
          .from('app_releases')
          .select('version, broadcasted_at')
          .eq('version', LATEST_RELEASE.version)
          .maybeSingle();

        if (existingRelease) {
          isBroadcasted = true;
          broadcastedAt = existingRelease.broadcasted_at;
          broadcastedVersionsInMemory.add(LATEST_RELEASE.version);
        }
      } catch (_) {
        // app_releases table might not exist yet
      }
    }

    return NextResponse.json({
      success: true,
      release: {
        version: LATEST_RELEASE.version,
        title: LATEST_RELEASE.title,
        releaseNotes: LATEST_RELEASE.releaseNotes,
      },
      broadcasted: isBroadcasted,
      broadcastedAt,
    });
  } catch (err) {
    console.error('System release info GET error:', err);
    return NextResponse.json({
      success: true,
      release: LATEST_RELEASE,
      broadcasted: false,
    });
  }
}

/**
 * POST /api/system/check-release
 * Protected endpoint strictly restricted to administrators for triggering system-wide release broadcasts.
 */
export async function POST(req) {
  try {
    // 1. Enforce admin privileges
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const adminClient = createAdminClient();
    const supabase = adminClient || auth.supabase || (await createClient());

    const { version = LATEST_RELEASE.version, force = false } = await req.json().catch(() => ({}));

    // 2. Check if already broadcasted in memory
    if (!force && broadcastedVersionsInMemory.has(version)) {
      return NextResponse.json({
        success: true,
        broadcasted: false,
        message: `Version ${version} has already been broadcasted.`,
      });
    }

    // 3. Check database app_releases table if available
    try {
      const { data: existingRelease } = await supabase
        .from('app_releases')
        .select('version')
        .eq('version', version)
        .maybeSingle();

      if (!force && existingRelease) {
        broadcastedVersionsInMemory.add(version);
        return NextResponse.json({
          success: true,
          broadcasted: false,
          message: `Version ${version} was already broadcasted previously.`,
        });
      }
    } catch (_) {
      // app_releases table might not exist yet, fallback to memory
    }

    // 4. Fetch all approved officers with email
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('email, status')
      .eq('status', 'approved');

    if (error) {
      console.warn('Error fetching profiles for release broadcast:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recipients = (profiles || [])
      .map((p) => p.email?.trim().toLowerCase())
      .filter((e) => e && e.includes('@'));

    const uniqueRecipients = Array.from(new Set(recipients));

    if (uniqueRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        broadcasted: false,
        message: 'No registered recipient emails found.',
      });
    }

    // 5. Dispatch release broadcast email
    const result = await sendSystemUpdateBroadcastEmail({
      version,
      title: LATEST_RELEASE.title,
      releaseNotes: LATEST_RELEASE.releaseNotes,
      recipients: uniqueRecipients,
    });

    // 6. Mark version as broadcasted
    broadcastedVersionsInMemory.add(version);

    try {
      let broadcasterProfileId = auth.profile?.id || null;
      if (!broadcasterProfileId && auth.user?.id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id')
          .or(`auth_user_id.eq.${auth.user.id},email.eq.${(auth.user.email || '').trim().toLowerCase()}`)
          .maybeSingle();
        broadcasterProfileId = p?.id || null;
      }

      await supabase.from('app_releases').upsert([{
        version,
        title: LATEST_RELEASE.title,
        release_notes: LATEST_RELEASE.releaseNotes,
        broadcasted_at: new Date().toISOString(),
        broadcasted_by: broadcasterProfileId,
      }], { onConflict: 'version' });
    } catch (_) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      broadcasted: true,
      version,
      recipientCount: uniqueRecipients.length,
      message: `System update broadcast successfully sent to ${uniqueRecipients.length} user(s).`,
      details: result,
    });
  } catch (err) {
    console.error('System release broadcast API error:', err);
    return NextResponse.json({ error: 'Server error broadcasting system release update.' }, { status: 500 });
  }
}
