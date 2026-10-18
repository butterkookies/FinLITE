import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';
import { getAllResubmissions } from '@/lib/security/resubmissions';

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
    const { data: rawRequests, error } = await supabase
      .from('registration_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registration requests:', error);
      return NextResponse.json({ error: 'Failed to retrieve registration requests.' }, { status: 500 });
    }

    const resubmissions = getAllResubmissions();
    const requests = rawRequests ? [...rawRequests] : [];

    // Sync verified resubmissions using authenticated admin client
    for (const resub of resubmissions) {
      if (!resub.email_verified) continue; // Only verified resubmissions enter admin queue
      const idx = requests.findIndex((r) => r.email?.toLowerCase() === resub.email?.toLowerCase());
      if (idx !== -1) {
        const item = requests[idx];
        if (item.status === 'rejected') {
          try {
            await supabase
              .from('registration_requests')
              .update({
                first_name: resub.first_name || item.first_name,
                last_name: resub.last_name || item.last_name,
                username: resub.username || item.username,
                contact_number: resub.contact_number || item.contact_number,
                auth_provider: resub.auth_provider || item.auth_provider,
                status: 'pending',
                rejection_reason: null,
                reviewed_by: null,
                reviewed_at: null,
                email_verified_at: resub.email_verified_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            await supabase
              .from('profiles')
              .update({ status: 'pending', updated_at: new Date().toISOString() })
              .eq('email', resub.email);
          } catch (syncErr) {
            console.warn('Sync resubmission to Supabase warning:', syncErr);
          }

          requests[idx] = {
            ...item,
            first_name: resub.first_name || item.first_name,
            last_name: resub.last_name || item.last_name,
            username: resub.username || item.username,
            contact_number: resub.contact_number || item.contact_number,
            status: 'pending',
            rejection_reason: null,
            reviewed_by: null,
            reviewed_at: null,
            email_verified_at: resub.email_verified_at || new Date().toISOString(),
          };
        }
      }
    }

    let filtered = requests;
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

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
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
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
