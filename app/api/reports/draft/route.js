import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function normalizeReportSemesterKey(raw) {
  const sem = String(raw || '1st Semester').trim();
  if (/1st|first/i.test(sem)) return '1ST SEMESTER';
  if (/2nd|second/i.test(sem)) return '2ND SEMESTER';
  if (/midyear|summer/i.test(sem)) return 'SUMMER SEMESTER';
  return sem.toUpperCase().replace(/\bSEM\b/i, 'SEMESTER');
}

function normalizeReportAcademicYearKey(raw) {
  return String(raw || '2025-2026')
    .trim()
    .replace(/[\u2013\u2014]/g, '-');
}

// GET /api/reports/draft?semester=...&academicYear=...
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSemester = (searchParams.get('semester') || '1st Semester').trim();
    const rawAcademicYear = (searchParams.get('academicYear') || '2025-2026').trim();
    const semester = normalizeReportSemesterKey(rawSemester);
    const academicYear = normalizeReportAcademicYearKey(rawAcademicYear);
    const entityKey = `${academicYear}__${semester}`;
    const legacyEntityKey = `${rawAcademicYear}__${rawSemester}`;
    const candidateKeys = entityKey === legacyEntityKey ? [entityKey] : [entityKey, legacyEntityKey];

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    if (!db) {
      return NextResponse.json({ success: true, draft: null });
    }

    const { data, error } = await db
      .from('audit_logs')
      .select('id, user_id, action, entity_id, details, created_at')
      .eq('entity_type', 'liquidation_report')
      .eq('action', 'REPORT_DRAFT_SAVED')
      .in('entity_id', candidateKeys)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ success: true, draft: null });
    }

    return NextResponse.json({
      success: true,
      draft: data.details || null,
      savedAt: data.created_at,
    });
  } catch (err) {
    console.warn('GET /api/reports/draft notice:', err?.message);
    return NextResponse.json({ success: true, draft: null });
  }
}

// POST /api/reports/draft — Persist Liquidation Report draft state & 4-stage pre-print routing state
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const semester = normalizeReportSemesterKey(body.semester || '1st Semester');
    const academicYear = normalizeReportAcademicYearKey(body.academicYear || '2025-2026');
    const entityKey = `${academicYear}__${semester}`;

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    let userId = null;
    let userEmail = null;
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userEmail = user.email?.toLowerCase() || null;
          const { data: profile } = await (db || supabase)
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          userId = profile?.id || null;
        }
      } catch (_) {}
    }

    const now = new Date().toISOString();
    const payload = {
      semester,
      academicYear,
      routingStage: Number(body.routingStage) || 1,
      routingStatus: body.routingStatus || 'DRAFT',
      routingComment: body.routingComment || '',
      routingHistory: Array.isArray(body.routingHistory) ? body.routingHistory : [],
      typography: body.typography || 'calibri',
      draftData: body.draftData || null,
      updatedByEmail: userEmail,
      savedAt: now,
    };

    if (db) {
      const { error } = await db.from('audit_logs').insert([
        {
          user_id: userId,
          action: 'REPORT_DRAFT_SAVED',
          entity_type: 'liquidation_report',
          entity_id: entityKey,
          details: payload,
          created_at: now,
        },
      ]);

      if (error) {
        console.warn('POST /api/reports/draft DB insert warning:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      draft: payload,
      savedAt: now,
    });
  } catch (err) {
    console.error('POST /api/reports/draft error:', err);
    return NextResponse.json({ error: 'Failed to save report draft.' }, { status: 500 });
  }
}
