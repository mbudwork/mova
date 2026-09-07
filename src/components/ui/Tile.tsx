import Link from 'next/link';

export function Tile({
  href,
  title,
  hint,
  glyph,
}: {
  href: string;
  title: string;
  hint: string;
  glyph: string;
}) {
  return (
    <Link
      href={href}
      className="card flex min-h-[80px] items-center gap-4 px-5 py-4 transition-transform active:scale-[0.99]"
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream text-xl"
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-tight tracking-tight">{title}</span>
        <span className="block truncate text-sm text-slate">{hint}</span>
      </span>
      <span aria-hidden className="text-xl text-mist">
        →
      </span>
    </Link>
  );
}
