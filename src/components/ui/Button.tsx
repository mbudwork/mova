import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'signal' | 'ink' | 'quiet' | 'danger';

const BASE =
  'inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-5 text-center ' +
  'font-bold leading-tight transition-transform active:scale-[0.98] ' +
  'disabled:opacity-40 disabled:active:scale-100';

const SIZES = {
  // min-h keeps every control above the gloved-thumb threshold.
  lg: 'min-h-[68px] text-xl',
  md: 'min-h-[60px] text-lg',
} as const;

const VARIANTS: Record<Variant, string> = {
  signal: 'bg-signal text-ink shadow-[0_3px_0_var(--color-signal-deep)]',
  ink: 'bg-ink text-concrete',
  quiet: 'bg-paper text-ink border-2 border-concrete-deep',
  danger: 'bg-rot text-white',
};

type Props = {
  variant?: Variant;
  size?: keyof typeof SIZES;
  children: ReactNode;
};

export function Button({
  variant = 'signal',
  size = 'md',
  className = '',
  children,
  ...rest
}: Props & ComponentProps<'button'>) {
  return (
    <button className={[BASE, SIZES[size], VARIANTS[variant], className].join(' ')} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'signal',
  size = 'md',
  className = '',
  children,
  ...rest
}: Props & ComponentProps<typeof Link>) {
  return (
    <Link className={[BASE, SIZES[size], VARIANTS[variant], className].join(' ')} {...rest}>
      {children}
    </Link>
  );
}
