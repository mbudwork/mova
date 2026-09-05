'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { track } from '@/lib/analytics/client';
import type { FunnelEvent } from '@/lib/analytics/events';

export function CtaLink({
  event,
  properties,
  className = '',
  children,
  ...rest
}: {
  event: FunnelEvent;
  properties?: Record<string, string>;
  children: React.ReactNode;
} & ComponentProps<typeof Link>) {
  return (
    <Link {...rest} className={className} onClick={() => track(event, properties ?? {})}>
      {children}
    </Link>
  );
}
