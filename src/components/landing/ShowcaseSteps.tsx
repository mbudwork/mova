import type { LandingCopy } from '@/lib/landing-copy';

/**
 * Reuses the exact card/badge language the app itself uses for numbered
 * flows (see /app home screen), so this "how it works" list reads as the
 * real product's own visual grammar rather than generic marketing steps.
 */
export function ShowcaseSteps({ copy }: { copy: LandingCopy }) {
  return (
    <ol className="space-y-3">
      {copy.showcaseSteps.map((item, index) => (
        <li key={item.title} className="flex gap-4 card p-5">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold font-bold"
          >
            {index + 1}
          </span>
          <span>
            <span className="block text-lg font-bold">{item.title}</span>
            <span className="block text-slate">{item.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
