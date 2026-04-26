import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';

/**
 * Middleware runs on every request. Its job is to:
 *   1. Refresh the user's session (extending their cookie if it's near expiry)
 *   2. Redirect unauthenticated users away from protected routes
 *   3. Redirect authenticated users away from auth pages
 *
 * The matcher at the bottom of this file controls which paths trigger it.
 */

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/verify',
];

const AUTH_PAGES_FOR_LOGGED_OUT_ONLY = [
  '/login',
  '/signup',
  '/auth/verify',
];

export async function middleware(request: NextRequest) {
  const env = getServerEnv();

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session by reading the user. Important: do not put any
  // logic between createServerClient and getUser() — the session refresh
  // depends on this being the next call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isLoggedOutOnlyRoute =
    AUTH_PAGES_FOR_LOGGED_OUT_ONLY.includes(pathname);

  // Unauthenticated user trying to access a protected route → send to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated user landing on a logged-out-only page → send to dashboard
  if (user && isLoggedOutOnlyRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - _next/static (static files)
     *   - _next/image (image optimization)
     *   - favicon.ico
     *   - public files with extensions (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
