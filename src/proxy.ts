import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. Two jobs here, both cheap:
 *
 *  1. Refresh the Supabase session cookie so Server Components never see an
 *     expired token.
 *  2. Coarse route gating — bounce anonymous users out of /app and /admin.
 *
 * This is a convenience layer, NOT the security boundary. Every protected page
 * and action re-checks with requireUser/requireAdmin/requireFullAccess, and the
 * database enforces RLS regardless. A proxy bypass alone must never leak data.
 */

const PROTECTED_PREFIXES = ['/app', '/admin', '/onboarding', '/ru/checkout', '/uk/checkout', '/purchase'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // api/stripe is excluded deliberately: the webhook carries no session, and
  // running an auth round-trip on every Stripe delivery only adds latency to a
  // request Stripe will retry if we answer slowly.
  matcher: [
    '/((?!api/stripe|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|mp3|woff2)$).*)',
  ],
};
