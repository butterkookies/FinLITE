import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthMethods } from '@/lib/auth/methods';
import { sendAccountStatusChangedEmail } from '@/lib/email/mailer';

const VALID_ROLES = ['treasurer', 'auditor', 'president', 'vice_president', 'adviser', 'admin'];
const SINGLE_HOLDER_CUSTODIAN_ROLES = ['treasurer', 'auditor'];

// POST /api/admin/approve
export async function POST(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { requestId, role = 'treasurer', replaceExisting = false } = await req.json();

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

    // 1.05 Role Mutual Exclusion Validation (Use Case 2.5.5, p. 27)
    if (SINGLE_HOLDER_CUSTODIAN_ROLES.includes(normalizedRole)) {
      const { data: existingHolders } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status')
        .eq('role', normalizedRole)
        .eq('status', 'approved')
        .neq('email', (request.email || '').toLowerCase());

      if (existingHolders && existingHolders.length > 0 && !replaceExisting) {
        const holder = existingHolders[0];
        return NextResponse.json(
          {
            error: `Role Mutual Exclusion Conflict: Another active officer (${holder.full_name || holder.email}) already holds the ${normalizedRole.toUpperCase()} role. Please suspend or reassign the existing ${normalizedRole} first.`,
            code: 'ROLE_MUTUAL_EXCLUSION_CONFLICT',
            conflictingUser: holder,
          },
          { status: 409 }
        );
      }
    }

    // 1.1 An email/password applicant must have proven they own the inbox.
    // Admins can verify a person, but not an inbox, so this is checked here.
    if ((request.auth_provider || 'email') === 'email') {
      let verified = Boolean(request.email_verified_at);
      const guardClient = createAdminClient();
      if (verified && guardClient && request.google_id) {
        // Cross-check the auth schema so a stale flag can never approve an unverified account.
        try {
          const methods = await getAuthMethods(guardClient, { userId: request.google_id });
          verified = Boolean(methods.found && methods.email_confirmed);
        } catch (lookupErr) {
          console.warn('Approve: email verification lookup note:', lookupErr?.message);
        }
      }
      if (!verified) {
        return NextResponse.json(
          { error: 'This applicant has not verified their email address yet. Ask them to open the verification link we sent, or reject the request.' },
          { status: 409 }
        );
      }
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

    let savedProfileId = null;
    let { data: upsertedProfile, error: profileErr } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'email' })
      .select('id')
      .maybeSingle();

    // If error was caused by full_name being a GENERATED ALWAYS column in PostgreSQL Phase 3
    if (profileErr && (profileErr.message?.includes('generated column') || profileErr.code === '42601')) {
      const sanitizedProfileData = { ...profileData };
      delete sanitizedProfileData.full_name;
      const retry = await supabase
        .from('profiles')
        .upsert(sanitizedProfileData, { onConflict: 'email' })
        .select('id')
        .maybeSingle();
      upsertedProfile = retry.data;
      profileErr = retry.error;
    }

    if (profileErr) {
      console.warn('Profile upsert note (may need migration 006 run):', profileErr.message);
    } else if (upsertedProfile?.id) {
      savedProfileId = upsertedProfile.id;
      // 3.1 Link approved_profile_id back to registration_requests for 3NF relational traceability
      try {
        await supabase
          .from('registration_requests')
          .update({ approved_profile_id: savedProfileId })
          .eq('id', requestId);
      } catch (linkErr) {
        console.warn('Traceability link note:', linkErr?.message);
      }
    }

    // 4. Update Supabase Auth app_metadata (role and status)
    const adminClient = createAdminClient();
    if (adminClient && request.google_id) {
      try {
        // Approval sets role/status only. It never confirms an email: that
        // can only happen when the owner clicks the verification link.
        await adminClient.auth.admin.updateUserById(request.google_id, {
          app_metadata: {
            role: normalizedRole,
            status: 'approved',
          },
        });
      } catch (metaErr) {
        console.warn('Could not update user app_metadata in auth:', metaErr?.message);
      }
    } else if (request.email) {
      try {
        await supabase.rpc('confirm_user_on_approval', { p_email: request.email });
      } catch (rpcErr) {
        console.warn('confirm_user_on_approval RPC note:', rpcErr?.message);
      }
    }

    // Dispatch approval welcome email to user via Gmail SMTP
    if (request.email) {
      sendAccountStatusChangedEmail({
        to: request.email,
        name: fullName || 'Officer',
        changeType: 'APPROVED',
        details: { role: normalizedRole },
      }).catch((emailErr) => console.warn('Approval email notification warning:', emailErr));
    }

    // Record approval event in audit_logs
    try {
      const approveAudit = {
        user_id: auth.profile?.id || null,
        action: 'REGISTRATION_APPROVED',
        entity_type: 'registration_requests',
        entity_id: requestId,
        details: {
          applicant_name: fullName,
          applicant_email: request.email,
          assigned_role: normalizedRole,
          approved_by: auth.user.email,
        },
      };
      const { error: insErr } = await supabase.from('audit_logs').insert([approveAudit]);
      if (insErr && insErr.code === '23503') {
        await supabase.from('audit_logs').insert([{ ...approveAudit, user_id: null }]);
      }
    } catch (auditErr) {
      console.warn('Approval audit log warning:', auditErr?.message);
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
