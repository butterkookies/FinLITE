import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/security/ratelimit';

// Routes that are always public (no auth required)
const PUBLIC_ROUTES = ['/login', '/register', '/pending-approval', '/verify-email', '/forgot-password', '/reset-password', '/api/auth'];

function isPublicRoute(pathname) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Rate limiting for all API routes (executed before any DB queries or routing)
  if (pathname.startsWith('/api/')) {
    const rateLimitRes = checkRateLimit(request);
    if (rateLimitRes) {
      return rateLimitRes;
    }
  }

  // 2. Always allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // static files (images, icons, etc.)
  ) {
    return NextResponse.next();
  }

  // 3. Auth API routes bypass session checks (already rate-limited above)
  if (pathname.startsWith('/api/auth')) {
    const authRes = NextResponse.next();
    return applyRateLimitHeaders(request, authRes);
  }

  // Build a response we can mutate cookies on
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

  // Get current session
  let user = null;
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (!authError && authUser) {
      user = authUser;
    } else if (authError) {
      // Clear stale Supabase auth cookies from response if refresh token is invalid or missing
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.includes('auth-token') || cookie.name.startsWith('sb-')) {
          response.cookies.delete(cookie.name);
        }
      });
    }
  } catch (_e) {
    user = null;
  }

  const isPublic = isPublicRoute(pathname);

  // Not logged in → redirect to /login (except public routes)
  if (!user) {
    if (!isPublic) {
      if (pathname.startsWith('/api/')) {
        return applyRateLimitHeaders(request, NextResponse.json({ error: 'Authentication required.' }, { status: 401 }));
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Copy any deleted/mutated cookies to the redirect response
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
    return applyRateLimitHeaders(request, response);
  }

  // Super admin status requires a VERIFIED email: an unverified signup that merely
  // claims a super-admin address must never inherit the bypass.
  const isSuperAdmin = isSuperAdminEmail(user.email) && Boolean(user.email_confirmed_at);

  // Logged in but on login/register → redirect approved members to the app.
  // A signed-in user who is NOT approved yet (a new Google user finishing their
  // registration form) must be able to stay on /register.
  if (isPublic && (pathname === '/login' || pathname === '/register')) {
    const approved = isSuperAdmin || user.app_metadata?.status === 'approved';
    if (approved) {
      const dashUrl = request.nextUrl.clone();
      dashUrl.pathname = isSuperAdmin ? '/admin' : '/';
      return NextResponse.redirect(dashUrl);
    }
    return applyRateLimitHeaders(request, response);
  }

  // Super Admin: Full bypass on all routes (cannot be locked into pending-approval)
  if (isSuperAdmin) {
    return applyRateLimitHeaders(request, response);
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
        return applyRateLimitHeaders(request, NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 }));
      }
      const pendingUrl = request.nextUrl.clone();
      pendingUrl.pathname = '/pending-approval';
      return NextResponse.redirect(pendingUrl);
    }

    // If attempting to access /admin or /api/admin, restrict to users with role === 'admin'
    if (role !== 'admin') {
      if (pathname.startsWith('/api/admin')) {
        return applyRateLimitHeaders(request, NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 }));
      }
      if (pathname.startsWith('/admin')) {
        const dashUrl = request.nextUrl.clone();
        dashUrl.pathname = '/';
        return NextResponse.redirect(dashUrl);
      }
    }
  }

  return applyRateLimitHeaders(request, response);
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
