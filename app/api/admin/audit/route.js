import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';

// GET /api/admin/audit — Query telemetry and access logs with categorical filters
export async function GET(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get('filter') || 'all').toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 250);
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const supabase = auth.supabase;

    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        details,
        created_at,
        profiles (
          id,
          full_name,
          first_name,
          last_name,
          email,
          role,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply categorical filters
    if (filter === 'sessions') {
      query = query.or('action.eq.AUTH_LOGIN,action.eq.AUTH_LOGOUT,entity_type.eq.auth_session');
    } else if (filter === 'financial') {
      query = query.in('entity_type', ['transactions', 'cash_reconciliations', 'shortages_abono', 'reports', 'categories', 'transaction_comments']);
    } else if (filter === 'governance') {
      query = query.or('action.eq.ROLE_UPDATE,action.eq.STATUS_UPDATE,action.eq.ACCOUNT_DELETED,action.eq.USER_APPROVED,action.eq.USER_REJECTED,entity_type.eq.profiles,entity_type.eq.registration_requests,entity_type.eq.semesters');
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Audit logs query error:', error);
      return NextResponse.json({ error: 'Failed to retrieve activity logs.' }, { status: 500 });
    }

    // Normalize entries
    let normalized = (logs || []).map((row) => {
      const actorName = row.profiles?.full_name || 
        (row.profiles?.first_name ? `${row.profiles.first_name} ${row.profiles.last_name || ''}`.trim() : null) || 
        row.details?.email || 
        'System';
      const actorEmail = row.profiles?.email || row.details?.email || null;
      const actorRole = row.profiles?.role || row.details?.role || 'system';

      return {
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        details: row.details || {},
        created_at: row.created_at,
        actor_name: actorName,
        actor_email: actorEmail,
        actor_role: actorRole,
        actor_avatar: row.profiles?.avatar_url || null,
      };
    });

    // In-memory text search if search param was provided
    if (search) {
      normalized = normalized.filter((entry) => {
        const matchActor = (entry.actor_name || '').toLowerCase().includes(search) || 
                           (entry.actor_email || '').toLowerCase().includes(search);
        const matchAction = (entry.action || '').toLowerCase().includes(search);
        const matchEntity = (entry.entity_type || '').toLowerCase().includes(search);
        const matchIp = (entry.details?.ip_address || '').toLowerCase().includes(search);
        const matchAuthMethod = (entry.details?.auth_method || '').toLowerCase().includes(search);
        return matchActor || matchAction || matchEntity || matchIp || matchAuthMethod;
      });
    }

    return NextResponse.json({
      success: true,
      logs: normalized,
      totalCount: normalized.length,
      currentFilter: filter,
    });
  } catch (err) {
    console.error('Audit logs API error:', err);
    return NextResponse.json({ error: 'Server error retrieving activity logs.' }, { status: 500 });
  }
}
