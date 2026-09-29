import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';

const VALID_ROLES = ['treasurer', 'auditor', 'president', 'adviser', 'admin'];

// GET /api/admin/users — list approved members
export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, role, status, contact_number, auth_provider, created_at, approved_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      users: users || [],
    });
  } catch (err) {
    console.error('Admin users API error:', err);
    return NextResponse.json({ error: 'Server error retrieving users.' }, { status: 500 });
  }
}

// PATCH /api/admin/users — update a user's role
export async function PATCH(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and new role are required.' }, { status: 400 });
    }

    const normalizedRole = role.toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json({ error: `Invalid role specified. Allowed: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    const supabase = auth.supabase;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ role: normalizedRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ error: 'Failed to update user role.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User role successfully updated to ${normalizedRole}.`,
      user: updated,
    });
  } catch (err) {
    console.error('Admin users PATCH error:', err);
    return NextResponse.json({ error: 'Server error updating user.' }, { status: 500 });
  }
}
