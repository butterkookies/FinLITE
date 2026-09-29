import { createClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';

/**
 * Validates that the requesting caller has Admin privileges.
 * Automatically authorizes designated Super Admin emails regardless of DB state.
 * @returns {Promise<{ authorized: boolean, user?: any, profile?: any, error?: string, status?: number }>}
 */
export async function verifyAdmin() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { authorized: false, error: 'Database service unavailable.', status: 503 };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { authorized: false, error: 'Authentication required.', status: 401 };
    }

    const email = user.email?.toLowerCase();

    // 1. Super Admin bypass (always authorized)
    if (isSuperAdminEmail(email)) {
      return { authorized: true, user, isSuperAdmin: true, supabase };
    }

    // 2. Database role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profile && profile.status === 'approved' && profile.role === 'admin') {
      return { authorized: true, user, profile, isSuperAdmin: false, supabase };
    }

    return { authorized: false, error: 'Admin privileges required to access this resource.', status: 403 };
  } catch (err) {
    console.error('verifyAdmin error:', err);
    return { authorized: false, error: 'Internal server error while verifying authorization.', status: 500 };
  }
}
