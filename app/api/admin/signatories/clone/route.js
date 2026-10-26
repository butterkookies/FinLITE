import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';

// POST /api/admin/signatories/clone — Clone signatories from one term to another
export async function POST(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { from_academic_year, from_semester, to_academic_year, to_semester } = body;

    if (!from_academic_year || !from_semester || !to_academic_year || !to_semester) {
      return NextResponse.json(
        { error: 'Source and target academic year and semester are all required.' },
        { status: 400 }
      );
    }

    if (from_academic_year === to_academic_year && from_semester === to_semester) {
      return NextResponse.json(
        { error: 'Source and target semesters must be different.' },
        { status: 400 }
      );
    }

    const supabase = auth.supabase;

    // 1. Fetch source signatories
    const { data: sourceRecords, error: fetchErr } = await supabase
      .from('semester_signatories')
      .select('role_key, name, position_title, category, sort_order, is_active')
      .eq('academic_year', from_academic_year)
      .eq('semester', from_semester)
      .order('sort_order', { ascending: true });

    if (fetchErr) {
      console.error('Error fetching source signatories for clone:', fetchErr);
      return NextResponse.json({ error: 'Failed to read source signatories.' }, { status: 500 });
    }

    if (!sourceRecords || sourceRecords.length === 0) {
      return NextResponse.json(
        { error: `No signatories found for source term: ${from_academic_year} ${from_semester}.` },
        { status: 404 }
      );
    }

    // 2. Map to target term
    const targetRecords = sourceRecords.map((r) => ({
      academic_year: to_academic_year,
      semester: to_semester,
      role_key: r.role_key,
      name: r.name,
      position_title: r.position_title,
      category: r.category,
      sort_order: r.sort_order,
      is_active: r.is_active,
      updated_at: new Date().toISOString(),
    }));

    // 3. Upsert into target semester
    const { data: upserted, error: upsertErr } = await supabase
      .from('semester_signatories')
      .upsert(targetRecords, { onConflict: 'academic_year,semester,role_key' })
      .select();

    if (upsertErr) {
      console.error('Error upserting cloned signatories:', upsertErr);
      return NextResponse.json(
        { error: `Failed to copy signatories: ${upsertErr.message}` },
        { status: 500 }
      );
    }

    // 4. Log audit trail
    try {
      const cloneAudit = {
        user_id: auth.profile?.id || null,
        action: 'ROSTER_CLONE',
        entity_type: 'semester_signatories',
        entity_id: `${to_academic_year} • ${to_semester}`,
        details: {
          from_term: `${from_academic_year} ${from_semester}`,
          to_term: `${to_academic_year} ${to_semester}`,
          copied_count: targetRecords.length,
          updated_by: auth.user.email,
        },
      };
      const { error: insErr } = await supabase.from('audit_logs').insert([cloneAudit]);
      if (insErr && insErr.code === '23503') {
        await supabase.from('audit_logs').insert([{ ...cloneAudit, user_id: null }]);
      }
    } catch (auditErr) {
      console.warn('Audit logging error for ROSTER_CLONE (non-fatal):', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cloned ${targetRecords.length} signatories from ${from_academic_year} ${from_semester} to ${to_academic_year} ${to_semester}.`,
      signatories: upserted || targetRecords,
    });
  } catch (err) {
    console.error('POST /api/admin/signatories/clone unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error during clone operation.' }, { status: 500 });
  }
}
