import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';

// Standard 8 institutional roles for prefilling/initializing any semester
const STANDARD_ROLES_TEMPLATE = [
  { role_key: 'president', position_title: 'LITE President', category: 'OFFICER', sort_order: 1, default_name: 'GERONIMO, ANDREI JOHN P.' },
  { role_key: 'vice_president', position_title: 'LITE Vice President', category: 'OFFICER', sort_order: 2, default_name: 'BAJAMUNDE, JHELLIAM T.' },
  { role_key: 'treasurer', position_title: 'LITE Treasurer', category: 'OFFICER', sort_order: 3, default_name: 'CABANAG, ROSE MARIELLE P.' },
  { role_key: 'auditor', position_title: 'LITE Auditor', category: 'OFFICER', sort_order: 4, default_name: 'SARA, RISHAME P.' },
  { role_key: 'adviser1', position_title: 'LITE Club Adviser', category: 'ADVISER', sort_order: 5, default_name: 'MS. KIMBERLY DAWN JATULAN' },
  { role_key: 'adviser2', position_title: 'LITE Club Adviser', category: 'ADVISER', sort_order: 6, default_name: 'MS. KRIZIA MAE GENOVIA' },
  { role_key: 'director', position_title: 'Program Director, BSIT', category: 'ADMIN', sort_order: 7, default_name: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT' },
  { role_key: 'dean', position_title: 'Dean, College of Computer Studies', category: 'ADMIN', sort_order: 8, default_name: 'DR. EMRAIDA MARIE M. MANUCOM' },
];

// GET /api/admin/signatories?academic_year=...&semester=...
export async function GET(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get('academic_year');
    const semester = searchParams.get('semester');

    const supabase = auth.supabase;

    // 1. Fetch available semesters list for the dropdown selector
    const { data: semestersList, error: semError } = await supabase
      .from('semesters')
      .select('id, academic_year, semester, label, is_active')
      .order('academic_year', { ascending: false });

    if (semError) {
      console.error('Error fetching semesters in signatories API:', semError);
    }

    // Determine target term (use provided or fallback to active semester or first registered)
    const activeSem = (semestersList || []).find((s) => s.is_active) || (semestersList || [])[0];
    const targetAY = academicYear || activeSem?.academic_year || '2026-2027';
    const targetSem = semester || activeSem?.semester || '1st Sem';

    // 2. Query signatories for the target term
    const { data: signatories, error: sigError } = await supabase
      .from('semester_signatories')
      .select('*')
      .eq('academic_year', targetAY)
      .eq('semester', targetSem)
      .order('sort_order', { ascending: true });

    if (sigError) {
      console.error('Error querying semester_signatories:', sigError);
      return NextResponse.json({ error: 'Failed to retrieve signatories.' }, { status: 500 });
    }

    // Guarantee that standard institutional positions (President, VP, Treasurer, Auditor,
    // Advisers, Program Director, Dean) are always present for the term, utilizing DB values
    // if saved, or institutional template defaults if not yet individually configured.
    const effectiveSignatories = STANDARD_ROLES_TEMPLATE.map((tpl) => {
      const existing = (signatories || []).find((s) => s.role_key === tpl.role_key);
      if (existing) return existing;
      return {
        academic_year: targetAY,
        semester: targetSem,
        role_key: tpl.role_key,
        name: tpl.default_name || '',
        position_title: tpl.position_title,
        category: tpl.category,
        sort_order: tpl.sort_order,
        is_active: true,
      };
    });

    // Include any custom roles that might exist in DB outside the standard 8
    const standardKeys = new Set(STANDARD_ROLES_TEMPLATE.map((t) => t.role_key));
    const extraSignatories = (signatories || []).filter((s) => !standardKeys.has(s.role_key));
    const combinedSignatories = [...effectiveSignatories, ...extraSignatories].sort(
      (a, b) => (a.sort_order || 99) - (b.sort_order || 99)
    );

    return NextResponse.json({
      success: true,
      academic_year: targetAY,
      semester: targetSem,
      signatories: combinedSignatories,
      semesters: semestersList || [],
      template: STANDARD_ROLES_TEMPLATE,
    });
  } catch (err) {
    console.error('GET /api/admin/signatories unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST /api/admin/signatories — Upsert batch of signatories for a semester
export async function POST(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { academic_year, semester, signatories } = body;

    if (!academic_year || !semester || !Array.isArray(signatories) || signatories.length === 0) {
      return NextResponse.json(
        { error: 'Missing academic_year, semester, or valid signatories array.' },
        { status: 400 }
      );
    }

    const supabase = auth.supabase;

    // Sanitize and format records
    const records = signatories.map((s, idx) => ({
      academic_year,
      semester,
      role_key: (s.role_key || '').trim().toLowerCase(),
      name: (s.name || '').trim().toUpperCase(),
      position_title: (s.position_title || '').trim(),
      category: ['OFFICER', 'ADVISER', 'ADMIN'].includes((s.category || '').toUpperCase())
        ? s.category.toUpperCase()
        : 'OFFICER',
      sort_order: typeof s.sort_order === 'number' ? s.sort_order : idx + 1,
      is_active: s.is_active !== undefined ? Boolean(s.is_active) : true,
      updated_at: new Date().toISOString(),
    }));

    // Ensure all have a role_key and name
    for (const rec of records) {
      if (!rec.role_key) {
        return NextResponse.json({ error: 'Each signatory must have a valid role_key.' }, { status: 400 });
      }
      if (!rec.name) {
        return NextResponse.json(
          { error: `Full name is required for role: ${rec.position_title || rec.role_key}.` },
          { status: 400 }
        );
      }
    }

    // Upsert into semester_signatories
    const { data: upserted, error: upsertError } = await supabase
      .from('semester_signatories')
      .upsert(records, { onConflict: 'academic_year,semester,role_key' })
      .select();

    if (upsertError) {
      console.error('Error upserting semester_signatories:', upsertError);
      return NextResponse.json(
        { error: `Failed to save signatories: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // Write audit trail entry
    try {
      const rosterAudit = {
        user_id: auth.profile?.id || null,
        action: 'ROSTER_UPDATE',
        entity_type: 'semester_signatories',
        entity_id: `${academic_year} • ${semester}`,
        details: {
          academic_year,
          semester,
          signatory_count: records.length,
          roles: records.map((r) => ({
            role: r.role_key,
            name: r.name,
            title: r.position_title,
            is_active: r.is_active,
          })),
          updated_by: auth.user.email,
        },
      };
      const { error: insErr } = await supabase.from('audit_logs').insert([rosterAudit]);
      if (insErr && insErr.code === '23503') {
        await supabase.from('audit_logs').insert([{ ...rosterAudit, user_id: null }]);
      }
    } catch (auditErr) {
      console.warn('Audit logging error for ROSTER_UPDATE (non-fatal):', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${records.length} signatories for ${academic_year} ${semester}.`,
      signatories: upserted || records,
    });
  } catch (err) {
    console.error('POST /api/admin/signatories unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error while saving signatories.' }, { status: 500 });
  }
}
