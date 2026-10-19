import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { LATEST_RELEASE } from '@/lib/config/releases';
import { sendSystemUpdateBroadcastEmail } from '@/lib/email/mailer';

// In-memory set to prevent multiple redundant broadcasts in same server process
const broadcastedVersionsInMemory = new Set();

export async function POST(req) {
  try {
    const adminClient = createAdminClient();
    const supabase = adminClient || (await createClient());

    const { version = LATEST_RELEASE.version, force = false } = await req.json().catch(() => ({}));

    // 1. Check if already broadcasted in memory
    if (!force && broadcastedVersionsInMemory.has(version)) {
      return NextResponse.json({
        success: true,
        broadcasted: false,
        message: `Version ${version} has already been broadcasted.`,
      });
    }

    // 2. Check database app_releases table if available
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

    // 3. Fetch all approved officers with email
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

    // 4. Dispatch release broadcast email
    const result = await sendSystemUpdateBroadcastEmail({
      version,
      title: LATEST_RELEASE.title,
      releaseNotes: LATEST_RELEASE.releaseNotes,
      recipients: uniqueRecipients,
    });

    // 5. Mark version as broadcasted
    broadcastedVersionsInMemory.add(version);

    try {
      await supabase.from('app_releases').insert([{
        version,
        title: LATEST_RELEASE.title,
        release_notes: LATEST_RELEASE.releaseNotes,
      }]);
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
