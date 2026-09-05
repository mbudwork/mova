'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics/client';
import type { FunnelEvent } from '@/lib/analytics/events';

/** Fires a view event once per page load, never on re-render. */
export function ViewTracker({ event }: { event: FunnelEvent }) {
  useEffect(() => {
    track(event, {}, { once: true });
  }, [event]);
  return null;
}

/** Fires when the section actually enters the viewport, not when it mounts. */
export function SectionTracker({ event, id }: { event: FunnelEvent; id: string }) {
  useEffect(() => {
    const element = document.getElementById(id);
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            track(event, {}, { once: true });
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [event, id]);

  return null;
}
