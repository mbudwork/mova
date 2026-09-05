'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics/client';
import type { LandingCopy } from '@/lib/landing-copy';

const COMPLETED_FLAG = 'mova.testCompleted';

/** Pure so it is unit-testable without mounting anything. */
export function stickyLabel(testCompleted: boolean, copy: Pick<LandingCopy, 'stickyTest' | 'stickyOffer'>) {
  return testCompleted ? copy.stickyOffer : copy.stickyTest;
}

/**
 * One sticky action, never two. Appears once the hero has scrolled out of
 * view, and switches from "test yourself" to "get MOVA" once this browser has
 * actually finished the diagnostic — a returning, already-diagnosed visitor
 * should not be re-invited to retake it.
 */
export function StickyCta({
  copy,
  testHref,
  checkoutHref,
}: {
  copy: LandingCopy;
  testHref: string;
  checkoutHref: string;
}) {
  const [visible, setVisible] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);

  useEffect(() => {
    try {
      setTestCompleted(window.localStorage.getItem(COMPLETED_FLAG) === 'true');
    } catch {
      // ignore — default state is fine
    }

    const hero = document.getElementById('hero');
    if (!hero) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  const label = stickyLabel(testCompleted, copy);
  const href = testCompleted ? checkoutHref : testHref;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-concrete-deep bg-paper/95 p-3 backdrop-blur"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <Link
        href={href}
        onClick={() => track('sticky_cta_click', { state: testCompleted ? 'offer' : 'test' })}
        className="mx-auto flex min-h-[56px] w-full max-w-[480px] items-center justify-center rounded-[14px] bg-signal px-5 text-lg font-bold text-ink shadow-[0_3px_0_var(--color-signal-deep)]"
      >
        {label}
      </Link>
    </div>
  );
}

/** Called by DiagnosticFlow's result screen so the sticky CTA can switch state. */
export function markTestCompleted(): void {
  try {
    window.localStorage.setItem(COMPLETED_FLAG, 'true');
  } catch {
    // Private browsing or blocked storage: sticky CTA just stays in "test" state.
  }
}
