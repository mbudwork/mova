'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Four destinations, never more. Navigation depth stays at one level so the
 * way back to Home is always a single tap, one-handed, thumb at the bottom.
 */
const ITEMS = [
  { href: '/app', label: 'Главная', glyph: '⌂' },
  { href: '/app/bauleiter', label: 'Прораб', glyph: '👷' },
  { href: '/app/say', label: 'Сказать', glyph: '💬' },
  { href: '/app/dictionary', label: 'Словарь', glyph: '🔎' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line-light)] bg-paper/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-[560px]">
        {ITEMS.map((item) => {
          const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-[64px] flex-col items-center justify-center gap-1 text-xs font-bold',
                  active ? 'text-ink' : 'text-mist-2',
                ].join(' ')}
              >
                <span aria-hidden className="text-xl leading-none">
                  {item.glyph}
                </span>
                {item.label}
                <span
                  aria-hidden
                  className={['h-1 w-8 rounded-full', active ? 'bg-gold' : 'bg-transparent'].join(' ')}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
