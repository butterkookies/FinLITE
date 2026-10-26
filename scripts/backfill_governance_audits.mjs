/**
 * Backfill historical governance and role events into audit_logs.
 * Ensures that Governance & Roles tab displays real historical audit records.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function backfillGovernance() {
  console.log('--- Backfilling Governance & Roles Audit Logs ---');

  // Find an admin profile to assign as actor (or null)
  const { data: adminProfiles } = await sb.from('profiles').select('id, full_name, email, role').eq('role', 'admin').limit(1);
  const adminActorId = adminProfiles?.[0]?.id || null;

  // 1. Backfill approved and rejected registration_requests
  const { data: requests, error: reqErr } = await sb
    .from('registration_requests')
    .select('*')
    .in('status', ['approved', 'rejected']);

  if (reqErr) {
    console.error('Failed to fetch registration_requests:', reqErr);
  } else {
    console.log(`Found ${requests.length} historical registration requests.`);
    for (const req of requests) {
      // Check if audit log already exists
      const { data: existing } = await sb
        .from('audit_logs')
        .select('id')
        .eq('entity_type', 'registration_requests')
        .eq('entity_id', req.id);

      if (existing && existing.length > 0) {
        continue;
      }

      const isApproved = req.status === 'approved';
      const action = isApproved ? 'REGISTRATION_APPROVED' : 'REGISTRATION_REJECTED';
      const applicantName = `${req.first_name || ''} ${req.last_name || ''}`.trim() || req.username || 'Applicant';

      const auditPayload = {
        user_id: adminActorId,
        action,
        entity_type: 'registration_requests',
        entity_id: req.id,
        created_at: req.reviewed_at || req.updated_at || req.created_at,
        details: {
          applicant_name: applicantName,
          applicant_email: req.email,
          assigned_role: req.requested_role || 'member',
          rejection_reason: req.rejection_reason || null,
          reviewed_by: req.reviewed_by || 'Admin',
          status: req.status,
          backfilled: true,
        },
      };

      const { error: insErr } = await sb.from('audit_logs').insert([auditPayload]);
      if (insErr) {
        if (insErr.code === '23503') {
          await sb.from('audit_logs').insert([{ ...auditPayload, user_id: null }]);
          console.log(`Inserted ${action} for ${req.email} (user_id: null fallback)`);
        } else {
          console.warn(`Error inserting ${action} for ${req.email}:`, insErr.message);
        }
      } else {
        console.log(`Inserted ${action} for ${req.email}`);
      }
    }
  }

  // 2. Backfill signatory rosters by term
  const { data: signatories, error: sigErr } = await sb
    .from('semester_signatories')
    .select('academic_year, semester, role_key, name, position_title, is_active, created_at, updated_at');

  if (sigErr) {
    console.error('Failed to fetch semester_signatories:', sigErr);
  } else if (signatories && signatories.length > 0) {
    // Group signatories by academic_year + semester
    const termGroups = {};
    for (const s of signatories) {
      const termKey = `${s.academic_year} • ${s.semester}`;
      if (!termGroups[termKey]) termGroups[termKey] = [];
      termGroups[termKey].push(s);
    }

    for (const [termKey, items] of Object.entries(termGroups)) {
      const { data: existing } = await sb
        .from('audit_logs')
        .select('id')
        .eq('entity_type', 'semester_signatories')
        .eq('entity_id', termKey);

      if (existing && existing.length > 0) {
        continue;
      }

      const auditPayload = {
        user_id: adminActorId,
        action: 'ROSTER_UPDATE',
        entity_type: 'semester_signatories',
        entity_id: termKey,
        created_at: items[0].updated_at || items[0].created_at || new Date().toISOString(),
        details: {
          academic_year: items[0].academic_year,
          semester: items[0].semester,
          signatory_count: items.length,
          roles: items.map((r) => ({
            role: r.role_key,
            name: r.name,
            title: r.position_title,
            is_active: r.is_active,
          })),
          backfilled: true,
        },
      };

      const { error: insErr } = await sb.from('audit_logs').insert([auditPayload]);
      if (insErr) {
        if (insErr.code === '23503') {
          await sb.from('audit_logs').insert([{ ...auditPayload, user_id: null }]);
          console.log(`Inserted ROSTER_UPDATE for ${termKey} (user_id: null fallback)`);
        } else {
          console.warn(`Error inserting ROSTER_UPDATE for ${termKey}:`, insErr.message);
        }
      } else {
        console.log(`Inserted ROSTER_UPDATE for ${termKey}`);
      }
    }
  }

  // 3. Verify total governance audit logs now
  const { data: govLogs } = await sb
    .from('audit_logs')
    .select('id, action, entity_type, created_at')
    .or('entity_type.in.(profiles,semesters,semester_signatories,registration_requests),action.ilike.%roster%,action.ilike.%role%,action.ilike.%account%,action.ilike.%registration%');

  console.log(`\n Total Governance Audit Logs in DB: ${govLogs ? govLogs.length : 0}`);
}

backfillGovernance();
