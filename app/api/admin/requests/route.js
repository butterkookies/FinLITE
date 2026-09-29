import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';

// GET /api/admin/requests
export async function GET(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;
    const url = new URL(req.url);
    const filterStatus = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.trim().toLowerCase();

    // Fetch all requests
    let query = supabase
      .from('registration_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus && filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching registration requests:', error);
      return NextResponse.json({ error: 'Failed to retrieve registration requests.' }, { status: 500 });
    }

    let filtered = requests || [];
    if (search) {
      filtered = filtered.filter((r) => 
        r.first_name?.toLowerCase().includes(search) ||
        r.last_name?.toLowerCase().includes(search) ||
        r.email?.toLowerCase().includes(search) ||
        r.contact_number?.includes(search)
      );
    }

    // Compute stats across all requests
    const stats = {
      total: requests?.length || 0,
      pending: requests?.filter((r) => r.status === 'pending').length || 0,
      approved: requests?.filter((r) => r.status === 'approved').length || 0,
      rejected: requests?.filter((r) => r.status === 'rejected').length || 0,
    };

    return NextResponse.json({
      success: true,
      requests: filtered,
      stats,
    });
  } catch (err) {
    console.error('Admin requests API error:', err);
    return NextResponse.json({ error: 'Server error retrieving registration requests.' }, { status: 500 });
  }
}
