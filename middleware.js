import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSuperAdminEmail } from '@/lib/config/admin';

// Routes that are always public (no auth required)
const PUBLIC_ROUTES = ['/login', '/register', '/pending-approval', '/api/auth'];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals, static files, and auth API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // static files (images, icons, etc.)
  ) {
    return NextResponse.next();
  }

  // Build a response we can mutate cookies on
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get current session (checking demo cookie first)
  const demoCookie = request.cookies.get('finlite_demo_session')?.value;
  let user = null;

  if (demoCookie === 'admin') {
    user = {
      id: 'demo-admin-id',
      email: 'geronimoandreijohn.pdm@gmail.com',
      app_metadata: { status: 'approved', role: 'admin' },
    };
  } else if (demoCookie === 'user') {
    user = {
      id: 'demo-user-id',
      email: 'demo.student@gmail.com',
      app_metadata: { status: 'approved', role: 'treasurer' },
    };
  } else {
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    } catch (_) {}
  }

  const isPublic = isPublicRoute(pathname);

  // Not logged in → redirect to /login (except public routes)
  if (!user) {
    if (!isPublic) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const isSuperAdmin = isSuperAdminEmail(user.email);

  // Logged in but on login/register → redirect
  if (isPublic && (pathname === '/login' || pathname === '/register')) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = isSuperAdmin ? '/admin' : '/';
    return NextResponse.redirect(dashUrl);
  }

  // Super Admin: Full bypass on all routes (cannot be locked into pending-approval)
  if (isSuperAdmin) {
    return response;
  }

  // Regular logged in user accessing a protected route — verify approval
  if (!isPublic) {
    // 1. Fast-path: Check user.app_metadata first (sub-millisecond token read, 0ms DB query!)
    let status = user.app_metadata?.status;
    let role = user.app_metadata?.role;

    // 2. Fallback path: Query database only if token metadata is not yet populated
    if (!status || !role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (profile) {
        status = profile.status;
        role = profile.role;
      }
    }

    if (status !== 'approved') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
      }
      const pendingUrl = request.nextUrl.clone();
      pendingUrl.pathname = '/pending-approval';
      return NextResponse.redirect(pendingUrl);
    }

    // If attempting to access /admin or /api/admin, restrict to users with role === 'admin'
    if (role !== 'admin') {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 });
      }
      if (pathname.startsWith('/admin')) {
        const dashUrl = request.nextUrl.clone();
        dashUrl.pathname = '/';
        return NextResponse.redirect(dashUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icon.png
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|assets/).*)',
  ],
};
