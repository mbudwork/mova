import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Кнопки премиального лендинга: капсула, золотой градиент на главном
 * действии, обводка на второстепенном. Форма — из
 * mova-landing-v4-premium-preview.html, размеры — прежние: 60/68px,
 * порог для пальца в перчатке никуда не делся.
 */
type Variant = 'gold' | 'ink' | 'ghost' | 'danger';

const SIZES = {
  lg: 'btn-lg',
  md: '',
} as const;

const VARIANTS: Record<Variant, string> = {
  gold: 'btn-gold',
  ink: 'btn-ink',
  ghost: 'btn-ghost',
  danger: 'bg-bad text-white',
};

type Props = {
  variant?: Variant;
  size?: keyof typeof SIZES;
  block?: boolean;
  children: ReactNode;
};

function classes(variant: Variant, size: keyof typeof SIZES, block: boolean, extra: string) {
  return ['btn', VARIANTS[variant], SIZES[size], block ? 'btn-block' : '', extra]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'gold',
  size = 'md',
  block = true,
  className = '',
  children,
  ...rest
}: Props & ComponentProps<'button'>) {
  return (
    <button className={classes(variant, size, block, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'gold',
  size = 'md',
  block = true,
  className = '',
  children,
  ...rest
}: Props & ComponentProps<typeof Link>) {
  return (
    <Link className={classes(variant, size, block, className)} {...rest}>
      {children}
    </Link>
  );
}
