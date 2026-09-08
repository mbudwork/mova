import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. Two jobs here, both cheap:
 *
 *  1. Refresh the Supabase session cookie so Server Components never see an
 *     expired token.
 *  2. Coarse route gating — bounce anonymous users out of /app and /admin.
 *  3. Canonical host — увести с адресов вида <deploy>--<site>.netlify.app.
 *
 * This is a convenience layer, NOT the security boundary. Every protected page
 * and action re-checks with requireUser/requireAdmin/requireFullAccess, and the
 * database enforces RLS regardless. A proxy bypass alone must never leak data.
 */

/*
  Чекаут сознательно НЕ защищён.

  Раньше «Получить MOVA» вело на защищённый маршрут, аноним отскакивал на
  вход, и до кассы человек проходил пять экранов. Теперь платить можно без
  аккаунта: почту собирает сама страница Stripe, аккаунт создаёт вебхук
  после оплаты.

  /purchase/success тоже открыт — покупатель возвращается туда ещё
  анонимным, и именно там происходит автоматический вход. Страницы, которым
  нужен аккаунт, проверяют это сами (requireProfile), поэтому снятие
  префикса ничего не открывает лишнего.
*/
const PROTECTED_PREFIXES = ['/app', '/admin', '/onboarding'];

/**
 * Уводит на канонический домен.
 *
 * У каждой сборки Netlify есть свой постоянный адрес
 * <id-деплоя>--<проект>.netlify.app, и открыть приложение можно по нему.
 * Контент тот же, но домен другой, а вместе с доменом другие и куки: вход на
 * netlify.app не виден на mbud.de. Плюс Supabase принимает возврат только на
 * mbud.de, а success_url из Stripe туда же и ведёт — то есть оплата на
 * превью возвращает человека в другую сессию.
 *
 * Дешевле не разбираться с этим каждый раз, а просто не давать приложению
 * жить на двух адресах. localhost не трогаем: на нём идёт разработка.
 */
function canonicalRedirect(request: NextRequest): NextResponse | null {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL;
  if (!canonical) return null;

  let expected: URL;
  try {
    expected = new URL(canonical);
  } catch {
    return null;
  }

  const host = request.headers.get('host');
  if (!host || host === expected.host) return null;
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return null;

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, expected.origin);
  // 307, а не 308: постоянный редирект браузер кэширует намертво, и если
  // домен когда-нибудь сменится, старый адрес будет уводить не туда с машин,
  // которые его запомнили.
  return NextResponse.redirect(target, 307);
}

export async function proxy(request: NextRequest) {
  const canonical = canonicalRedirect(request);
  if (canonical) return canonical;

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
