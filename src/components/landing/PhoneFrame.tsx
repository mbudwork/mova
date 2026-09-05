import type { ReactNode } from 'react';

/**
 * The hero visual is the product, drawn in markup rather than shipped as a
 * screenshot: it stays sharp on every screen, costs no image download on
 * mobile data, and cannot drift out of sync with the real UI the way an
 * exported PNG does.
 */
export function PhoneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto w-full max-w-[280px] rounded-[38px] border-[10px] border-ink bg-concrete p-4 shadow-[0_18px_40px_-18px_rgba(20,22,26,0.45)]"
    >
      <div className="flex flex-col items-center gap-4 py-2">{children}</div>
    </div>
  );
}
