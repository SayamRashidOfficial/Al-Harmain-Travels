import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Portal role definitions
type PortalRole = 'admin' | 'dispatcher' | 'driver' | 'customer';

const ROLE_DASHBOARDS: Record<PortalRole, string> = {
  admin: '/admin',
  dispatcher: '/dispatcher',
  driver: '/driver',
  customer: '/customer',
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // 1. Canonical domain enforcement: redirect www to non-www and enforce HTTPS
  if (host.startsWith('www.')) {
    const canonicalHost = host.replace(/^www\./, '');
    return NextResponse.redirect(`https://${canonicalHost}${pathname}${search}`, 301);
  }

  // 2. Enforce HTTPS in production when accessed over plain HTTP
  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'http' && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return NextResponse.redirect(`https://${host}${pathname}${search}`, 301);
  }

  // 3. Early return for search engine discovery assets (sitemap, robots, verification files)
  if (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/BingSiteAuth.xml'
  ) {
    return NextResponse.next();
  }

  // 4. Staff alias redirect: /staff and /staff/* -> /dispatcher and /dispatcher/*
  if (pathname === '/staff' || pathname.startsWith('/staff/')) {
    const target = pathname === '/staff' ? '/dispatcher' : pathname.replace('/staff', '/dispatcher');
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }

  // Determine if this is a protected portal route
  const isCustomerRoute = pathname === '/customer' || pathname.startsWith('/customer/');
  const isDriverRoute = pathname === '/driver' || pathname.startsWith('/driver/');
  const isDispatcherRoute = pathname === '/dispatcher' || pathname.startsWith('/dispatcher/');
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isProtectedPortal = isCustomerRoute || isDriverRoute || isDispatcherRoute || isAdminRoute;

  // Read auth tokens/cookies
  const roleCookie = request.cookies.get('aht_role')?.value as PortalRole | undefined;
  
  // Check for Supabase session cookie (standard prefixes: sb-*-auth-token or aht_auth)
  const hasSupabaseCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );

  // 5. Handle unauthenticated access to protected portal routes
  if (isProtectedPortal) {
    if (!roleCookie && !hasSupabaseCookie) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = '/sign-in';
      signInUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(signInUrl);
      redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return redirectResponse;
    }

    // If role cookie is present, enforce strict portal boundaries
    if (roleCookie) {
      let isAllowed = false;
      if (isAdminRoute && roleCookie === 'admin') isAllowed = true;
      if (isDispatcherRoute && roleCookie === 'dispatcher') isAllowed = true;
      if (isDriverRoute && roleCookie === 'driver') isAllowed = true;
      if (isCustomerRoute && roleCookie === 'customer') isAllowed = true;

      if (!isAllowed) {
        // Redirect unauthorized role to their dedicated dashboard
        const authorizedDashboard = ROLE_DASHBOARDS[roleCookie] || '/customer';
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = authorizedDashboard;
        const redirectResponse = NextResponse.redirect(redirectUrl);
        redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return redirectResponse;
      }
    }
  }

  // 6. If authenticated user visits sign-in or sign-up, redirect to their dashboard
  const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';
  if (isAuthPage && roleCookie && ROLE_DASHBOARDS[roleCookie]) {
    // Check if redirect query param exists and is valid for their role
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const roleDashboard = ROLE_DASHBOARDS[roleCookie];
    
    let target = roleDashboard;
    if (redirectParam && redirectParam.startsWith(roleDashboard)) {
      target = redirectParam;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = target;
    redirectUrl.searchParams.delete('redirect');
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return redirectResponse;
  }

  const response = NextResponse.next();
  // Ensure private portal routes always carry X-Robots-Tag
  if (isProtectedPortal || isAuthPage) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
