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
      className="device mx-auto w-full max-w-[296px]"
    >
      <div className="device-screen flex flex-col items-center gap-4">
        <span aria-hidden className="device-notch" />
        {children}
      </div>
    </div>
  );
}
