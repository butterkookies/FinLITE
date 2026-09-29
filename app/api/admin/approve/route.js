import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';
import { createAdminClient } from '@/lib/supabase/server';

const VALID_ROLES = ['treasurer', 'auditor', 'president', 'adviser', 'admin'];

// POST /api/admin/approve
export async function POST(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { requestId, role = 'treasurer' } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const normalizedRole = role.toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json({ error: `Invalid role specified. Allowed: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    const supabase = auth.supabase;

    // 1. Fetch request details
    const { data: request, error: fetchErr } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      return NextResponse.json({ error: 'Registration request not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 2. Update registration_requests status
    const { error: updateErr } = await supabase
      .from('registration_requests')
      .update({
        status: 'approved',
        requested_role: normalizedRole,
        reviewed_at: now,
        reviewed_by: auth.profile?.id || null,
      })
      .eq('id', requestId);

    if (updateErr) {
      console.error('Failed to update registration request:', updateErr);
      return NextResponse.json({ error: 'Failed to update request status in database.' }, { status: 500 });
    }

    // 3. Upsert into profiles table
    const fullName = `${request.first_name || ''} ${request.last_name || ''}`.trim();
    const profileData = {
      full_name: fullName,
      first_name: request.first_name,
      last_name: request.last_name,
      username: request.username,
      email: request.email,
      contact_number: request.contact_number,
      role: normalizedRole,
      status: 'approved',
      auth_provider: request.auth_provider || 'email',
      approved_at: now,
      approved_by: auth.profile?.id || null,
    };

    if (request.google_id) {
      profileData.auth_user_id = request.google_id;
    }
    if (request.avatar_url) {
      profileData.avatar_url = request.avatar_url;
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'email' });

    if (profileErr) {
      console.warn('Profile upsert note (may need migration 006 run):', profileErr.message);
    }

    // 4. Update Supabase Auth app_metadata if admin client available
    const adminClient = createAdminClient();
    if (adminClient && request.google_id) {
      try {
        await adminClient.auth.admin.updateUserById(request.google_id, {
          app_metadata: {
            role: normalizedRole,
            status: 'approved',
          },
        });
      } catch (metaErr) {
        console.warn('Could not update user app_metadata in auth:', metaErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Registration approved successfully for ${fullName} with role '${normalizedRole}'.`,
      user: {
        email: request.email,
        name: fullName,
        role: normalizedRole,
      }
    });
  } catch (err) {
    console.error('Approve API error:', err);
    return NextResponse.json({ error: 'Server error processing approval.' }, { status: 500 });
  }
}
